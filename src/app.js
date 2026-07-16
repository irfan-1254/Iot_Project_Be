const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const routes = require('./routes');
const { apiLimiter } = require('./middleware/rateLimit.middleware');
const errorHandler = require('./middleware/error.middleware');
const ApiError = require('./utils/ApiError');
const logger = require('./utils/logger');
const serveSwagger = require('./docs/swagger');

const app = express();

// Set HTTP Security headers
app.use(helmet());

// Enable CORS
app.use(cors({
  origin: '*', // Adjust in production to allow only trusted origins
  credentials: true,
}));

// Request body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser middleware
app.use(cookieParser());

// Request logger middleware
app.use((req, res, next) => {
  logger.info(`[HTTP] ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
  next();
});

// Apply rate limiting to all standard API routes
app.use('/api', apiLimiter);

// Mount API routes
app.use('/api', routes);

// Serve Swagger Documentation
serveSwagger(app);

// Serve static uploaded files (e.g. profile images)
app.use('/uploads', express.static('uploads'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// Capture undefined routes and forward to error handler
app.use((req, res, next) => {
  next(new ApiError(404, `Endpoint not found: ${req.method} ${req.originalUrl}`));
});

// Centralized error handling middleware
app.use(errorHandler);

module.exports = app;
