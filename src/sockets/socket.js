const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const logger = require('../utils/logger');


let io = null;

/**
 * Initialize Socket.IO server
 * @param {object} server - HTTP Server instance
 */
const init = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*', 
      methods: ['GET', 'POST'],
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;

    if (!token) {
      return next(new Error('Authentication error. No token provided.'));
    }

    try {
      const cleanToken = token.startsWith('Bearer ') ? token.split(' ')[1] : token;
      const decoded = jwt.verify(cleanToken, env.JWT_ACCESS_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      logger.error('Socket authentication failed: %o', err);
      return next(new Error('Authentication error. Invalid token.'));
    }
  });

  io.on('connection', (socket) => {
    const { id: userId } = socket.user;
    logger.info(`🔌 Socket client connected: User ID=${userId}, Socket ID=${socket.id}`);

    socket.join(`user_${userId}`);
    logger.debug(`Socket ${socket.id} joined room: user_${userId}`);


    socket.on('disconnect', () => {
      logger.info(`🔌 Socket client disconnected: Socket ID=${socket.id}`);
    });
  });

  return io;
};

/**
 * Emit real-time telemetry to subscribed rooms (user room and general fleet room)
 * @param {string} userId - ID of the rider
 * @param {object} telemetry - Telemetry metrics data
 */
const emitTelemetry = (userId, telemetry) => {
  if (!io) {
    logger.warn('[Socket.IO] Cannot emit telemetry. Socket server is not initialized.');
    return;
  }

  io.to(`user_${userId}`).emit('telemetry', telemetry);

  io.to('fleet').emit('fleet_telemetry', {
    userId,
    ...telemetry,
  });

  logger.debug(`[Socket.IO] Broadcasted telemetry for user ${userId} to user_${userId} and fleet rooms`);
};

module.exports = {
  init,
  emitTelemetry,
};
