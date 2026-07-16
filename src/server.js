const http = require('http');
const app = require('./app');
const env = require('./config/env');
const prisma = require('./config/prisma');
const logger = require('./utils/logger');
const sockets = require('./sockets/socket');

const server = http.createServer(app);

// Initialize Socket.io
sockets.init(server);

// Start listening
server.listen(env.PORT, () => {
  console.log(`Server running on port:"https://localhost:${env.PORT}"`);
});

// Uncaught Exceptions handler
process.on('uncaughtException', (error) => {
  logger.error('💥 Uncaught Exception! Shutting down...', error);
  gracefulShutdown(1);
});

// Unhandled Rejections handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error('💥 Unhandled Rejection at: %o, reason: %o. Shutting down...', promise, reason);
  gracefulShutdown(1);
});

// Handle termination signals
process.on('SIGTERM', () => {
  logger.info('👋 SIGTERM received. Shutting down gracefully...');
  gracefulShutdown(0);
});

process.on('SIGINT', () => {
  logger.info('👋 SIGINT received. Shutting down gracefully...');
  gracefulShutdown(0);
});

/**
 * Perform clean up and shutdown operations
 * @param {number} code - Exit code (0 for success, 1 for failure)
 */
function gracefulShutdown(code) {
  server.close(async () => {
    logger.info('🛑 HTTP server closed.');

    try {
      // Disconnect database client connection
      await prisma.$disconnect();
      logger.info('🛑 Prisma database connection disconnected.');
      process.exit(code);
    } catch (err) {
      logger.error('Error during database disconnection:', err);
      process.exit(1);
    }
  });

  // Force close after 10 seconds if graceful shutdown fails
  setTimeout(() => {
    logger.error('Forcing shutdown due to timeout.');
    process.exit(1);
  }, 10000);
}
