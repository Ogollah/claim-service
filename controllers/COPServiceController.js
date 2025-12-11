require('dotenv').config();
const apiClientService = require('../service/apiClientService');

const copServiceController = {

  postCOPResponse : async (req, res) => {
    try {
      const claimID = req.body.claimId;
      const isRandom = req.body.isRandom;

      const serviceResult = await apiClientService.postCOPResponse(claimID, isRandom);

      // Handle service errors
      if (!serviceResult.success) {
        const statusCode = serviceResult.status || 500;
        return res.status(statusCode).json({
          success: false,
          message: serviceResult.error?.message || 'Service error occurred',
          error: serviceResult.error,
          data: serviceResult.data || null
        });
      }

      // Handle business logic based on approval
      if (!serviceResult.data?.approved) {
        return res.status(400).json({
          success: false,
          message: serviceResult.data?.details || 'Claim rejected',
          data: serviceResult.data
        });
      }

      // Success
      return res.status(200).json({
        success: true,
        message: 'Claim approved successfully',
        data: serviceResult.data
      });

    } catch (error) {
      console.error('Unexpected error in postCOPResponse:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
}

module.exports = copServiceController;