require('dotenv').config(); 
const buildFhirClaimBundle = require('../service/buildFhirClaimBundle');
const apiClientService = require('../service/apiClientService');

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
        entry.resource?.resourceType === 'ClaimResponse'
      )?.resource?.id ?? null;
    } catch (error) {
      console.error('Error extracting claim response ID:', error);
      return null;
    }
  }

  /**
   * Checks if Claim status is approved
   * @param {Object} claimData - The FHIR Claim resource
   * @returns {boolean} True if status is approved
   */
  isClaimApproved = (claimData) => {
    try {
      const claimStateExtension = claimData.extension?.find(ext =>
        ext.url?.endsWith('claim-state-extension')
      );

      const code = claimStateExtension?.valueCodeableConcept?.coding?.find(
        coding => coding.system?.endsWith('claim-state')
      )?.code;

      return code === 'approved';
    } catch (error) {
      console.error('Error checking claim approval status:', error);
      return false;
    }
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
          message: 'Missing required parameters: formData'
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
            error: preAuthResult.error
          });
        }

        preAuthResponseId = this.extractPreAuthResponseId(preAuthResult.data);
        
        if (!preAuthResponseId) {
          return res.status(400).json({
            success: false,
            message: 'Could not determine preauthorization response ID'
          });
        }

        const claimResponseResult = await apiClientService.getClaimResponse(preAuthResponseId, this.apiKey);
        
        if (!claimResponseResult.success) {
          return res.status(claimResponseResult.status || 400).json({
            success: false,
            message: 'Failed to retrieve preauthorization response',
            error: claimResponseResult.error
          });
        }

        const isApproved = this.isClaimResponseApproved(claimResponseResult.data);

        if (!isApproved) {
          return res.status(400).json({
            success: false,
            message: 'Preauthorization not approved',
            data: claimResponseResult.data,
            preAuthResponseId
          });
        }
      }

      const fhirBundle = buildFhirClaimBundle.transformFormToFhirBundle(formData, preAuthResponseId);

      const result = await apiClientService.submitClaimBundle(fhirBundle, this.apiKey);

      return res.status(result.success ? 200 : result.status || 400).json({
        success: result.success,
        message: result.success ? 
          (isPreauth ? 'Preauthorized claim submitted successfully' : 'Claim submitted successfully') : 
          'Failed to submit claim',
        ...(result.success ? {
          data: result.data,
          fhirBundle,
          isPreauth,
          preAuthResponseId
        } : {
          error: result.error
        })
      });

    } catch (error) {
      console.error('Claim submission error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
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