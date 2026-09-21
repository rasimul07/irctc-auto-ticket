const { sendError } = require('../utils/http');

function notFoundHandler(_req, res) {
  sendError(res, 'NOT_FOUND', 'Route not found', 404);
}

const NETWORK_CODES = new Set(['ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT', 'ECONNRESET', 'EAI_AGAIN']);

function errorHandler(err, req, res, _next) {
  console.error('[api] error', {
    method: req.method,
    path: req.originalUrl,
    code: err.code,
    message: err.message,
    stack: err.stack
  });

  if (NETWORK_CODES.has(err.code) || err.syscall === 'getaddrinfo') {
    return sendError(
      res,
      'SERVICE_UNAVAILABLE',
      'Service temporarily unavailable. Check your internet connection.',
      503
    );
  }

  const status = err.status || 500;
  sendError(res, err.code || 'INTERNAL_ERROR', err.message || 'Internal server error', status);
}

module.exports = { notFoundHandler, errorHandler };
