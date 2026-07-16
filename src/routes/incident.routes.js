const express = require('express');
const incidentController = require('../controllers/incident.controller');
const incidentValidator = require('../validators/incident.validator');
const validate = require('../middleware/validation.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { sosLimiter } = require('../middleware/rateLimit.middleware');

const router = express.Router();

router.use(authenticate); 

router.post('/', sosLimiter, validate(incidentValidator.createIncident), incidentController.createIncident);
router.patch('/:id/confirm', validate(incidentValidator.confirmIncident), incidentController.confirm);
// STUB: Future Admin/Fleet Feature
// router.patch('/:id/resolve', incidentController.resolve);
router.get('/', incidentController.getIncidents);

module.exports = router;
