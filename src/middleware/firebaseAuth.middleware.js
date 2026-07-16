const { verifyIdToken } = require('../services/firebase.service');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const prisma = require('../config/prisma');

/**
 * Middleware to authenticate requests via Firebase ID tokens.
 */
const authenticateFirebase = catchAsync(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new ApiError(401, 'Authentication required. Please provide a Firebase ID token.');
  }

  try {
    const firebaseUid = await verifyIdToken(token);

    const user = await prisma.user.findFirst({
      where: { firebaseUid },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,

        firebaseUid: true,
      },
    });

    req.firebaseUid = firebaseUid;
    if (user) {
      req.user = user;
    }

    next();
  } catch (error) {
    return next(new ApiError(401, 'Invalid or expired Firebase ID token.'));
  }
});

module.exports = {
  authenticateFirebase,
};
