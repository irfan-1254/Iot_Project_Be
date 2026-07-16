const prisma = require('../config/prisma');
const { verifyAccessToken } = require('../utils/generateToken');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');

/**
 * Middleware to authenticate requests via JWT access tokens.
 */
const authenticate = catchAsync(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new ApiError(401, 'Authentication required. Please log in.');
  }

  try {
    const decoded = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        firebaseUid: true,
      },
    });

    if (!user) {
      throw new ApiError(401, 'The user belonging to this token no longer exists.');
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    if (error.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'Token expired. Please refresh your session.'));
    }
    return next(new ApiError(401, 'Invalid or corrupted access token.'));
  }
});


module.exports = {
  authenticate,
};
