const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/generateToken');
const firebaseService = require('./firebase.service');

/**
 * Register a new user
 * @param {object} userData - User registration details
 */
const register = async (userData) => {
  const { name, email, phone, password } = userData;

  // Check if email or phone already exists
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { phone }],
    },
  });

  if (existingUser) {
    if (existingUser.email === email) {
      throw new ApiError(400, 'User with this email already exists.');
    }
    if (existingUser.phone === phone) {
      throw new ApiError(400, 'User with this phone number already exists.');
    }
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Create user and initialize empty analytics snapshot in a transaction
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name,
        email,
        phone,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,

        createdAt: true,
      },
    });

    await tx.analyticsSnapshot.create({
      data: {
        userId: user.id,
      },
    });

    return user;
  });

  return result;
};

/**
 * Login a user using email & password
 * @param {string} email
 * @param {string} password
 */
const login = async (email, password) => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  // Compare passwords
  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  // Generate tokens
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,

      firebaseUid: user.firebaseUid,
    },
    tokens: {
      accessToken,
      refreshToken,
    },
  };
};

/**
 * Refresh Access Token using a valid Refresh Token
 * @param {string} refreshToken
 */
const refresh = async (refreshToken) => {
  try {
    const decoded = verifyRefreshToken(refreshToken);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      throw new ApiError(401, 'Invalid session. User not found.');
    }

    const accessToken = generateAccessToken(user);
    return { accessToken };
  } catch (error) {
    throw new ApiError(401, 'Session expired or invalid refresh token. Please login again.');
  }
};

/**
 * Sync user account with their mobile app Firebase UID
 * @param {string} userId - Backend user ID
 * @param {string} firebaseToken - App-side Firebase ID token
 */
const firebaseSync = async (userId, firebaseToken) => {
  // Verify Firebase ID Token to get Firebase UID
  const firebaseUid = await firebaseService.verifyIdToken(firebaseToken);

  // Check if this Firebase UID is already linked to another account
  const linkedUser = await prisma.user.findUnique({
    where: { firebaseUid },
  });

  if (linkedUser && linkedUser.id !== userId) {
    throw new ApiError(400, 'This Firebase account is already linked to another rider.');
  }

  // Update user with firebaseUid
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { firebaseUid },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,

      firebaseUid: true,
    },
  });

  return updatedUser;
};

module.exports = {
  register,
  login,
  refresh,
  firebaseSync,
};
