const authService = require('../services/auth.service');
const catchAsync = require('../utils/catchAsync');
const formatResponse = require('../utils/formatResponse');

// register
const register = catchAsync(async (req, res) => {
  const user = await authService.register(req.body);
  res.status(210).json(formatResponse(true, 'Rider registered successfully.', user));
});

// login
const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);

  res.cookie('refreshToken', result.tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.status(200).json(formatResponse(true, 'Login successful.', result));
});

// refresh token
const refresh = catchAsync(async (req, res) => {
  const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
  const result = await authService.refresh(refreshToken);
  res.status(200).json(formatResponse(true, 'Access token refreshed successfully.', result));
});

// logout
const logout = catchAsync(async (req, res) => {
  res.clearCookie('refreshToken');
  res.status(200).json(formatResponse(true, 'Logout successful.'));
});

// firebase sync
const firebaseSync = catchAsync(async (req, res) => {
  const { firebaseToken } = req.body;
  const userId = req.user.id;
  const user = await authService.firebaseSync(userId, firebaseToken);
  res.status(200).json(formatResponse(true, 'Firebase authentication synchronized successfully.', user));
});

module.exports = {
  register,
  login,
  refresh,
  logout,
  firebaseSync,
};
