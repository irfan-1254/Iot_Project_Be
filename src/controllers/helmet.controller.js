const helmetService = require('../services/helmet.service');
const catchAsync = require('../utils/catchAsync');
const formatResponse = require('../utils/formatResponse');

// pair helmet
const pair = catchAsync(async (req, res) => {
  const { serialNumber, bleMacAddress } = req.body;
  const userId = req.user.id;
  const helmet = await helmetService.pairHelmet(userId, serialNumber, bleMacAddress);
  res.status(200).json(formatResponse(true, 'Helmet paired successfully.', helmet));
});

// telemetry 
const telemetry = catchAsync(async (req, res) => {
  const helmetId = req.params.id;
  const userId = req.user.id;
  const result = await helmetService.ingestTelemetry(helmetId, userId, req.body);
  res.status(200).json(formatResponse(true, 'Telemetry synced successfully.', result.helmet));
});

// get helmet
const getHelmet = catchAsync(async (req, res) => {
  const helmet = await helmetService.getHelmetDetails(req.params.id);
  res.status(200).json(formatResponse(true, 'Helmet details retrieved successfully.', helmet));
});

// unpair helmet
const unpair = catchAsync(async (req, res) => {
  const helmetId = req.params.id;
  const userId = req.user.id;
  const helmet = await helmetService.unpairHelmet(helmetId, userId);
  res.status(200).json(formatResponse(true, 'Helmet unpaired successfully.', helmet));
});

module.exports = {
  pair,
  telemetry,
  getHelmet,
  unpair,
};
