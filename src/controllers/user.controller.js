const userService = require('../services/user.service');
const catchAsync = require('../utils/catchAsync');
const formatResponse = require('../utils/formatResponse');

// get me 
const getMe = catchAsync(async (req, res) => {
  const profile = await userService.getUserProfile(req.user.id);
  res.status(200).json(formatResponse(true, 'User profile fetched successfully.', profile));
});

// update me
const updateMe = catchAsync(async (req, res) => {
  const updated = await userService.updateUserProfile(req.user.id, req.body);
  res.status(200).json(formatResponse(true, 'User profile updated successfully.', updated));
});

// delete me
const deleteMe = catchAsync(async (req, res) => {
  await userService.deleteUserProfile(req.user.id);
  res.clearCookie('refreshToken');
  res.status(200).json(formatResponse(true, 'User account deleted successfully.'));
});

// get all users
const getUsers = catchAsync(async (req, res) => {
  const result = await userService.listUsers(req.query);
  res.status(200).json(formatResponse(true, 'Users list fetched successfully.', result.users, result.pagination));
});

module.exports = {
  getMe,
  updateMe,
  deleteMe,
  getUsers,
};
