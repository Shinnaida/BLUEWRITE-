// BLUEWRITE — Global Error Handlers
// Provides a global 404 handler and a global error handler.

const { error } = require('../utils/response');

/**
 * Global 404 handler for unmatched routes.
 */
function notFoundHandler(req, res) {
  return error(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
}

/**
 * Global error handler for uncaught errors.
 */
function errorHandler(err, req, res, next) {
  // eslint-disable-next-line no-console
  console.error(`[${new Date().toISOString()}] Error:`, err.message);

  return error(res, 'Internal server error', 500);
}

module.exports = {
  notFoundHandler,
  errorHandler,
};