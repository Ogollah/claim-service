const express = require('express');
const router = express.Router();
const providerController = require('../controllers/ProviderController');

router.post('/', providerController.createProvider);
router.get('/', providerController.getAllProviders);
router.get('/provider/:query', providerController.searchProvider);
router.delete('/delete/:id', providerController.deleteProvider);
router.get('/:f_id',providerController.getProviderByFID);
module.exports = router;