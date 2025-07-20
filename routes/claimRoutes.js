// routes/claimRoutes.js
const express = require('express');
const router = express.Router();
const claimController = require('../controllers/claimController');

router.post('/submit', claimController.submitClaim);

module.exports = router;