const express = require('express');
const analyticsController = require('../controllers/analytics.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticate); 

router.get('/rides/:userId', analyticsController.getRidesAnalytics);
// STUB: Future Fleet Dashboard Features
// router.get('/fleet', analyticsController.getFleetAnalytics);
// router.get('/incidents/summary', analyticsController.getIncidentsSummary);

module.exports = router;
