const ApiError = require('../utils/ApiError');

/**
 * Express middleware to validate request payload (body, query, params) against a Zod schema.
 * @param {object} schema - Zod schema definition
 * @returns {Function} Express middleware function
 */
const validate = (schema) => (req, res, next) => {
  const validSchema = {};

  if (schema.body) validSchema.body = req.body;
  if (schema.query) validSchema.query = req.query;
  if (schema.params) validSchema.params = req.params;

  const parsed = schema.safeParse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  if (!parsed.success) {
    const errorDetails = parsed.error.issues.map((issue) => ({
      field: issue.path.slice(1).join('.'),
      message: issue.message,
    }));

    return next(new ApiError(400, 'Validation Error', errorDetails));
  }

  if (parsed.data.body) req.body = parsed.data.body;
  if (parsed.data.query) req.query = parsed.data.query;
  if (parsed.data.params) req.params = parsed.data.params;

  return next();
};

module.exports = validate;
