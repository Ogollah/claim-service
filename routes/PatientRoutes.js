const express = require('express');
const router = express.Router();
const patientController = require('../controllers/PatientController');

/**
 * @swagger
 * tags:
 *   name: Patients
 *   description: API for managing patients
 */

/**
 * @swagger
 * /api/patients:
 *   post:
 *     summary: Create a new patient
 *     tags: [Patients]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             example: 
 *               cr_id: CR5017841212527-12
 *               name: John Doe
 *               birthdate: 2009-02-23
 *               gender: Male
 *               national_id: "45326754"
 *               email: mail@mail.com
 *               system_value: https://qa-mis.apeiro-digital.com/fhir/identifier
 *     responses:
 *       201:
 *         description: Patient created successfully
 */
router.post('/', patientController.createPatient);

/**
 * @swagger
 * /api/patients:
 *   get:
 *     summary: Get all patients
 *     tags: [Patients]
 *     responses:
 *       200:
 *         description: A list of all patients
 */
router.get('/', patientController.getAllPatients);

/**
 * @swagger
 * /api/patients/patient/{query}:
 *   get:
 *     summary: Search patient by name or identifier
 *     tags: [Patients]
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Name or identifier to search for
 *     responses:
 *       200:
 *         description: Patient(s) found
 */
router.get('/patient/:query', patientController.searchPatient);

/**
 * @swagger
 * /api/patients/delete/{id}:
 *   delete:
 *     summary: Delete a patient by ID
 *     tags: [Patients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The patient's ID
 *     responses:
 *       200:
 *         description: Patient deleted
 */
router.delete('/delete/:id', patientController.deletePatient);

/**
 * @swagger
 * /api/patients/{cr_id}:
 *   get:
 *     summary: Get patient by CR ID
 *     tags: [Patients]
 *     parameters:
 *       - in: path
 *         name: cr_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The CR ID of the patient
 *     responses:
 *       200:
 *         description: Patient retrieved
 */
router.get('/:cr_id', patientController.getPatientByCrID);

/**
 * @swagger
 * /api/patients/update/{id}:
 *   put:
 *     summary: Update a patient by ID
 *     tags: [Patients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The patient's ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             example:
 *               cr_id: CR5017841212527-19
 *               name: John Doe
 *               birthdate: 2009-02-23
 *               gender: Male
 *               national_id: "45326754"
 *               email: mail@mail.com
 *               system_value: https://qa-mis.apeiro-digital.com/fhir/identifier
 *     responses:
 *       200:
 *         description: Patient updated
 */
router.put('/update/:id', patientController.updatePatient);

module.exports = router;
