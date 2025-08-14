const express = require('express');
const router = express.Router();
const testCaseController = require('../controllers/TestCaseController');

router.post('/', testCaseController.createTestCase);
router.get('/', testCaseController.getAllTestCases);
router.get('/test-case/:query', testCaseController.searchTestCase);
router.delete('/delete/:id', testCaseController.deleteTestCase);
router.get('/:code', testCaseController.getTestCaseByCode);
router.put('/update/:id', testCaseController.updateTestConfig);
module.exports = router
