/**
 * Utility function to format API responses consistently.
 * @param {boolean} success - Indicates success of the request
 * @param {string} message - User-friendly message
 * @param {any} data - Core payload
 * @param {object} [meta] - Metadata (e.g. pagination stats)
 * @returns {object} Formatted response object
 */
const formatResponse = (success, message, data = null, meta = null) => {
  const response = {
    success,
    message,
  };

  if (data !== null) {
    response.data = data;
  }

  if (meta !== null) {
    response.meta = meta;
  }

  return response;
};

module.exports = formatResponse;
