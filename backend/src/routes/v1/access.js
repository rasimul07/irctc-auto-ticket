const router = require('express').Router();
const clientContext = require('../../middleware/clientContext');
const { sendSuccess, sendError, asyncHandler } = require('../../utils/http');
const logger = require('../../utils/logger');
const accessService = require('../../services/accessService');

router.use(clientContext);

function logAccessError(route, req, err, extra = {}) {
  logger.error('access', `${route} failed`, {
    clientType: req.clientType,
    deviceId: extra.deviceId,
    email: extra.email,
    usageKey: extra.usageKey,
    code: err.code,
    message: err.message,
    stack: err.stack
  });
}

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const deviceId = String(req.body?.deviceId || '').trim();
    if (!deviceId) {
      return sendError(res, 'INVALID_DEVICE_ID', 'deviceId is required', 400);
    }

    try {
      const status = await accessService.registerDevice(req.clientType, deviceId);
      return sendSuccess(res, status, 201);
    } catch (err) {
      logAccessError('register', req, err, { deviceId });
      throw err;
    }
  })
);

router.get(
  '/status',
  asyncHandler(async (req, res) => {
    const deviceId = String(req.query.deviceId || '').trim();
    if (!deviceId) {
      return sendError(res, 'INVALID_DEVICE_ID', 'deviceId query param is required', 400);
    }

    try {
      let status;
      try {
        status = await accessService.resolveAccessStatus(req.clientType, deviceId);
      } catch (err) {
        if (err.code !== 'DEVICE_NOT_FOUND') throw err;
        status = await accessService.registerDevice(req.clientType, deviceId);
      }
      return sendSuccess(res, status);
    } catch (err) {
      logAccessError('status', req, err, { deviceId });
      throw err;
    }
  })
);

router.post(
  '/link',
  asyncHandler(async (req, res) => {
    const deviceId = String(req.body?.deviceId || '').trim();
    const email = String(req.body?.email || '').trim();
    if (!deviceId) {
      return sendError(res, 'INVALID_DEVICE_ID', 'deviceId is required', 400);
    }
    if (!email) {
      return sendError(res, 'INVALID_EMAIL', 'email is required', 400);
    }

    try {
      const status = await accessService.linkEmail(req.clientType, deviceId, email);
      if (!status.allowed) {
        logger.warn('access', 'link completed without active access', {
          clientType: req.clientType,
          deviceId,
          email,
          tier: status.tier,
          plan: status.plan
        });
      }
      return sendSuccess(res, status);
    } catch (err) {
      logAccessError('link', req, err, { deviceId, email });
      throw err;
    }
  })
);

router.post(
  '/consume-token',
  asyncHandler(async (req, res) => {
    const deviceId = String(req.body?.deviceId || '').trim();
    const usageKey = String(req.body?.usageKey || '').trim();
    if (!deviceId) {
      return sendError(res, 'INVALID_DEVICE_ID', 'deviceId is required', 400);
    }
    if (!usageKey) {
      return sendError(res, 'INVALID_USAGE_KEY', 'usageKey is required', 400);
    }

    try {
      const status = await accessService.consumeToken(req.clientType, deviceId, usageKey);
      return sendSuccess(res, status);
    } catch (err) {
      logAccessError('consume-token', req, err, { deviceId, usageKey });
      throw err;
    }
  })
);

module.exports = router;
