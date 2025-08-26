const express = require('express');
const router = express.Router();
const patientController = require('../controllers/PatientController');

router.post('/', patientController.createPatient);
router.get('/', patientController.getAllPatients);
router.get('/patient/:query', patientController.searchPatient);
router.delete('/delete/:id', patientController.deletePatient);
router.get('/:cr_id', patientController.getPatientByCrID);
router.put('/update/:id', patientController.updatePatient);
module.exports = router;
