const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');

/**
 * Get User Profile by ID
 * @param {string} userId
 */
const getUserProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,

      firebaseUid: true,
      createdAt: true,
      helmets: true,
    },
  });

  if (!user) {
    throw new ApiError(404, 'User not found.');
  }

  return user;
};

/**
 * Update User Profile details
 * @param {string} userId
 * @param {object} updateData
 */
const updateUserProfile = async (userId, updateData) => {
  const { name, email, phone, password } = updateData;

  // Build the dynamic data object
  const data = {};
  if (name) data.name = name;
  
  if (email) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== userId) {
      throw new ApiError(400, 'Email already in use.');
    }
    data.email = email;
  }

  if (phone) {
    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing && existing.id !== userId) {
      throw new ApiError(400, 'Phone number already in use.');
    }
    data.phone = phone;
  }

  if (password) {
    data.passwordHash = await bcrypt.hash(password, 10);
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,

      firebaseUid: true,
      updatedAt: true,
    },
  });

  return updatedUser;
};

/**
 * Delete User profile and clean up associated items
 * @param {string} userId
 */
const deleteUserProfile = async (userId) => {
  // Cascading deletes will remove emergency contacts and rides automatically
  // Helmets will set ownerId to null based on relation onDelete: SetNull config
  return await prisma.user.delete({
    where: { id: userId },
  });
};

/**
 * List all users with query filters (Admin/Fleet Manager view)
 * @param {object} query
 */
const listUsers = async (query = {}) => {
  const { search, limit = 50, page = 1 } = query;
  const skip = (page - 1) * limit;

  const where = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,

        createdAt: true,
        helmets: {
          select: {
            id: true,
            serialNumber: true,
            batteryLevel: true,
            pairingStatus: true,
          },
        },
      },
      skip: parseInt(skip),
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
    },
  };
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  deleteUserProfile,
  listUsers,
};
