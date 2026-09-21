const crypto = require('crypto');
const config = require('../../config');
const { sendSuccess, sendError, asyncHandler } = require('../../utils/http');
const logger = require('../../utils/logger');
const accessService = require('../../services/accessService');

const router = require('express').Router();

function verifyBmcSignature(rawBody, signatureHeader) {
  if (!config.bmcWebhookSecret) return true;
  if (!signatureHeader) return false;

  const expected = crypto
    .createHmac('sha256', config.bmcWebhookSecret)
    .update(rawBody)
    .digest('hex');

  const provided = String(signatureHeader).replace(/^sha256=/i, '').trim();
  if (expected.length !== provided.length) return false;

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
}

function extractWebhookContext(payload = {}) {
  return {
    eventId: payload?.event_id || payload?.id || payload?.data?.id || null,
    type: payload?.type || null,
    email:
      payload?.data?.supporter_email ||
      payload?.data?.payer_email ||
      payload?.data?.email ||
      payload?.supporter_email ||
      null
  };
}

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const payload = req.body || {};
    const context = extractWebhookContext(payload);
    const rawBody = req.rawBody || JSON.stringify(payload);
    const signature =
      req.header('x-signature-sha256') ||
      req.header('x-bmc-signature') ||
      req.header('x-webhook-signature');

    if (!verifyBmcSignature(rawBody, signature)) {
      logger.error('bmc', 'webhook signature verification failed', {
        hasSignature: Boolean(signature),
        bodyLength: rawBody.length,
        eventId: context.eventId,
        type: context.type
      });
      return sendError(res, 'INVALID_SIGNATURE', 'Webhook signature verification failed', 401);
    }

    try {
      const result = await accessService.processBmcWebhook(payload);

      if (result.duplicate) {
        logger.warn('bmc', 'duplicate webhook event', {
          eventId: result.eventId
        });
      } else if (result.processed === false) {
        logger.warn('bmc', 'webhook not processed', {
          eventId: result.eventId,
          type: result.type || context.type,
          reason: result.reason,
          email: result.email || context.email
        });
      }

      return sendSuccess(res, result);
    } catch (err) {
      logger.error('bmc', 'webhook processing failed', {
        eventId: context.eventId,
        type: context.type,
        code: err.code,
        message: err.message,
        stack: err.stack
      });
      throw err;
    }
  })
);

module.exports = router;
