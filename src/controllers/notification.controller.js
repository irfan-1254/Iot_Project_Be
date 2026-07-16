const notificationService = require('../services/notification.service');
const catchAsync = require('../utils/catchAsync');
const formatResponse = require('../utils/formatResponse');

// get notifications
const getNotifications = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const notifications = await notificationService.getUserNotifications(userId);
  res.status(200).json(formatResponse(true, 'Notifications log retrieved successfully.', notifications));
});

module.exports = {
  getNotifications,
};
