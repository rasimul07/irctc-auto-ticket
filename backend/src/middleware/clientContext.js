const config = require('../config');
const { sendError } = require('../utils/http');

function clientContext(req, res, next) {
  const clientType = String(req.header('x-client-type') || '').trim().toLowerCase();

  if (!clientType) {
    return sendError(res, 'MISSING_CLIENT_TYPE', 'X-Client-Type header is required', 400);
  }

  if (!config.allowedClientTypes.includes(clientType)) {
    return sendError(res, 'INVALID_CLIENT_TYPE', `Unsupported client type: ${clientType}`, 400);
  }

  req.clientType = clientType;
  return next();
}

module.exports = clientContext;
