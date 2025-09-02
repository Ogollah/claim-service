require('dotenv').config();
const buildFhirClaimBundle = require('../service/buildFhirClaimBundle');
const apiClientService = require('../service/apiClientService');
const {
  FHIR_SERVER,
} = require('../utils/constants');

class ClaimController {
  constructor() {
    this.apiKey = process.env.API_KEY;
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
   * Get Claim status
   * @param {Object} claimData - The FHIR Claim resource
   * @returns {string} state
   */
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

  /**
   * Checks if Claim status is approved
   * @param {string} claimData - The FHIR Claim resource
   * @returns {boolean} True if status is approved
   */
  isClaimApproved = (claimData) => {
    return this.getClaimState(claimData) === 'approved';
  };

  /**
   * Processes form data and submits FHIR claim
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */

  submitClaim = async (req, res) => {
    try {
      const { formData } = req.body;

      if (!formData) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters: formData',
          error: { fhirBundle: initialFhirBundle }
        });
      }

      const isPreauth = formData.use === 'preauth-claim';
      let preAuthResponseId = null;

      if (isPreauth) {
        const initialFhirBundle = buildFhirClaimBundle.transformFormToFhirBundle(formData);

        const preAuthResult = await apiClientService.submitClaimBundle(initialFhirBundle, this.apiKey);

        if (!preAuthResult.success) {
          return res.status(preAuthResult.status || 400).json({
            success: false,
            message: 'Preauthorization submission failed',
            error: { error: preAuthResult.error, fhirBundle: initialFhirBundle }
          });
        }

        preAuthResponseId = this.extractPreAuthResponseId(preAuthResult.data);

        if (!preAuthResponseId) {
          return res.status(400).json({
            success: false,
            message: 'Could not determine preauthorization response ID',
            error: { fhirBundle: initialFhirBundle }
          });
        }

        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        const maxRetries = 3;
        const delayMs = 20000;
        let state = 'pending';
        let claimResponseResult = null;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          claimResponseResult = await apiClientService.getClaimResponse(preAuthResponseId, this.apiKey);

          if (!claimResponseResult.success) {
            return res.status(claimResponseResult.status || 400).json({
              success: false,
              message: 'Failed to retrieve preauthorization response',
              error: { error: claimResponseResult.error, fhirBundle: initialFhirBundle }
            });
          }

          state = this.getClaimState(claimResponseResult.data);

          if (state === 'approved') {
            break;
          }

          if (attempt < maxRetries) {
            await delay(delayMs);
          }
        }

        if (state !== 'approved') {
          return res.status(400).json({
            success: false,
            message: 'Preauthorization not approved, current state: ' + state,
            error: { claimResponseResult, fhirBundle: initialFhirBundle },
            preAuthResponseId
          });
        }
      }

      // Continue with final claim submission
      const fhirBundle = buildFhirClaimBundle.transformFormToFhirBundle(formData, preAuthResponseId);

      const result = await apiClientService.submitClaimBundle(fhirBundle, this.apiKey);

      return res.status(result.success ? 200 : result.status || 400).json({
        success: result.success,
        message: result.success ?
          (isPreauth ? 'Preauthorized claim submitted successfully' : 'Claim submitted successfully') :
          'Failed to submit claim',
        ...(result.success ? {
          data: result,
          fhirBundle,
          isPreauth,
          preAuthResponseId
        } : {
          error: {
            ...result,
            fhirBundle
          },
        })
      });

    } catch (error) {
      console.error('Claim submission error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: { error: error, fhirBundle: initialFhirBundle }
      });
    }
  }


  getClaimResponse = async (req, res) => {
    try {
      const claimId = req.params.claim_id;
      if (!claimId) {
        return res.status(400).json({
          success: false,
          message: 'Missing claimId parameter'
        });
      }

      const resp = await apiClientService.getClaimResponse(claimId, this.apiKey);
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
}

module.exports = new ClaimController();