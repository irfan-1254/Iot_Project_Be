const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const env = require('../config/env');

/**
 * Centered error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = err;

  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || (error.name === 'ValidationError' ? 400 : 500);
    const message = error.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, error.errors || [], err.stack);
  }

  const { statusCode, message, errors, stack } = error;

  const response = {
    success: false,
    message,
    ...(errors && errors.length > 0 && { errors }),
    ...(env.NODE_ENV === 'development' && { stack }),
  };

  if (statusCode >= 500) {
    logger.error(`[Error Middleware] 500 Internal Error: ${message} - Stack: ${stack}`);
  } else {
    logger.warn(`[Error Middleware] ${statusCode} Client Error: ${message} - Errors: ${JSON.stringify(errors)}`);
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
