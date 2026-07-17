/**
 * Wraps async functions to catch errors and pass them to next middleware
 * @param {Function} fn - Async controller function
 * @returns {Function} Express middleware functions
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => next(err));
  };
};

module.exports = catchAsync;
