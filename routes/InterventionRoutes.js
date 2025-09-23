const express = require('express');
const router = express.Router();
const interventionController = require('../controllers/InterventionController');

/**
 * @swagger
 * tags:
 *   name: Interventions
 *   description: API for managing interventions
 */

/**
 * @swagger
 * /api/interventions:
 *   post:
 *     summary: Create a new intervention
 *     tags: [Interventions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             example: 
 *               code: SHA-54-001
 *               name: Some care service
 *               is_complex: 1
 *     responses:
 *       201:
 *         description: Intervention created successfully
 */
router.post('/', interventionController.createIntervention);

/**
 * @swagger
 * /api/interventions:
 *   get:
 *     summary: Get all interventions
 *     tags: [Interventions]
 *     responses:
 *       200:
 *         description: A list of all interventions
 */
router.get('/', interventionController.getAllInterventions);

/**
 * @swagger
 * /api/interventions/intervention/{query}:
 *   get:
 *     summary: Search intervention by intervention code or identifier
 *     tags: [Interventions]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Code or identifier to search for
 *     responses:
 *       200:
 *         description: Intervention(s) found
 */
router.get('/intervention/:query', interventionController.searchIntervention);

/**
 * @swagger
 * /api/interventions/delete/{id}:
 *   delete:
 *     summary: Delete an intervention by ID
 *     tags: [Interventions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The intervention's ID
 *     responses:
 *       200:
 *         description: Intervention deleted
 */
router.delete('/delete/:id', interventionController.deleteIntervention);

/**
 * @swagger
 * /api/interventions/{package_id}:
 *   get:
 *     summary: Get intervention by package ID
 *     tags: [Interventions]
 *     parameters:
 *       - in: path
 *         name: package_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The package id
 *     responses:
 *       200:
 *         description: Intervention retrieved
 */
router.get('/:package_id', interventionController.getInterventionByPackageId);
router.get('/code/:code', interventionController.getInterventionByCode);

/**
 * @swagger
 * /api/interventions/complex/{is_complex}:
 *   get:
 *     summary: Get intervention by package ID
 *     tags: [Interventions]
 *     parameters:
 *       - in: path
 *         name: is_complex
 *         required: true
 *         schema:
 *           type: string
 *         description: The intervention complexy state
 *     responses:
 *       200:
 *         description: Intervention retrieved
 */
router.get('/complex/:is_complex', interventionController.getInterventionByComplex);

/**
 * @swagger
 * /api/interventions/update/{id}:
 *   put:
 *     summary: Update an intervention by ID
 *     tags: [Interventions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The intervention's ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               package_id:
 *                 type: string
 *               code:
 *                 type: string
 *               name:
 *                 type: string
 *               is_complex:
 *                 type: number
 *     responses:
 *       200:
 *         description: Intervention updated successfully
 */
router.put('/update/:id', interventionController.updateIntervention);
module.exports = router;
