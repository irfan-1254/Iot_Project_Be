const express = require('express');
const helmetController = require('../controllers/helmet.controller');
const helmetValidator = require('../validators/helmet.validator');
const validate = require('../middleware/validation.middleware');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/pair', authenticate, validate(helmetValidator.pair), helmetController.pair);
router.patch('/:id/telemetry', authenticate, validate(helmetValidator.telemetry), helmetController.telemetry);
router.get('/:id', authenticate, helmetController.getHelmet);
router.delete('/:id/unpair', authenticate, helmetController.unpair);

module.exports = router;
