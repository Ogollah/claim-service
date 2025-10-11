require('dotenv').config();
const bulkClaimProcessor = require('../../service/bulk/bulkClaimProcessorService');
const excelProcessorService = require('../../service/bulk/excelProcessorService');
const buildFhirClaimBundle = require('../../service/buildFhirClaimBundle');
const apiClientService = require('../../service/apiClientService');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/logger');
const {
    FHIR_SERVER,
} = require('../../utils/constants');

class ClaimController {
    constructor() {
        this.uploadDir = path.join(__dirname, '../../uploads');
        this.processedDir = path.join(__dirname, '../../processed_files');
        this.ensureUploadDir();
        this.ensureProcessedDir();

        // Set up event listeners
        bulkClaimProcessor.on('batchProcessed', this._handleBatchProcessed.bind(this));
        bulkClaimProcessor.on('jobCompleted', this._handleJobCompleted.bind(this));
        bulkClaimProcessor.on('jobFailed', this._handleJobFailed.bind(this));

        this.apiKey = process.env.API_KEY;
        this.apiBaseUrl = process.env.API_BASE_URL;
    }

    async ensureUploadDir() {
        try {
            await fs.access(this.uploadDir);
        } catch {
            await fs.mkdir(this.uploadDir, { recursive: true });
        }
    }

    async ensureProcessedDir() {
        try {
            await fs.access(this.processedDir);
        } catch {
            await fs.mkdir(this.processedDir, { recursive: true });
        }
    }

    _handleBatchProcessed({ jobId, batchSize, successful, failed, totalProcessed }) {
        logger.info(`Job ${jobId}: Processed batch of ${batchSize}. Total: ${totalProcessed}, Success: ${successful}, Failed: ${failed}`);
    }

    _handleJobCompleted({ jobId, job }) {
        logger.info(`Job ${jobId} completed successfully. Total claims: ${job.totalClaims}, Success: ${job.successfulClaims}, Failed: ${job.failedClaims}`);
    }

    _handleJobFailed({ jobId, error }) {
        logger.error(`Job ${jobId} failed:`, error);
    }

