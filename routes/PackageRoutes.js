const express = require('express');
const router = express.Router();
const packageController = require('../controllers/PackageController');

router.post('/', packageController.createPackage);
router.get('/', packageController.getAllPackages);
router.get('/package/:query', packageController.searchPackage);
router.delete('/delete/:id', packageController.deletePackage);

module.exports = router;
