const config = require('../config');
const { query } = require('../db/pool');

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isLicenseActive(license) {
  if (!license || !license.active) return false;
  if (!license.expires_at) return true;
  return new Date(license.expires_at) > new Date();
}

async function getDevice(clientType, deviceId) {
  const result = await query(
    `SELECT id, client_type, device_id, email, trial_started_at, created_at, updated_at
     FROM devices
     WHERE client_type = $1 AND device_id = $2`,
    [clientType, deviceId]
  );
  return result.rows[0] || null;
}

async function getLicenseByEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const result = await query(
    `SELECT id, email, plan, bmc_membership_id, expires_at, active, created_at, updated_at
     FROM licenses
     WHERE email = $1`,
    [normalized]
  );
  return result.rows[0] || null;
}

function buildStatusFromDevice(device) {
  const trialStartedAt = new Date(device.trial_started_at);
  const trialExpiresAt = addDays(trialStartedAt, config.freeTrialDays);
  const now = new Date();

  return {
    allowed: now < trialExpiresAt,
    tier: now < trialExpiresAt ? 'trial' : 'expired',
    email: device.email || null,
    trialStartedAt: trialStartedAt.toISOString(),
    expiresAt: trialExpiresAt.toISOString(),
    trialDays: config.freeTrialDays
  };
}

async function buildPaidStatus(email) {
  const license = await getLicenseByEmail(email);
  if (!isLicenseActive(license)) return null;

  return {
    allowed: true,
    tier: 'paid',
    email: license.email,
    plan: license.plan,
    expiresAt: license.expires_at ? new Date(license.expires_at).toISOString() : null,
    trialDays: config.freeTrialDays
  };
}

async function resolveAccessStatus(clientType, deviceId) {
  const device = await getDevice(clientType, deviceId);
  if (!device) {
    const err = new Error('Device not registered');
    err.code = 'DEVICE_NOT_FOUND';
    err.status = 404;
    throw err;
  }

  if (device.email) {
    const paidStatus = await buildPaidStatus(device.email);
    if (paidStatus) return paidStatus;
  }

  return buildStatusFromDevice(device);
}

async function registerDevice(clientType, deviceId) {
  const existing = await getDevice(clientType, deviceId);
  if (existing) {
    return resolveAccessStatus(clientType, deviceId);
  }

  await query(
    `INSERT INTO devices (client_type, device_id, trial_started_at)
     VALUES ($1, $2, NOW())`,
    [clientType, deviceId]
  );

  return resolveAccessStatus(clientType, deviceId);
}

async function linkEmail(clientType, deviceId, email) {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    const err = new Error('Valid email is required');
    err.code = 'INVALID_EMAIL';
    err.status = 400;
    throw err;
  }

  const device = await getDevice(clientType, deviceId);
  if (!device) {
    const err = new Error('Device not registered');
    err.code = 'DEVICE_NOT_FOUND';
    err.status = 404;
    throw err;
  }

  await query(
    `UPDATE devices
     SET email = $1, updated_at = NOW()
     WHERE client_type = $2 AND device_id = $3`,
    [normalized, clientType, deviceId]
  );

  return resolveAccessStatus(clientType, deviceId);
}

async function upsertLicense({ email, plan = 'paid', bmcMembershipId = null, expiresAt = null }) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const result = await query(
    `INSERT INTO licenses (email, plan, bmc_membership_id, expires_at, active, updated_at)
     VALUES ($1, $2, $3, $4, TRUE, NOW())
     ON CONFLICT (email)
     DO UPDATE SET
       plan = EXCLUDED.plan,
       bmc_membership_id = COALESCE(EXCLUDED.bmc_membership_id, licenses.bmc_membership_id),
       expires_at = EXCLUDED.expires_at,
       active = TRUE,
       updated_at = NOW()
     RETURNING *`,
    [normalized, plan, bmcMembershipId, expiresAt]
  );

  return result.rows[0];
}

function extractBmcEmail(payload) {
  return (
    payload?.data?.payer_email ||
    payload?.data?.supporter_email ||
    payload?.data?.email ||
    payload?.payer_email ||
    payload?.supporter_email ||
    payload?.email ||
    null
  );
}

function extractBmcEventId(payload) {
  return String(
    payload?.id ||
      payload?.event_id ||
      payload?.data?.id ||
      payload?.data?.payment_id ||
      `${Date.now()}-${Math.random()}`
  );
}

function extractBmcMembershipId(payload) {
  return (
    payload?.data?.membership_id ||
    payload?.data?.subscription_id ||
    payload?.membership_id ||
    null
  );
}

function extractBmcExpiresAt(payload) {
  const raw =
    payload?.data?.membership_end ||
    payload?.data?.expires_at ||
    payload?.data?.current_period_end ||
    null;
  return raw ? new Date(raw) : null;
}

async function recordBmcEvent(eventId, payload) {
  const result = await query(
    `INSERT INTO bmc_events (event_id, payload)
     VALUES ($1, $2::jsonb)
     ON CONFLICT (event_id) DO NOTHING
     RETURNING id`,
    [eventId, JSON.stringify(payload)]
  );
  return result.rowCount > 0;
}

async function processBmcWebhook(payload) {
  const eventId = extractBmcEventId(payload);
  const inserted = await recordBmcEvent(eventId, payload);
  if (!inserted) {
    return { duplicate: true, eventId };
  }

  const email = extractBmcEmail(payload);
  if (!email) {
    return { duplicate: false, eventId, processed: false, reason: 'missing_email' };
  }

  const license = await upsertLicense({
    email,
    plan: payload?.data?.membership_level_name || payload?.type || 'paid',
    bmcMembershipId: extractBmcMembershipId(payload),
    expiresAt: extractBmcExpiresAt(payload)
  });

  return { duplicate: false, eventId, processed: true, email: license.email };
}

module.exports = {
  registerDevice,
  resolveAccessStatus,
  linkEmail,
  processBmcWebhook
};
