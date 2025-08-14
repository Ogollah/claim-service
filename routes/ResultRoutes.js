const express = require('express');
const router = express.Router();
const ResultController = require('../controllers/ResultController');

router.get('/', ResultController.getAll);
router.get('/:id', ResultController.getOne);
router.post('/', ResultController.create);
router.put('/:id', ResultController.update);
router.delete('/:id', ResultController.remove);

module.exports = router;
