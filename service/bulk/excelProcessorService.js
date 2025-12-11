const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const COPClaim = require('../../models/COP');

class ExcelProcessorService {
    constructor() {
        this.processedDir = path.join(__dirname, '../processed_files');
        this.ensureProcessedDir();
    }

    async ensureProcessedDir() {
        try {
            await fs.access(this.processedDir);
        } catch {
            await fs.mkdir(this.processedDir, { recursive: true });
        }
    }

    /**
     * Parse Excel file and extract claim data
     */
    async *parseExcelFile(filePath, batchSize = 1000) {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);

        const worksheet = workbook.worksheets[0];
        const claims = [];
        const headerMap = {};

        // Read headers and create mapping
        worksheet.getRow(1).eachCell((cell, colNumber) => {
            headerMap[cell.value?.toString().trim()] = colNumber;
        });

        // Process rows
        for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
            const row = worksheet.getRow(rowNumber);
            if (!this.getCellValue(row, 'patientId', headerMap)) continue;

            const claimData = this.mapRowToClaimData(row, headerMap);
            if (claimData) {
                claims.push(claimData);
            }

            if (claims.length >= batchSize) {
                yield claims;
                claims.length = 0;
            }
        }

        if (claims.length > 0) {
            yield claims;
        }
    }

    getCellValue(row, headerName, headerMap) {
        const colNumber = headerMap[headerName];
        return colNumber ? row.getCell(colNumber).value : null;
    }

    mapRowToClaimData(row, headerMap) {
        try {
            // Helper function to get cell value by header name
            const getValue = (header) => this.getCellValue(row, header, headerMap);

            // Extract patient identifiers
            const patientIdentifiers = [];
            if (getValue('patientId')) {
                patientIdentifiers.push({
                    system: "SHA",
                    value: getValue('patientId')?.toString()
                });
            }
            // Add NationalID identifier
            if (getValue('patientIdentifiersID')) {
                patientIdentifiers.push({
                    system: "NationalID",
                    value: getValue('patientId')?.toString()
                });
            }

            // Extract provider identifiers
            const providerIdentifiers = [];
            if (getValue('providerIdentifiersSlade')) {
                providerIdentifiers.push({
                    system: "slade_code",
                    value: getValue('providerIdentifiersSlade')?.toString()
                });
            }

            if (getValue('providerFID')) {
                providerIdentifiers.push({
                    value: getValue('providerFID')?.toString(),
                    system: "FID"
                });
            }

            // Extract practitioner data
            // const practitioner = {
            //     id: getValue('practitionerPUID')?.toString(),
            //     name: getValue('practitionerName')?.toString(),
            //     gender: getValue('practitionerGender')?.toString(),
            //     phone: getValue('practitionerPhone')?.toString(),
            //     address: "P.O BOX - GARISSA", // Default address as per target format
            //     nationalID: getValue('practitionerNationalID')?.toString(),
            //     email: getValue('practitionerEmail')?.toString(),
            //     sladeCode: getValue('practitionerSladeCode')?.toString(),
            //     regNumber: getValue('practitionerRegNumber')?.toString(),
            //     status: getValue('practitionerStatus') === "=TRUE()"
            // };

            // Product/Service data
            const productOrService = [{
                code: getValue('productOrServiceCode')?.toString(),
                display: getValue('productOrServiceInterventionName')?.toString(),
                quantity: {
                    value: getValue('productOrServiceQuantity')?.toString() || 1
                },
                unitPrice: {
                    value: parseFloat(getValue('productOrServiceUnitPrice')) || 0,
                    currency: getValue('currency')?.toString() || "KES"
                },
                net: {
                    value: parseFloat(getValue('productOrServiceNetValue')) || 0,
                    currency: getValue('currency')?.toString() || "KES"
                },
                servicePeriod: {
                    start: this.formatDate(getValue('productOrServiceServicePeriodStart')),
                    end: this.formatDate(getValue('productOrServiceServicePeriodEnd'))
                },
                sequence: parseInt(getValue('productOrServiceSequence')) || 1
            }];

            // Billable period
            const billablePeriod = {
                billableStart: this.formatDate(getValue('billablePeriodStart')),
                billableEnd: this.formatDate(getValue('billablePeriodEnd')),
                created: this.formatDate(getValue('CreateDate'))
            };

            // Total
            const total = {
                value: parseFloat(getValue('totalValue')) || 0,
                currency: getValue('currency')?.toString() || "KES"
            };

            return {
                formData: {
                    title: `Test for ${getValue('productOrServiceCode')?.toString()}`,
                    test: "complex",
                    patient: {
                        id: getValue('patientId')?.toString(),
                        name: getValue('patientName')?.toString(),
                        gender: getValue('patientGender')?.toString(),
                        birthDate: this.formatDate(getValue('patientBirthDate')),
                        identifiers: patientIdentifiers
                    },
                    provider: {
                        id: getValue('providerFID')?.toString(),
                        name: getValue('providerName')?.toString(),
                        level: getValue('providerLevel')?.toString(),
                        identifiers: providerIdentifiers,
                        active: getValue('providerActive')
                    },
                    use: getValue('use')?.toString() || "claim",
                    claimSubType: getValue('claimSubType')?.toString(),
                    // practitioner: practitioner,
                    productOrService: productOrService,
                    billablePeriod: billablePeriod,
                    total: total,
                    approvedAmount: getValue('approvedAmount') || 0
                }
            };
        } catch (error) {
            console.error('Error mapping row to claim data:', error);
            return null;
        }
    }

    formatDate(dateValue) {
        if (!dateValue) return new Date().toISOString().split('T')[0];

        if (dateValue instanceof Date) {
            return dateValue.toISOString().split('T')[0];
        }

        if (typeof dateValue === 'string') {
            // Handle various date formats
            const date = new Date(dateValue);
            return !isNaN(date.getTime()) ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        }

        return new Date().toISOString().split('T')[0];
    }

    /**
     * Create result Excel file with processing status
     */
    async createResultFile(originalFilePath, results) {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(originalFilePath);

        const worksheet = workbook.worksheets[0];
        const headerMap = {};

        // Read headers and create mapping
        worksheet.getRow(1).eachCell((cell, colNumber) => {
            headerMap[cell.value?.toString().trim()] = colNumber;
        });

        // Add status columns at the end
        const lastColumn = Math.max(...Object.values(headerMap));
        const statusCol = lastColumn + 1;

        worksheet.getRow(1).getCell(statusCol).value = 'Processing Status';
        worksheet.getRow(1).getCell(statusCol + 1).value = 'Claim ID';
        worksheet.getRow(1).getCell(statusCol + 2).value = 'Response Data';
        worksheet.getRow(1).getCell(statusCol + 3).value = 'Error Message';
        worksheet.getRow(1).getCell(statusCol + 4).value = 'Processed At';

        // Update rows with results
        results.forEach(async (result, index) => {
            
            const rowNumber = index + 2;
            if (worksheet.getRow(rowNumber)) {
                worksheet.getRow(rowNumber).getCell(statusCol).value = result.status;
                worksheet.getRow(rowNumber).getCell(statusCol + 1).value = result.claimId;
                worksheet.getRow(rowNumber).getCell(statusCol + 2).value = JSON.stringify(result.responseData || {});
                worksheet.getRow(rowNumber).getCell(statusCol + 3).value = result.error || '';
                worksheet.getRow(rowNumber).getCell(statusCol + 4).value = new Date().toISOString();
            }

        });

        const resultFileName = `results_${path.basename(originalFilePath, '.xlsx')}_${Date.now()}.xlsx`;
        const resultFilePath = path.join(this.processedDir, resultFileName);

        await workbook.xlsx.writeFile(resultFilePath);
        return resultFilePath;
    }
}

module.exports = new ExcelProcessorService();