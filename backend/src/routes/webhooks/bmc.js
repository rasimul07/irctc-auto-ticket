const crypto = require('crypto');
const config = require('../../config');
const { sendSuccess, sendError, asyncHandler } = require('../../utils/http');
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

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const rawBody = req.rawBody || JSON.stringify(req.body || {});
    const signature =
      req.header('x-signature-sha256') ||
      req.header('x-bmc-signature') ||
      req.header('x-webhook-signature');

    if (!verifyBmcSignature(rawBody, signature)) {
      return sendError(res, 'INVALID_SIGNATURE', 'Webhook signature verification failed', 401);
    }

    const result = await accessService.processBmcWebhook(req.body || {});
    return sendSuccess(res, result);
  })
);

module.exports = router;
