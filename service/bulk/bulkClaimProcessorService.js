const { EventEmitter } = require('events');
const excelProcessorService = require('./excelProcessorService');
const buildFhirClaimBundle = require('../buildFhirClaimBundle');
const apiClientService = require('../apiClientService');
const { v4: uuidv4 } = require('uuid');
const {
    FHIR_SERVER,
} = require('../../utils/constants');

class BulkClaimProcessorService extends EventEmitter {
    constructor() {
        super();
        this.activeJobs = new Map();
        this.concurrency = 5;
    }

    /**
     * Process bulk claims from Excel file
     */
    async processBulkClaims(filePath, options = {}) {
        const jobId = uuidv4();
        const job = {
            id: jobId,
            filePath,
            status: 'processing',
            totalClaims: 0,
            processedClaims: 0,
            successfulClaims: 0,
            failedClaims: 0,
            results: [],
            startTime: new Date(),
            options
        };

        this.activeJobs.set(jobId, job);

        try {
            // Process in background
            this._processJobInBackground(job);

            return {
                jobId,
                status: 'started',
                message: 'Bulk claim processing started'
            };
        } catch (error) {
            job.status = 'failed';
            job.error = error.message;
            this.emit('jobFailed', { jobId, error: error.message });
            throw error;
        }
    }

    async _processJobInBackground(job) {
        try {
            const { filePath, options } = job;
            const isDev = options.isDev || false;
            const apiKey = options.apiKey;
            const batchSize = options.batchSize || 1000;

            let totalClaims = 0;
            let processedClaims = 0;

            // Process Excel file in batches
            for await (const claimsBatch of excelProcessorService.parseExcelFile(filePath, batchSize)) {
                totalClaims += claimsBatch.length;
                job.totalClaims = totalClaims;

                // Process batch concurrently
                const batchResults = await this._processClaimsBatch(claimsBatch, isDev, apiKey);

                job.results.push(...batchResults);
                job.processedClaims = processedClaims += claimsBatch.length;
                job.successfulClaims = batchResults.filter(r => r.status === 'success').length;
                job.failedClaims = batchResults.filter(r => r.status === 'failed').length;

                this.emit('batchProcessed', {
                    jobId: job.id,
                    batchSize: claimsBatch.length,
                    successful: job.successfulClaims,
                    failed: job.failedClaims,
                    totalProcessed: job.processedClaims
                });

                // Small delay to prevent overwhelming the API
                await this._delay(100);
            }

            job.status = 'completed';
            job.endTime = new Date();

            // Create result file
            const resultFilePath = await excelProcessorService.createResultFile(filePath, job.results);
            job.resultFilePath = resultFilePath;

            this.emit('jobCompleted', { jobId: job.id, job });

        } catch (error) {
            job.status = 'failed';
            job.error = error.message;
            job.endTime = new Date();
            this.emit('jobFailed', { jobId: job.id, error: error.message });
        }
    }

    extractPreAuthResponseId = (responseData) => {
        try {
            return responseData.entry?.find(entry =>
                entry.resource?.resourceType === FHIR_SERVER.PATHS.CLAIM
            )?.resource?.id ?? null;
        } catch (error) {
            console.error('Error extracting claim response ID:', error);
            return null;
        }
    }

    isClaimApproved = (claimData) => {
        return this.getClaimState(claimData) === 'approved';
    };

    getClaimState = (claimData) => {
        try {
            const claimStateExtension = claimData.extension?.find(ext =>
                ext.url?.endsWith('claim-state-extension')
            );

            const code = claimStateExtension?.valueCodeableConcept?.coding?.find(
                coding => coding.system?.endsWith('claim-state')
            )?.code;

            return code;

        } catch (error) {
            console.error('Error checking claim approval status:', error);
            return false;
        }
    }

    async _processClaimsBatch(claimsBatch, isDev, apiKey) {
        const promises = claimsBatch.map(async (claimData) => {
            try {
                const isPreauth = claimData.formData.use === 'preauth-claim';
                let preAuthResponseId = null;

                if (isPreauth) {
                    const initialFhirBundle = buildFhirClaimBundle.transformFormToFhirBundle(claimData.formData, null, isDev);
                    const preAuthResult = await apiClientService.submitClaimBundle(initialFhirBundle, apiKey, isDev);

                    if (!preAuthResult.success) {
                        return {
                            status: 'failed',
                            message: 'Preauthorization submission failed',
                            error: { error: preAuthResult.error },
                            preAuthResponseId
                        };
                    }

                    preAuthResponseId = this.extractPreAuthResponseId(preAuthResult.data);

                    if (!preAuthResponseId) {
                        return {
                            status: 'failed',
                            message: 'Could not determine preauthorization response ID',
                            error: { fhirBundle: initialFhirBundle },
                            preAuthResponseId
                        };
                    }

                    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
                    const maxRetries = 3;
                    const delayMs = 5000;
                    let state = 'pending';
                    let claimResponseResult = null;

                    for (let attempt = 0; attempt <= maxRetries; attempt++) {
                        claimResponseResult = await apiClientService.getClaimResponse(preAuthResponseId, apiKey, isDev);

                        if (!claimResponseResult.success) {
                            return {
                                status: 'failed',
                                claimId: preAuthResponseId,
                                message: 'Failed to retrieve preauthorization response',
                                error: { error: claimResponseResult },
                                preAuthResponseId
                            };
                        }

                        state = this.getClaimState(claimResponseResult.data);

                        if (state === 'approved') break;
                        if (attempt < maxRetries) await delay(delayMs);
                    }

                    if (state !== 'approved') {
                        return {
                            status: 'failed',
                            claimId: preAuthResponseId,
                            message: `Preauthorization not approved, current state: ${state}`,
                            error: { claimResponseResult },
                            preAuthResponseId
                        };
                    }
                }

                const fhirBundle = buildFhirClaimBundle.transformFormToFhirBundle(claimData.formData, preAuthResponseId, isDev);
                const result = await apiClientService.submitClaimBundle(fhirBundle, apiKey, isDev);

                const claimID = result.data.entry?.find(entry =>
                    entry.resource?.resourceType === FHIR_SERVER.PATHS.CLAIM
                )?.resource?.id ?? null;


                return {
                    status: result.success ? 'success' : 'failed',
                    claimId: claimID,
                    responseData: result.data,
                    error: result.error,
                    originalData: claimData,
                    timestamp: new Date()
                };
            } catch (error) {
                return {
                    status: 'failed',
                    claimId: null,
                    responseData: null,
                    error: error.message,
                    originalData: claimData,
                    timestamp: new Date()
                };
            }
        });

        // Process with concurrency control
        const results = [];
        for (let i = 0; i < promises.length; i += this.concurrency) {
            const batch = promises.slice(i, i + this.concurrency);
            const batchResults = await Promise.all(batch);
            results.push(...batchResults);

            if (i + this.concurrency < promises.length) {
                await this._delay(50);
            }
        }

        return results;
    }


    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get job status
     */
    getJobStatus(jobId) {
        return this.activeJobs.get(jobId) || null;
    }

    /**
     * Get all active jobs
     */
    getAllJobs() {
        return Array.from(this.activeJobs.values());
    }

    /**
     * Clean up completed jobs older than specified hours
     */
    cleanupOldJobs(hours = 24) {
        const cutoffTime = new Date(Date.now() - (hours * 60 * 60 * 1000));

        for (const [jobId, job] of this.activeJobs.entries()) {
            if (job.endTime && job.endTime < cutoffTime) {
                this.activeJobs.delete(jobId);
            }
        }
    }
}

module.exports = new BulkClaimProcessorService();