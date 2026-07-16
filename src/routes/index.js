const express = require('express');
const authRouter = require('./auth.routes');
const userRouter = require('./user.routes');
const helmetRouter = require('./helmet.routes');
const contactRouter = require('./contact.routes');
const incidentRouter = require('./incident.routes');
const notificationRouter = require('./notification.routes');
const analyticsRouter = require('./analytics.routes');

const router = express.Router();

/**
 * Route registry index. Mounts specific resource routers.
 */
router.use('/auth', authRouter);
router.use('/users', userRouter);
router.use('/helmets', helmetRouter);
router.use('/contacts', contactRouter);
router.use('/incidents', incidentRouter);
router.use('/notifications', notificationRouter);
router.use('/analytics', analyticsRouter);

module.exports = router;
