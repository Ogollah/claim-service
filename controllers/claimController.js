// controllers/claimController.js
const buildFhirClaimBundle = require('../service/buildFhirClaimBundle');
const apiClientService = require('../service/apiClientService');

class ClaimController {
  /**
   * Processes form data and submits FHIR claim
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async submitClaim(req, res) {
    try {
      const { formData} = req.body;

      // Validate required inputs
      if (!formData) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters: formData, basePayload, or apiKey'
        });
      }

      // Transform form data to FHIR bundle
    const fhirBundle = buildFhirClaimBundle.transformFormToFhirBundle(formData);
      console.log('Transformed FHIR Bundle:', JSON.stringify(fhirBundle, null, 2));
      

      // Submit to FHIR API
      const result = await apiClientService.submitClaimBundle(fhirBundle, process.env.API_KEY || '64b3d924-1f40-4608-a70a-6fb5130abc77');

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Claim submitted successfully',
          data: result.data,
          fhirBundle: fhirBundle
        });
      } else {
        res.status(result.status).json({
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

  createClaim = (req, res) => {
  console.log("Received POST to /api/claims");
  res.status(200).send("OK");
};
}

module.exports = new ClaimController();