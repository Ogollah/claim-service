const express = require('express');
const router = express.Router();
const practitionerController = require('../controllers/PractitionController');

router.post('/', practitionerController.createPractitioner);
router.get('/', practitionerController.getAllPractitioners);
router.get('/practitioner/:query', practitionerController.searchPractitioner);
router.delete('/delete/:id', practitionerController.deletePractitioner);

module.exports = router;
