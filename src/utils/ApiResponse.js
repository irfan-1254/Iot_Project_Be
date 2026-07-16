/**
 * Custom response class for API responses
 * @class ApiResponse
 */
class ApiResponse {
  /**
   * Create an ApiResponse
   * @param {number} statusCode - HTTP status code
   * @param {any} data - Response payload
   * @param {string} [message='Success'] - Response message
   */
  constructor(statusCode, data, message = 'Success') {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }
}

module.exports = ApiResponse;
