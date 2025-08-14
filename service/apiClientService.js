const axios = require('axios');
const logger = require('../utils/logger');

class ApiClientService {
  constructor() {
    this.client = axios.create({
      baseURL: process.env.API_BASE_URL || 'https://qa-payers.apeiro-digital.com/api/v1/',
      timeout: 30000,
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
        headers: { apikey: apiKey }
      });

      logger.info('Claim bundle submitted successfully', {
        status: response.status,
        claimId: fhirBundle.id,
        endpoint: 'claim/bundle'
      });

      return {
        success: true,
        status: response.status,
        data: response.data
      };
    } catch (error) {
      const errorStatus = error.response?.status || 500;
      const errorData = error.response?.data || { message: error.message };

      logger.error('Failed to submit claim bundle', {
        status: errorStatus,
        error: errorData,
        claimId: fhirBundle.id,
        endpoint: 'claim/bundle'
      });

      return {
        success: false,
        status: errorStatus,
        error: errorData
      };
    }
  }

  /**
   * Retrieves claim response for a given claim ID
   * @param {string} claimId - The claim ID to lookup
   * @param {string} apiKey - API key for authentication
   * @returns {Promise<Object>} API response
   */
  async getClaimResponse(claimId, apiKey) {
    if (!claimId) {
      logger.error('Missing claimId parameter');
      throw new Error('claimId is required');
    }

    try {
      const response = await this.client.get(
        `insurance-claim/internal/claimObject?claimId=${claimId}`,
        { headers: { apikey: apiKey } }
      );

      logger.info('Successfully retrieved claim response', {
        claimId,
        status: response.status
      });

      return {
        success: true,
        status: response.status,
        data: response.data
      };
    } catch (error) {
      const errorStatus = error.response?.status || 500;
      const errorData = error.response?.data || { message: error.message };

      logger.error('Failed to retrieve claim response', {
        claimId,
        status: errorStatus,
        error: errorData
      });

      return {
        success: false,
        status: errorStatus,
        error: errorData
      };
    }
  }
}

module.exports = new ApiClientService();