const router = require('express').Router();
const clientContext = require('../../middleware/clientContext');
const { sendSuccess, sendError, asyncHandler } = require('../../utils/http');
const accessService = require('../../services/accessService');

router.use(clientContext);

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const deviceId = String(req.body?.deviceId || '').trim();
    if (!deviceId) {
      return sendError(res, 'INVALID_DEVICE_ID', 'deviceId is required', 400);
    }

    const status = await accessService.registerDevice(req.clientType, deviceId);
    return sendSuccess(res, status, 201);
  })
);

router.get(
  '/status',
  asyncHandler(async (req, res) => {
    const deviceId = String(req.query.deviceId || '').trim();
    if (!deviceId) {
      return sendError(res, 'INVALID_DEVICE_ID', 'deviceId query param is required', 400);
    }

    const status = await accessService.resolveAccessStatus(req.clientType, deviceId);
    return sendSuccess(res, status);
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

    const status = await accessService.linkEmail(req.clientType, deviceId, email);
    return sendSuccess(res, status);
  })
);

module.exports = router;
