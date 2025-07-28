const buildFhirClaimBundle = require('../service/buildFhirClaimBundle');
const apiClientService = require('../service/apiClientService');

class ClaimController {
    constructor() {
    // Bind the method to the instance
    this.extractPreAuthResponseId = this.extractPreAuthResponseId.bind(this);
  }
  /**
   * Extracts the preauthorization response ID from the API response
   * @param {Object} responseData - The API response data
   * @returns {string|null} The preauthorization response ID or null if not found
   */
  extractPreAuthResponseId = (responseData) => {
    try {
      if (responseData.entry) {
        const claimResponseEntry = responseData.entry.find(entry => 
          entry.resource?.resourceType === 'Claim'
        );
        return claimResponseEntry?.resource?.id || null;
      }
    } catch (error) {
      console.error('Error extracting claim response ID:', error);
      return null;
    }
  }

  /**
   * Processes form data and submits FHIR claim
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async submitClaim(req, res) {
    try {
      const { formData } = req.body;

      // Validate required inputs
      if (!formData) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters: formData'
        });
      }

      // Check if this is a preauthorization claim
      let preAuthResponseId = null;
      if (formData.use?.id === 'preauthorization') {
        // First submit as preauthorization to get the response ID
        const initialFhirBundle = buildFhirClaimBundle.transformFormToFhirBundle(formData);
        const preAuthResult = await apiClientService.submitClaimBundle(
          initialFhirBundle, 
          process.env.API_KEY || '64b3d924-1f40-4608-a70a-6fb5130abc77'
        );

        console.log('Preauthorization result:', preAuthResult.data.entry.find(claim => claim.resource.resourceType === 'Claim').resource.id);
        
        if (!preAuthResult.success) {
          return res.status(preAuthResult.status || 400).json({
            success: false,
            message: 'Preauthorization submission failed',
            error: preAuthResult.error
          });
        }

        // Extract the preauthorization response ID from the result
        preAuthResponseId = preAuthResult.data.entry.find(claim => claim.resource.resourceType === 'Claim').resource.id;
        console.log('Preauthorization response ID:', preAuthResponseId);
        
        
        if (!preAuthResponseId) {
          return res.status(400).json({
            success: false,
            message: 'Could not determine preauthorization response ID'
          });
        }
      }

      // Transform form data to FHIR bundle (with preauth ID if applicable)
      const fhirBundle = buildFhirClaimBundle.transformFormToFhirBundle(formData, preAuthResponseId);

      // Submit to FHIR API
      const result = await apiClientService.submitClaimBundle(
        fhirBundle, 
        process.env.API_KEY || '64b3d924-1f40-4608-a70a-6fb5130abc77'
      );

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Claim submitted successfully',
          data: result.data,
          fhirBundle: fhirBundle,
          isPreauth: formData.use?.id === 'preauthorization',
          preAuthResponseId: preAuthResponseId
        });
      } else {
        res.status(result.status || 400).json({
          success: false,
          message: 'Failed to submit claim',
          error: result.error
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
}

module.exports = new ClaimController();