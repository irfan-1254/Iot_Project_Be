const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');

/**
 * Get all emergency contacts for a user
 */
const getContacts = async (userId) => {
  return await prisma.emergencyContact.findMany({
    where: { userId },
    orderBy: { priority: 'asc' },
  });
};

/**
 * Add an emergency contact for a user
 */
const createContact = async (userId, contactData) => {
  const { name, phone, relationship, priority } = contactData;

  // Enforce a maximum of 5 emergency contacts per user
  const count = await prisma.emergencyContact.count({
    where: { userId },
  });

  if (count >= 5) {
    throw new ApiError(400, 'You can add a maximum of 5 emergency contacts.');
  }

  return await prisma.emergencyContact.create({
    data: {
      userId,
      name,
      phone,
      relationship,
      priority,
    },
  });
};

/**
 * Update an emergency contact
 */
const updateContact = async (userId, contactId, contactData) => {
  const contact = await prisma.emergencyContact.findFirst({
    where: { id: contactId, userId },
  });

  if (!contact) {
    throw new ApiError(404, 'Emergency contact not found.');
  }

  return await prisma.emergencyContact.update({
    where: { id: contactId },
    data: contactData,
  });
};

/**
 * Delete an emergency contact
 */
const deleteContact = async (userId, contactId) => {
  const contact = await prisma.emergencyContact.findFirst({
    where: { id: contactId, userId },
  });

  if (!contact) {
    throw new ApiError(404, 'Emergency contact not found.');
  }

  return await prisma.emergencyContact.delete({
    where: { id: contactId },
  });
};

module.exports = {
  getContacts,
  createContact,
  updateContact,
  deleteContact,
};
