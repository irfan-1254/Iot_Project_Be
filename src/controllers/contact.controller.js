const contactService = require('../services/contact.service');
const catchAsync = require('../utils/catchAsync');
const formatResponse = require('../utils/formatResponse');

// get emergency contacts for user
const getContacts = catchAsync(async (req, res) => {
  const contacts = await contactService.getContacts(req.user.id);
  res.status(200).json(formatResponse(true, 'Emergency contacts retrieved successfully.', contacts));
});


// add emergency contact for user
const createContact = catchAsync(async (req, res) => {
  const contact = await contactService.createContact(req.user.id, req.body);
  res.status(201).json(formatResponse(true, 'Emergency contact added successfully.', contact));
});


// update emergency contact for user
const updateContact = catchAsync(async (req, res) => {
  const contact = await contactService.updateContact(req.user.id, req.params.id, req.body);
  res.status(200).json(formatResponse(true, 'Emergency contact updated successfully.', contact));
});


// delete emergency contact for user
const deleteContact = catchAsync(async (req, res) => {
  await contactService.deleteContact(req.user.id, req.params.id);
  res.status(200).json(formatResponse(true, 'Emergency contact deleted successfully.'));
});

module.exports = {
  getContacts,
  createContact,
  updateContact,
  deleteContact,
};
