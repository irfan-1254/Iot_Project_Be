const incidentService = require('../services/incident.service');
const catchAsync = require('../utils/catchAsync');
const formatResponse = require('../utils/formatResponse');


// create incident
const createIncident = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const incident = await incidentService.createIncident(userId, req.body);
  res.status(201).json(formatResponse(true, 'Incident reported successfully.', incident));
});


// confirm incident
const confirm = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const incidentId = req.params.id;
  const { status } = req.body;
  const incident = await incidentService.confirmOrCancelIncident(userId, incidentId, status);
  res.status(200).json(formatResponse(true, `Incident confirmation status updated to: ${status}.`, incident));
});


// resolve incident
const resolve = catchAsync(async (req, res) => {
  const incidentId = req.params.id;
  const incident = await incidentService.resolveIncident(incidentId);
  res.status(200).json(formatResponse(true, 'Incident marked as resolved.', incident));
});


// get all incidents
const getIncidents = catchAsync(async (req, res) => {
  const query = { ...req.query };
  query.userId = req.user.id;
  const result = await incidentService.listIncidents(query);
  res.status(200).json(formatResponse(true, 'Incidents logs retrieved successfully.', result.incidents, result.pagination));
});

module.exports = {
  createIncident,
  confirm,
  resolve,
  getIncidents,
};
