/**
 * Custom error class for API errors
 * @class ApiError
 * @extends Error
 */
class ApiError extends Error {
  /**
   * Create an ApiError
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Error message
   * @param {Array} [errors=[]] - Array of specific error details (e.g. validation errors)
   * @param {string} [stack=''] - Error stack trace
   */
  constructor(statusCode, message, errors = [], stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.success = false;
    this.isOperational = true; // Indicates if this is a trusted/operational error

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

module.exports = ApiError;
