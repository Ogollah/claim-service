const axios = require('axios');
const logger = require('../utils/logger');

class ApiClientService {
  constructor() {
    this.client = axios.create({
      baseURL: process.env.API_BASE_URL || 'https://qa-payers.apeiro-digital.com/api/v1/',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.API_KEY
      }
    });
  }

  /**
   * Submits a FHIR bundle to the claims endpoint
   * @param {Object} fhirBundle - FHIR bundle payload
   * @param {string} apiKey - API key for authentication
   * @returns {Promise<Object>} API response
   */
  async submitClaimBundle(fhirBundle, apiKey) {
    try {
      const response = await this.client.post('claim/bundle', fhirBundle, {
        headers: {
          'apikey': `${apiKey}`
        }
      });

      logger.info('Claim bundle submitted successfully', {
        status: response.status,
        claimId: fhirBundle.id
      });

      return {
        success: true,
        status: response.status,
        data: response.data
      };
    } catch (error) {
      logger.error('Failed to submit claim bundle', {
        error: error.message,
        claimId: fhirBundle.id
      });
      return {
        success: false,
        status: error.response?.status || 500,
        error: error.response?.data || error.message
      };
    }
  }
}

module.exports = new ApiClientService();