    /**
     * Upload and process bulk claims from Excel file
     */
    uploadBulkClaims = async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No file uploaded'
                });
            }

            const { isDev, batchSize = 1000 } = req.body;

            const isDevelopment = isDev === 'true' ? true : false;

            const apiKey = this.getApiKey(isDevelopment);


            const filePath = req.file.path;

            // Validate file type
            if (!req.file.mimetype.includes('spreadsheet') &&
                !req.file.originalname.endsWith('.xlsx')) {
                await fs.unlink(filePath);
                return res.status(400).json({
                    success: false,
                    message: 'Invalid file type. Please upload an Excel file (.xlsx)'
                });
            }

            const result = await bulkClaimProcessor.processBulkClaims(filePath, {
                isDev: isDevelopment,
                apiKey,
                batchSize: parseInt(batchSize)
            });

            res.json({
                success: true,
                message: 'Bulk claim processing started',
                jobId: result.jobId,
                statusEndpoint: `/api/claims/bundle/bulk/status/${result.jobId}`
            });

        } catch (error) {
            console.error('Bulk claim upload error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to process bulk claims',
                error: error.message
            });
        }
    };

    /**
     * Get bulk processing job status
     */
    getBulkJobStatus = async (req, res) => {
        try {
            const { jobId } = req.params;
            const job = bulkClaimProcessor.getJobStatus(jobId);

            if (!job) {
                return res.status(404).json({
                    success: false,
                    message: 'Job not found'
                });
            }

            res.json({
                success: true,
                job: {
                    id: job.id,
                    status: job.status,
                    totalClaims: job.totalClaims,
                    processedClaims: job.processedClaims,
                    successfulClaims: job.successfulClaims,
                    failedClaims: job.failedClaims,
                    startTime: job.startTime,
                    endTime: job.endTime,
                    resultFilePath: job.resultFilePath,
                    error: job.error
                }
            });
        } catch (error) {
            console.error('Error getting job status:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get job status',
                error: error.message
            });
        }
    };

    /**
     * Download result file
     */
    downloadResultFile = async (req, res) => {
        try {
            const { jobId } = req.params;
            const job = bulkClaimProcessor.getJobStatus(jobId);

            if (!job || !job.resultFilePath) {
                return res.status(404).json({
                    success: false,
                    message: 'Result file not found'
                });
            }

            res.download(job.resultFilePath, `claim_results_${jobId}.xlsx`, (err) => {
                if (err) {
                    console.error('Error downloading file:', err);
                    res.status(500).json({
                        success: false,
                        message: 'Failed to download result file'
                    });
                }
            });
        } catch (error) {
            console.error('Error downloading result file:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to download result file',
                error: error.message
            });
        }
    };

    /**
     * List all bulk processing jobs
     */
    listBulkJobs = async (req, res) => {
        try {
            const jobs = bulkClaimProcessor.getAllJobs();

            res.json({
                success: true,
                jobs: jobs.map(job => ({
                    id: job.id,
                    status: job.status,
                    totalClaims: job.totalClaims,
                    processedClaims: job.processedClaims,
                    successfulClaims: job.successfulClaims,
                    failedClaims: job.failedClaims,
                    startTime: job.startTime,
                    endTime: job.endTime,
                    resultFilePath: job.resultFilePath,
                    duration: job.endTime ?
                        Math.round((new Date(job.endTime) - new Date(job.startTime)) / 1000) :
                        Math.round((new Date() - new Date(job.startTime)) / 1000)
                }))
            });
        } catch (error) {
            console.error('Error listing jobs:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to list jobs',
                error: error.message
            });
        }
    };

    /**
     * Cancel a bulk processing job
     */
    cancelBulkJob = async (req, res) => {
        try {
            const { jobId } = req.params;
            // Note: You'll need to implement cancellation logic in bulkClaimProcessorService
            const cancelled = await bulkClaimProcessor.cancelJob(jobId);

            if (!cancelled) {
                return res.status(404).json({
                    success: false,
                    message: 'Job not found or cannot be cancelled'
                });
            }

            res.json({
                success: true,
                message: 'Job cancelled successfully'
            });
        } catch (error) {
            console.error('Error cancelling job:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to cancel job',
                error: error.message
            });
        }
    };

    /**
     * Clean up old job files and records
     */
    cleanupOldJobs = async (req, res) => {
        try {
            const { olderThanHours = 24 } = req.body;

            bulkClaimProcessor.cleanupOldJobs(parseInt(olderThanHours));

            // Also clean up uploaded files
            await this.cleanupOldFiles(parseInt(olderThanHours));

            res.json({
                success: true,
                message: `Cleaned up jobs and files older than ${olderThanHours} hours`
            });
        } catch (error) {
            console.error('Error cleaning up jobs:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to clean up jobs',
                error: error.message
            });
        }
    };

    /**
     * Clean up old uploaded and processed files
     */
    async cleanupOldFiles(hours = 24) {
        try {
            const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);

            // Clean upload directory
            const uploadFiles = await fs.readdir(this.uploadDir);
            for (const file of uploadFiles) {
                const filePath = path.join(this.uploadDir, file);
                const stats = await fs.stat(filePath);
                if (stats.mtimeMs < cutoffTime) {
                    await fs.unlink(filePath);
                    logger.info(`Deleted old uploaded file: ${file}`);
                }
            }

            // Clean processed directory
            const processedFiles = await fs.readdir(this.processedDir);
            for (const file of processedFiles) {
                const filePath = path.join(this.processedDir, file);
                const stats = await fs.stat(filePath);
                if (stats.mtimeMs < cutoffTime) {
                    await fs.unlink(filePath);
                    logger.info(`Deleted old processed file: ${file}`);
                }
            }
        } catch (error) {
            logger.error('Error cleaning up old files:', error);
        }
    }

    /**
     * Get system statistics
     */
    getSystemStats = async (req, res) => {
        try {
            const jobs = bulkClaimProcessor.getAllJobs();
            const totalJobs = jobs.length;
            const activeJobs = jobs.filter(job => job.status === 'processing').length;
            const completedJobs = jobs.filter(job => job.status === 'completed').length;
            const failedJobs = jobs.filter(job => job.status === 'failed').length;

            const totalClaims = jobs.reduce((sum, job) => sum + job.totalClaims, 0);
            const successfulClaims = jobs.reduce((sum, job) => sum + job.successfulClaims, 0);
            const failedClaims = jobs.reduce((sum, job) => sum + job.failedClaims, 0);

            // Get disk usage info
            const uploadStats = await this.getDirectoryStats(this.uploadDir);
            const processedStats = await this.getDirectoryStats(this.processedDir);

            res.json({
                success: true,
                stats: {
                    jobs: {
                        total: totalJobs,
                        active: activeJobs,
                        completed: completedJobs,
                        failed: failedJobs
                    },
                    claims: {
                        total: totalClaims,
                        successful: successfulClaims,
                        failed: failedClaims,
                        successRate: totalClaims > 0 ? (successfulClaims / totalClaims * 100).toFixed(2) : 0
                    },
                    storage: {
                        uploadDir: uploadStats,
                        processedDir: processedStats
                    },
                    server: {
                        uptime: process.uptime(),
                        memory: process.memoryUsage(),
                        nodeVersion: process.version
                    }
                }
            });
        } catch (error) {
            console.error('Error getting system stats:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get system statistics',
                error: error.message
            });
        }
    };

    /**
     * Get directory statistics
     */
    async getDirectoryStats(dirPath) {
        try {
            const files = await fs.readdir(dirPath);
            let totalSize = 0;
            let fileCount = 0;

            for (const file of files) {
                const filePath = path.join(dirPath, file);
                const stats = await fs.stat(filePath);
                if (stats.isFile()) {
                    totalSize += stats.size;
                    fileCount++;
                }
            }

            return {
                fileCount,
                totalSize: this.formatBytes(totalSize),
                totalSizeBytes: totalSize
            };
        } catch (error) {
            return { fileCount: 0, totalSize: '0 B', totalSizeBytes: 0 };
        }
    }

    /**
     * Format bytes to human readable format
     */
    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 B';

        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];

        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    /**
     * Extracts the preauthorization response ID from the API response
     */
    extractPreAuthResponseId = (responseData) => {
        try {
            // Implementation depends on your FHIR_SERVER constants structure
            // This is a generic implementation - adjust based on your actual response structure
            if (responseData.entry && Array.isArray(responseData.entry)) {
                const claimEntry = responseData.entry.find(entry =>
                    entry.resource && entry.resource.resourceType === 'ClaimResponse'
                );
                return claimEntry?.resource?.id || null;
            }
            return null;
        } catch (error) {
            console.error('Error extracting claim response ID:', error);
            return null;
        }
    }

    /**
     * Get Claim status
     */
    getClaimState = (claimData) => {
        try {
            // Implementation depends on your FHIR extension structure
            // This is a generic implementation
            const claimStateExtension = claimData.extension?.find(ext =>
                ext.url?.includes('claim-state')
            );

            const code = claimStateExtension?.valueCodeableConcept?.coding?.[0]?.code;

            return code || 'unknown';

        } catch (error) {
            console.error('Error checking claim state:', error);
            return 'unknown';
        }
    }

    /**
     * Checks if Claim status is approved
     */
    isClaimApproved = (claimData) => {
        return this.getClaimState(claimData) === 'approved';
    };

    /**
     * Processes form data and submits FHIR claim
     */
    // submitClaim = async (req, res) => {
    //     let initialFhirBundle;

    //     try {
    //         const { formData } = req.body;

    //         if (!formData) {
    //             return res.status(400).json({
    //                 success: false,
    //                 message: 'Missing required parameters: formData'
    //             });
    //         }


    //         const apiKey = this.getApiKey(isDev);

    //         console.log(`Environment: ${isDev ? 'Development' : 'QA'}`);

    //         const isPreauth = formData.use === 'preauth-claim';
    //         const is_bundle_only = formData.is_bundle_only || false;
    //         let preAuthResponseId = null;

    //         if (isPreauth) {
    //             initialFhirBundle = buildFhirClaimBundle.transformFormToFhirBundle(formData);

    //             const preAuthResult = await apiClientService.submitClaimBundle(initialFhirBundle, apiKey, isDev);

    //             if (!preAuthResult.success) {
    //                 return res.status(preAuthResult.status || 400).json({
    //                     success: false,
    //                     message: 'Preauthorization submission failed',
    //                     error: { error: preAuthResult.error, fhirBundle: initialFhirBundle },
    //                     preAuthResponseId
    //                 });
    //             }

    //             preAuthResponseId = this.extractPreAuthResponseId(preAuthResult.data);

    //             if (!preAuthResponseId) {
    //                 return res.status(400).json({
    //                     success: false,
    //                     message: 'Could not determine preauthorization response ID',
    //                     error: { fhirBundle: initialFhirBundle },
    //                     preAuthResponseId
    //                 });
    //             }

    //             const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    //             const maxRetries = 3;
    //             const delayMs = 5000;
    //             let state = 'pending';
    //             let claimResponseResult = null;

    //             for (let attempt = 0; attempt <= maxRetries; attempt++) {
    //                 claimResponseResult = await apiClientService.getClaimResponse(preAuthResponseId, apiKey, isDev);

    //                 if (!claimResponseResult.success) {
    //                     return res.status(claimResponseResult.status || 400).json({
    //                         success: false,
    //                         message: 'Failed to retrieve preauthorization response',
    //                         error: { error: claimResponseResult.error, fhirBundle: initialFhirBundle },
    //                         preAuthResponseId
    //                     });
    //                 }

    //                 state = this.getClaimState(claimResponseResult.data);

    //                 if (state === 'approved') {
    //                     break;
    //                 }
    //                 claim
    //                 if (attempt < maxRetries) {
    //                     await delay(delayMs);
    //                 }
    //             }

    //             if (state !== 'approved') {
    //                 return res.status(400).json({
    //                     success: false,
    //                     message: 'Preauthorization not approved, current state: ' + state,
    //                     error: { claimResponseResult, fhirBundle: initialFhirBundle },
    //                     preAuthResponseId
    //                 });
    //             }
    //         }

    //         // Continue with final claim submission
    //         const fhirBundle = buildFhirClaimBundle.transformFormToFhirBundle(formData, preAuthResponseId);

    //         if (is_bundle_only) {
    //             return res.status(200).json({
    //                 success: true,
    //                 message: 'Bundle only request processed successfully',
    //                 data: { is_bundle_only, preAuthResponseId, fhirBundle },
    //                 fhirBundle
    //             });
    //         }

    //         const result = await apiClientService.submitClaimBundle(fhirBundle, apiKey, isDev);

    //         return res.status(result.success ? 200 : result.status || 400).json({
    //             success: result.success,
    //             message: result.success ?
    //                 (isPreauth ? 'Preauthorized claim submitted successfully' : 'Claim submitted successfully') :
    //                 'Failed to submit claim',
    //             ...(result.success ? {
    //                 data: result,
    //                 fhirBundle,
    //                 isPreauth,
    //                 preAuthResponseId
    //             } : {
    //                 error: {
    //                     ...result,
    //                     fhirBundle
    //                 },
    //             })
    //         });

    //     } catch (error) {
    //         console.error('Claim submission error:', error);
    //         return res.status(500).json({
    //             success: false,
    //             message: 'Internal server error',
    //             error: { error: error.message }
    //         });
    //     }
    // }

    getClaimResponse = async (req, res) => {
        try {
            const claimId = req.params.claim_id;
            if (!claimId) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing claimId parameter'
                });
            }

            // For getClaimResponse, you might want to pass isDev as a query parameter
            const isDev = false;
            const apiKey = this.getApiKey(isDev);

            const resp = await apiClientService.getClaimResponse(claimId, apiKey, isDev);
            return res.json(resp);
        } catch (error) {
            console.error('Error getting claim response:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to retrieve claim response',
                error: error.message
            });
        }
    }

    /**
     * Get the appropriate API key based on environment
     */
    getApiKey = (isDev) => {
        return isDev === true ? process.env.API_KEY_DEV : process.env.API_KEY;
    }

    /**
     * Get the appropriate API base URL based on environment
     */
    getApiBaseUrl = (isDev) => {

        return isDev === true ? process.env.API_BASE_URL_DEV : process.env.API_BASE_URL;
    }

    /**
 * Extracts the preauthorization response ID from the API response
 * @param {Object} responseData - The API response data
 * @returns {string|null} The preauthorization response ID or null if not found
 */
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

    /**
     * Health check endpoint
     */
    healthCheck = async (req, res) => {
        try {
            const isDev = req.query.isDev === true || false;
            const apiKey = this.getApiKey(isDev);

            const healthResult = await apiClientService.healthCheck(isDev, apiKey);

            return res.json({
                success: healthResult.success,
                status: healthResult.status,
                data: healthResult.data,
                environment: isDev ? 'Development' : 'QA',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Health check error:', error);
            return res.status(500).json({
                success: false,
                message: 'Health check failed',
                error: error.message
            });
        }
    }

    /**
     * Get claim by ID
     */
    getClaimById = async (req, res) => {
        try {
            const { claimId } = req.params;
            const isDev = req.query.isDev === 'true' || false;
            const apiKey = this.getApiKey(isDev);

            if (!claimId) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing claimId parameter'
                });
            }

            const result = await apiClientService.getClaimResponse(claimId, apiKey, isDev);

            return res.json(result);
        } catch (error) {
            console.error('Error getting claim by ID:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to retrieve claim',
                error: error.message
            });
        }
    }

    /**
     * Validate claim data before submission
     */
    validateClaim = async (req, res) => {
        try {
            const { formData } = req.body;

            if (!formData) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required parameters: formData'
                });
            }

            // Basic validation checks
            const errors = [];

            // Validate patient data
            if (!formData.patient || !formData.patient.id) {
                errors.push('Patient ID is required');
            }

            // Validate provider data
            if (!formData.provider || !formData.provider.id) {
                errors.push('Provider ID is required');
            }

            // Validate billable period
            if (!formData.billablePeriod || !formData.billablePeriod.billableStart || !formData.billablePeriod.billableEnd) {
                errors.push('Billable period start and end dates are required');
            }

            // Validate product or service
            if (!formData.productOrService || !Array.isArray(formData.productOrService) || formData.productOrService.length === 0) {
                errors.push('At least one product or service is required');
            }

            if (errors.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors
                });
            }

            // If validation passes, return success
            return res.json({
                success: true,
                message: 'Claim data is valid',
                data: {
                    patientId: formData.patient.id,
                    providerId: formData.provider.id,
                    serviceCount: formData.productOrService.length,
                    totalAmount: formData.total?.value || 0
                }
            });

        } catch (error) {
            console.error('Claim validation error:', error);
            return res.status(500).json({
                success: false,
                message: 'Validation failed due to server error',
                error: error.message
            });
        }
    }

    /**
     * Get claim status and details
     */
    getClaimStatus = async (req, res) => {
        try {
            const { claimId } = req.params;
            const isDev = req.query.isDev === 'true' || false;
            const apiKey = this.getApiKey(isDev);

            if (!claimId) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing claimId parameter'
                });
            }

            const result = await apiClientService.getClaimResponse(claimId, apiKey, isDev);

            if (!result.success) {
                return res.status(result.status || 400).json({
                    success: false,
                    message: 'Failed to retrieve claim status',
                    error: result.error
                });
            }

            const claimData = result.data;
            const status = this.getClaimState(claimData);
            const isApproved = this.isClaimApproved(claimData);

            return res.json({
                success: true,
                claimId: claimId,
                status: status,
                isApproved: isApproved,
                data: claimData,
                lastUpdated: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error getting claim status:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to retrieve claim status',
                error: error.message
            });
        }
    }

    /**
     * Batch submit multiple claims
     */
    batchSubmitClaims = async (req, res) => {
        try {
            const { claims, isDev = false } = req.body;

            if (!claims || !Array.isArray(claims)) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing or invalid claims array'
                });
            }

            const apiKey = this.getApiKey(isDev);
            const results = [];

            // Process claims sequentially to avoid overwhelming the API
            for (const claimData of claims) {
                try {
                    const fhirBundle = buildFhirClaimBundle.transformFormToFhirBundle(claimData);
                    const result = await apiClientService.submitClaimBundle(fhirBundle, apiKey, isDev);

                    results.push({
                        claimId: claimData.patient?.id || 'unknown',
                        success: result.success,
                        status: result.status,
                        data: result.data,
                        error: result.error
                    });

                    // Small delay between submissions
                    await new Promise(resolve => setTimeout(resolve, 100));
                } catch (error) {
                    results.push({
                        claimId: claimData.patient?.id || 'unknown',
                        success: false,
                        error: error.message
                    });
                }
            }

            const successful = results.filter(r => r.success).length;
            const failed = results.filter(r => !r.success).length;

            return res.json({
                success: true,
                message: `Batch processing completed. Successful: ${successful}, Failed: ${failed}`,
                total: results.length,
                successful: successful,
                failed: failed,
                results: results
            });

        } catch (error) {
            console.error('Batch submit error:', error);
            return res.status(500).json({
                success: false,
                message: 'Batch submission failed',
                error: error.message
            });
        }
    }

    /**
     * Get processing statistics
     */
    getProcessingStats = async (req, res) => {
        try {
            const timeRange = req.query.range || '24h'; // 24h, 7d, 30d
            const isDev = req.query.isDev === 'true' || false;

            // This would typically query your database for historical stats
            // For now, return mock data or basic stats from active jobs
            const jobs = bulkClaimProcessor.getAllJobs();

            const stats = {
                totalJobs: jobs.length,
                activeJobs: jobs.filter(job => job.status === 'processing').length,
                completedJobs: jobs.filter(job => job.status === 'completed').length,
                failedJobs: jobs.filter(job => job.status === 'failed').length,
                totalClaimsProcessed: jobs.reduce((sum, job) => sum + job.processedClaims, 0),
                averageProcessingTime: this.calculateAverageProcessingTime(jobs),
                successRate: this.calculateSuccessRate(jobs),
                timeRange: timeRange
            };

            return res.json({
                success: true,
                stats: stats,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error getting processing stats:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to retrieve processing statistics',
                error: error.message
            });
        }
    }

    /**
     * Calculate average processing time from jobs
     */
    calculateAverageProcessingTime(jobs) {
        const completedJobs = jobs.filter(job => job.status === 'completed' && job.endTime);
        if (completedJobs.length === 0) return 0;

        const totalTime = completedJobs.reduce((sum, job) => {
            const start = new Date(job.startTime);
            const end = new Date(job.endTime);
            return sum + (end - start);
        }, 0);

        return Math.round(totalTime / completedJobs.length / 1000); // Return in seconds
    }

    /**
     * Calculate overall success rate
     */
    calculateSuccessRate(jobs) {
        const totalClaims = jobs.reduce((sum, job) => sum + job.totalClaims, 0);
        const successfulClaims = jobs.reduce((sum, job) => sum + job.successfulClaims, 0);

        if (totalClaims === 0) return 0;
        return Number((successfulClaims / totalClaims * 100).toFixed(2));
    }
}

module.exports = new ClaimController();