const { sendError } = require('../utils/http');

function notFoundHandler(_req, res) {
  sendError(res, 'NOT_FOUND', 'Route not found', 404);
}

function errorHandler(err, _req, res, _next) {
  console.error('[api] error', err);
  const status = err.status || 500;
  sendError(res, err.code || 'INTERNAL_ERROR', err.message || 'Internal server error', status);
}

module.exports = { notFoundHandler, errorHandler };
