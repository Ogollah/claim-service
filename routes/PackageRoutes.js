const express = require('express');
const router = express.Router();
const packageController = require('../controllers/PackageController');

/**
 * @swagger
 * tags:
 *   name: Packages
 *   description: API for managing packages
 */

/**
 * @swagger
 * /api/packages:
 *   post:
 *     summary: Create a new package
 *     tags: [Packages]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             example: 
 *               code: SHA-54
 *               name: Some care service
 *               is_preauth: 1
 *     responses:
 *       201:
 *         description: Package created successfully
 */
router.post('/', packageController.createPackage);

/**
 * @swagger
 * /api/packages:
 *   get:
 *     summary: Get all packages
 *     tags: [Packages]
 *     responses:
 *       200:
 *         description: A list of all packages
 */
router.get('/', packageController.getAllPackages);

/**
 * @swagger
 * /api/packages/package/{query}:
 *   get:
 *     summary: Search package by package code or identifier
 *     tags: [Packages]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Code or identifier to search for
 *     responses:
 *       200:
 *         description: Package(s) found
 */
router.get('/package/:query', packageController.searchPackage);

/**
 * @swagger
 * /api/packages/delete/{id}:
 *   delete:
 *     summary: Delete a package by ID
 *     tags: [Packages]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The package's ID
 *     responses:
 *       200:
 *         description: Package deleted
 */
router.delete('/delete/:id', packageController.deletePackage);

/**
 * @swagger
 * /api/packages/preauth/{is_preauth}:
 *   get:
 *     summary: Get package by pre-authorization state
 *     tags: [Packages]
 *     parameters:
 *       - in: path
 *         name: is_preauth
 *         required: true
 *         schema:
 *           type: string
 *         description: The pre-authorization state of the package
 *     responses:
 *       200:
 *         description: Package retrieved
 */
router.get('/preauth/:is_preauth', packageController.getPackageByPreauthFlag);

module.exports = router;
