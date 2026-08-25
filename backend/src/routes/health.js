const { ping } = require('../db/pool');
const { sendSuccess, sendError, asyncHandler } = require('../utils/http');

const router = require('express').Router();

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    try {
      await ping();
      return sendSuccess(res, { db: 'connected' });
    } catch (_err) {
      return sendError(res, 'DB_UNAVAILABLE', 'Database connection failed', 503);
    }
  })
);

module.exports = router;
