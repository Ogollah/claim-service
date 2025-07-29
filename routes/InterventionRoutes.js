const express = require('express');
const router = express.Router();
const interventionController = require('../controllers/InterventionController');

router.post('/', interventionController.createIntervention);
router.get('/', interventionController.getAllInterventions);
router.get('/intervention/:query', interventionController.searchIntervention);
router.delete('/delete/:id', interventionController.deleteIntervention);

module.exports = router;
