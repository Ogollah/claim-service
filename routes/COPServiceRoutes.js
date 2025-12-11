// routes/COPServiceRoutes.js
const express = require('express');
const router = express.Router();
const copServiceController = require('../controllers/COPServiceController');

router.post('/service', copServiceController.postCOPResponse);

module.exports = router;