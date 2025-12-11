const axios = require('axios');
const logger = require('../utils/logger');
const { getByClaimId } = require('../models/COP');

class ApiClientService {
  constructor() {
    // Default client with fallback values
    this.client = axios.create({
      baseURL: process.env.API_BASE_URL || 'https://qa-payers.apeiro-digital.com/api/v1/',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Creates an axios instance with custom base URL and headers
   * @param {string} baseURL - The base URL for the API
   * @param {string} apiKey - API key for authentication
   * @returns {Object} Axios instance
   */
  createClient(baseURL, apiKey) {
    return axios.create({
      baseURL: baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey
      }
    });
  }

  /**
   * Gets the appropriate base URL based on environment
   * @param {boolean} isDev - Whether to use dev environment
   * @returns {string} API base URL
   */
  getBaseUrl(isDev) {
    return isDev === true ? process.env.API_BASE_URL_DEV || 'https://dev-payers.apeiro-digital.com/api/v1/' : process.env.API_BASE_URL || 'https://qa-payers.apeiro-digital.com/api/v1/';
  }

  /**
   * Submits a FHIR bundle to the claims endpoint
   * @param {Object} fhirBundle - FHIR bundle payload
   * @param {string} apiKey - API key for authentication
   * @param {boolean} isDev - Whether to use dev environment
   * @returns {Promise<Object>} API response
   */
  async submitClaimBundle(fhirBundle, apiKey, isDev) {
    try {
      const baseURL = this.getBaseUrl(isDev);
      const client = this.createClient(baseURL, apiKey);


      logger.info('Submitting claim bundle', {
        environment: isDev === true ? 'Development' : 'QA',
        baseURL: baseURL,
        claimId: fhirBundle.id,
        endpoint: 'claim/bundle'
      });

      const response = await client.post('claim/bundle', fhirBundle);

      logger.info('Claim bundle submitted successfully', {
        status: response.status,
        claimId: fhirBundle.id,
        environment: isDev === true ? 'Development' : 'QA',
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
        environment: isDev === true ? 'Development' : 'QA',
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
   * @param {boolean} isDev - Whether to use dev environment
   * @returns {Promise<Object>} API response
   */
  async getClaimResponse(claimId, apiKey, isDev) {
    if (!claimId) {
      logger.error('Missing claimId parameter');
      throw new Error('claimId is required');
    }

    try {
      const baseURL = this.getBaseUrl(isDev);
      const client = this.createClient(baseURL, apiKey);

      logger.info('Retrieving claim response', {
        claimId,
        environment: isDev ? 'Development' : 'QA',
        baseURL: baseURL
      });

      const response = await client.get(
        `insurance-claim/internal/claimObject?claimId=${claimId}`
      );

      logger.info('Successfully retrieved claim response', {
        claimId,
        status: response.status,
        environment: isDev ? 'Development' : 'QA'
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
        error: errorData,
        environment: isDev ? 'Development' : 'QA'
      });

      return {
        success: false,
        status: errorStatus,
        error: errorData
      };
    }
  }

  async postCOPResponse(claimId, isRandom) {
    try {
      let copResponse = [];
      
      if (isRandom === false) {
        copResponse = await getByClaimId(claimId);
      }
    
      const randomValue = Math.random();
      const isApproved = randomValue < 0.7 || copResponse.length > 0 
      
      const statusCode = isApproved ? 200 : 400;
      
      const responseData = {
        claimId: claimId,
        approved: isApproved,
        details: isApproved 
          ? 'Claim meets COP criteria' 
          : 'Claim does not meet COP criteria'
      };

      return {
        success: isApproved,
        status: statusCode,
        data: responseData
      };
      
    } catch (error) {
      const errorStatus = error.response?.status || 500;
      const errorData = error.response?.data || { message: error.message };
      return {
        success: false,
        status: errorStatus,
        error: errorData
      };
    }
  }

  /**
   * Health check for the API
   * @param {boolean} isDev - Whether to use dev environment
   * @param {string} apiKey - API key for authentication
   * @returns {Promise<Object>} Health check response
   */
  async healthCheck(isDev = false, apiKey = null) {
    try {
      const baseURL = this.getBaseUrl(isDev);
      const client = this.createClient(baseURL, apiKey || 'dummy-key');

      const response = await client.get('health');

      return {
        success: true,
        status: response.status,
        data: response.data,
        environment: isDev ? 'Development' : 'QA'
      };
    } catch (error) {
      return {
        success: false,
        status: error.response?.status || 500,
        error: error.response?.data || { message: error.message },
        environment: isDev ? 'Development' : 'QA'
      };
    }
  }
}

module.exports = new ApiClientService();