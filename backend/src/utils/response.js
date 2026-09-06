// BLUEWRITE — Standardized API Response Helpers
// Provides consistent JSON response formatting for all endpoints.

/**
 * Send a success response.
 */
function success(res, data = null, message = '', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

/**
 * Send an error response.
 */
function error(res, message = 'An error occurred', statusCode = 500, errors = null) {
  const body = {
    success: false,
    message,
  };

  if (errors) {
    body.errors = errors;
  }

  return res.status(statusCode).json(body);
}

module.exports = {
  success,
  error,
};