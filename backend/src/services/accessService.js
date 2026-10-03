const config = require('../config');
const { pool, query } = require('../db/pool');
const { CLIENT_TYPES } = require('../constants/clients');

const PLAN_PRIORITY = {
  trial: 1,
  coffee: 2,
  basic: 3,
  pro: 4
};

const MOBILE_CLIENTS = new Set([CLIENT_TYPES.IONIC_ANDROID, CLIENT_TYPES.IONIC_IOS]);

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

function normalizePlan(plan) {
  const value = String(plan || '').trim().toLowerCase();
  if (value === 'trial' || value === 'coffee' || value === 'basic' || value === 'pro') {
    return value;
  }
  if (value.includes('pro')) return 'pro';
  if (value.includes('basic')) return 'basic';
  return value || 'coffee';
}

function comparePlanPriority(planA, planB) {
  return (PLAN_PRIORITY[normalizePlan(planA)] || 0) - (PLAN_PRIORITY[normalizePlan(planB)] || 0);
}

function isClientAllowedForPlan(plan, clientType) {
  const normalizedPlan = normalizePlan(plan);
  if (normalizedPlan === 'pro') return true;
  if (MOBILE_CLIENTS.has(clientType)) return false;
  return clientType === CLIENT_TYPES.CHROME_EXTENSION;
}

function isLicenseActive(license) {
  if (!license || !license.active) return false;
  if (normalizePlan(license.plan) === 'coffee') {
    if (!license.token_period_end) return false;
    if (new Date(license.token_period_end) <= new Date()) return false;
    return Number(license.tokens_balance) > 0;
  }
  if (!license.expires_at) return true;
  return new Date(license.expires_at) > new Date();
}

function isUnlimitedPlan(plan) {
  const normalizedPlan = normalizePlan(plan);
  return normalizedPlan === 'trial' || normalizedPlan === 'basic' || normalizedPlan === 'pro';
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
    `SELECT id, email, plan, bmc_membership_id, expires_at, active,
            tokens_balance, token_period_end, coffee_donations_count,
            coffee_renewals_remaining, coffee_entitlement_started_at,
            created_at, updated_at
     FROM licenses
     WHERE email = $1`,
    [normalized]
  );
  return result.rows[0] || null;
}

function buildNoneStatus(email = null) {
  return {
    allowed: false,
    tier: 'none',
    plan: null,
    unlimited: false,
    tokensRemaining: 0,
    email,
    expiresAt: null
  };
}

function buildStatusFromLicense(license, clientType) {
  const plan = normalizePlan(license.plan);
  const clientAllowed = isClientAllowedForPlan(plan, clientType);
  const unlimited = isUnlimitedPlan(plan);
  const tokensRemaining = plan === 'coffee' ? Number(license.tokens_balance) || 0 : null;
  const active = isLicenseActive(license);

  let allowed = active && clientAllowed;
  if (plan === 'coffee') {
    allowed = active && clientAllowed && tokensRemaining > 0;
  }

  const expiresAt = plan === 'coffee'
    ? license.token_period_end
      ? new Date(license.token_period_end).toISOString()
      : null
    : license.expires_at
      ? new Date(license.expires_at).toISOString()
      : null;

  return {
    allowed,
    tier: active ? plan : 'expired',
    plan,
    unlimited,
    tokensRemaining: plan === 'coffee' ? tokensRemaining : null,
    email: license.email,
    expiresAt,
    clientAllowed
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

  if (!device.email) {
    return buildNoneStatus(null);
  }

  const license = await getLicenseByEmail(device.email);
  if (!license || !license.active) {
    return buildNoneStatus(device.email);
  }

  return buildStatusFromLicense(license, clientType);
}

async function registerDevice(clientType, deviceId) {
  const existing = await getDevice(clientType, deviceId);
  if (existing) {
    return resolveAccessStatus(clientType, deviceId);
  }

  await query(
    `INSERT INTO devices (client_type, device_id)
     VALUES ($1, $2)`,
    [clientType, deviceId]
  );

  return buildNoneStatus(null);
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

async function upsertLicense({
  email,
  plan,
  bmcMembershipId = null,
  expiresAt = null,
  tokensBalance = null,
  tokenPeriodEnd = null,
  active = true,
  forcePlan = false
}) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const normalizedPlan = normalizePlan(plan);
  const existing = await getLicenseByEmail(normalized);

  if (
    existing &&
    !forcePlan &&
    isLicenseActive(existing) &&
    comparePlanPriority(normalizedPlan, existing.plan) < 0
  ) {
    return existing;
  }

  const result = await query(
    `INSERT INTO licenses (
       email, plan, bmc_membership_id, expires_at, active,
       tokens_balance, token_period_end, updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     ON CONFLICT (email)
     DO UPDATE SET
       plan = EXCLUDED.plan,
       bmc_membership_id = COALESCE(EXCLUDED.bmc_membership_id, licenses.bmc_membership_id),
       expires_at = COALESCE(EXCLUDED.expires_at, licenses.expires_at),
       tokens_balance = EXCLUDED.tokens_balance,
       token_period_end = EXCLUDED.token_period_end,
       active = EXCLUDED.active,
       updated_at = NOW()
     RETURNING *`,
    [
      normalized,
      normalizedPlan,
      bmcMembershipId,
      expiresAt,
      active,
      tokensBalance ?? 0,
      tokenPeriodEnd
    ]
  );

  return result.rows[0];
}

async function deactivateLicense(email, plan = null) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  if (plan) {
    const result = await query(
      `UPDATE licenses
       SET active = FALSE, updated_at = NOW()
       WHERE email = $1 AND plan = $2
       RETURNING *`,
      [normalized, normalizePlan(plan)]
    );
    return result.rows[0] || null;
  }

  const result = await query(
    `UPDATE licenses
     SET active = FALSE, updated_at = NOW()
     WHERE email = $1
     RETURNING *`,
    [normalized]
  );
  return result.rows[0] || null;
}

function extractBmcEmail(payload) {
  return (
    payload?.data?.supporter_email ||
    payload?.data?.payer_email ||
    payload?.data?.email ||
    payload?.payer_email ||
    payload?.supporter_email ||
    payload?.email ||
    null
  );
}

function extractBmcEventId(payload) {
  return String(
    payload?.event_id ||
      payload?.id ||
      payload?.data?.id ||
      payload?.data?.payment_id ||
      `${Date.now()}-${Math.random()}`
  );
}

function extractBmcMembershipId(payload) {
  const txId = payload?.data?.transaction_id;
  if (txId && String(txId).startsWith('sub_')) {
    return String(txId);
  }
  return (
    payload?.data?.psp_id ||
    payload?.data?.membership_id ||
    payload?.data?.subscription_id ||
    payload?.membership_id ||
    null
  );
}

function extractBmcExpiresAt(payload) {
  const raw =
    payload?.data?.current_period_end ||
    payload?.data?.membership_end ||
    payload?.data?.expires_at ||
    null;
  if (!raw) return null;
  if (typeof raw === 'number') {
    return new Date(raw * 1000);
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isDonationSucceeded(payload) {
  const data = payload?.data;
  return (
    payload?.type === 'donation.created' &&
    data?.status === 'succeeded' &&
    data?.refunded === 'false' &&
    data?.support_type === 'Supporter'
  );
}

function isDonationRefundedEvent(payload) {
  const data = payload?.data;
  return (
    payload?.type === 'donation.refunded' ||
    data?.status === 'refunded' ||
    data?.refunded === 'true'
  );
}

function extractCoffeeCount(payload) {
  const count = Number(payload?.data?.coffee_count);
  return Number.isFinite(count) && count > 0 ? count : 1;
}

function extractMembershipPlanFromLevelName(levelNameRaw) {
  const levelName = String(levelNameRaw || '').trim();
  if (!levelName) return null;

  const basicName = config.bmcPlanBasic.toLowerCase();
  const proName = config.bmcPlanPro.toLowerCase();

  if (levelName.toLowerCase() === proName || levelName.toLowerCase().includes('pro')) {
    return 'pro';
  }
  if (levelName.toLowerCase() === basicName || levelName.toLowerCase().includes('basic')) {
    return 'basic';
  }
  return null;
}

function extractMembershipPlan(payload) {
  const data = payload?.data || {};
  return (
    extractMembershipPlanFromLevelName(data.membership_level_name) ||
    extractMembershipPlanFromLevelName(data.membership_level) ||
    extractMembershipPlanFromLevelName(data.tier_name) ||
    null
  );
}

function isMembershipPayloadActive(payload) {
  const data = payload?.data || {};
  const status = String(data.status || '').toLowerCase();
  if (status === 'canceled' || status === 'paused') return false;
  if (data.canceled === 'true' || data.paused === 'true') return false;
  if (status === 'active') return true;
  const eventType = String(payload?.type || '');
  return eventType === 'membership.started' || eventType === 'membership.updated';
}

async function resolveMembershipPlan(payload, email) {
  const direct = extractMembershipPlan(payload);
  if (direct) return direct;

  const pspId = extractBmcMembershipId(payload);
  if (pspId) {
    const bySub = await query(`SELECT plan FROM licenses WHERE bmc_membership_id = $1 LIMIT 1`, [pspId]);
    if (bySub.rows[0]?.plan) {
      return normalizePlan(bySub.rows[0].plan);
    }
  }

  const normalized = normalizeEmail(email);
  if (normalized) {
    const existing = await getLicenseByEmail(normalized);
    if (existing && (existing.plan === 'pro' || existing.plan === 'basic')) {
      return normalizePlan(existing.plan);
    }
  }

  return null;
}

async function needsMembershipLicenseRepair(email, payload) {
  if (!isMembershipPayloadActive(payload)) return false;

  const normalized = normalizeEmail(email);
  if (!normalized) return false;

  const incoming = await resolveMembershipPlan(payload, email);
  if (!incoming) return false;

  const license = await getLicenseByEmail(normalized);
  if (!license || !license.active) return true;
  if (!isLicenseActive(license)) return true;
  return comparePlanPriority(incoming, license.plan) > 0;
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

async function handleRecurringDonationStarted(email) {
  const expiresAt = addDays(new Date(), config.freeTrialDays);
  return upsertLicense({
    email,
    plan: 'trial',
    expiresAt,
    tokensBalance: 0,
    tokenPeriodEnd: null,
    active: true,
    forcePlan: false
  });
}

async function handleDonationCreated(email, payload) {
  if (!isDonationSucceeded(payload)) {
    return { license: null, processed: false, reason: 'invalid_donation_status' };
  }

  const normalized = normalizeEmail(email);
  const existing = await getLicenseByEmail(normalized);
  if (existing && isLicenseActive(existing) && comparePlanPriority('coffee', existing.plan) < 0) {
    return { license: existing, processed: true, skippedPlanDowngrade: true };
  }

  const coffeeCount = extractCoffeeCount(payload);
  const tokenPeriodEnd = addDays(new Date(), config.coffeeTokenPeriodDays);
  const renewalsRemaining = Math.max(0, config.coffeeRenewalMonths - 1);

  const result = await query(
    `INSERT INTO licenses (
       email, plan, active, tokens_balance, token_period_end,
       coffee_donations_count, coffee_renewals_remaining, coffee_entitlement_started_at,
       updated_at
     )
     VALUES ($1, 'coffee', TRUE, $2, $3, $4, $5, NOW(), NOW())
     ON CONFLICT (email)
     DO UPDATE SET
       plan = 'coffee',
       active = TRUE,
       tokens_balance = $2,
       token_period_end = $3,
       coffee_donations_count = licenses.coffee_donations_count + $4,
       coffee_renewals_remaining = $5,
       coffee_entitlement_started_at = NOW(),
       updated_at = NOW()
     RETURNING *`,
    [normalized, config.coffeeTokensPerMonth, tokenPeriodEnd, coffeeCount, renewalsRemaining]
  );

  return { license: result.rows[0], processed: true };
}

async function handleDonationRefunded(email, payload) {
  if (!isDonationRefundedEvent(payload)) {
    return { license: null, processed: false, reason: 'invalid_refund_status' };
  }

  const normalized = normalizeEmail(email);
  const coffeeCount = extractCoffeeCount(payload);

  const result = await query(
    `UPDATE licenses
     SET coffee_donations_count = GREATEST(0, coffee_donations_count - $2),
         tokens_balance = CASE
           WHEN GREATEST(0, coffee_donations_count - $2) = 0 THEN 0
           ELSE tokens_balance
         END,
         coffee_renewals_remaining = CASE
           WHEN GREATEST(0, coffee_donations_count - $2) = 0 THEN 0
           ELSE coffee_renewals_remaining
         END,
         active = CASE
           WHEN GREATEST(0, coffee_donations_count - $2) = 0 AND plan = 'coffee' THEN FALSE
           ELSE active
         END,
         updated_at = NOW()
     WHERE email = $1
     RETURNING *`,
    [normalized, coffeeCount]
  );

  return { license: result.rows[0] || null, processed: !!result.rows[0] };
}

async function handleMembershipEvent(email, payload, active = true) {
  const plan = await resolveMembershipPlan(payload, email);
  if (!plan) {
    return { processed: false, reason: 'unknown_membership_level' };
  }

  const license = await upsertLicense({
    email,
    plan,
    bmcMembershipId: extractBmcMembershipId(payload),
    expiresAt: extractBmcExpiresAt(payload),
    tokensBalance: 0,
    tokenPeriodEnd: null,
    active,
    forcePlan: true
  });

  return { processed: true, email: license.email, plan: license.plan };
}

async function syncMembershipEventsForEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    return { processed: 0, results: [] };
  }

  const rows = await query(
    `SELECT event_id, payload
     FROM bmc_events
     WHERE LOWER(payload->'data'->>'supporter_email') = $1
       AND payload->>'type' IN (
         'membership.started',
         'membership.updated',
         'membership.cancelled',
         'membership.paused'
       )
     ORDER BY id ASC`,
    [normalized]
  );

  const results = [];
  for (const row of rows.rows) {
    const payload = row.payload;
    const eventType = String(payload?.type || '').trim();
    if (eventType === 'membership.cancelled' || eventType === 'membership.paused') {
      const plan = extractMembershipPlan(payload);
      const license = plan ? await deactivateLicense(normalized, plan) : await deactivateLicense(normalized);
      results.push({ eventId: row.event_id, type: eventType, processed: !!license });
      continue;
    }
    const result = await handleMembershipEvent(normalized, payload, true);
    results.push({ eventId: row.event_id, type: eventType, ...result });
  }

  return { email: normalized, processed: results.length, results };
}

async function grantManualLicense({ email, plan, bmcMembershipId = null, expiresAt = null }) {
  const normalizedPlan = normalizePlan(plan);
  if (!['trial', 'coffee', 'basic', 'pro'].includes(normalizedPlan)) {
    const err = new Error(`Invalid plan: ${plan}`);
    err.code = 'INVALID_PLAN';
    throw err;
  }

  let expiry = expiresAt;
  if (!expiry && normalizedPlan === 'trial') {
    expiry = addDays(new Date(), config.freeTrialDays);
  }

  return upsertLicense({
    email,
    plan: normalizedPlan,
    bmcMembershipId,
    expiresAt: expiry,
    tokensBalance: 0,
    tokenPeriodEnd: null,
    active: true,
    forcePlan: true
  });
}

async function processBmcWebhook(payload) {
  const eventId = extractBmcEventId(payload);
  const email = extractBmcEmail(payload);
  const inserted = await recordBmcEvent(eventId, payload);
  if (!inserted) {
    const eventType = String(payload?.type || '').trim();
    const repair =
      (eventType === 'membership.started' || eventType === 'membership.updated') &&
      email &&
      (await needsMembershipLicenseRepair(email, payload));
    if (!repair) {
      return { duplicate: true, eventId };
    }
  }

  if (!email) {
    return { duplicate: false, eventId, processed: false, reason: 'missing_email' };
  }

  const eventType = String(payload?.type || '').trim();

  switch (eventType) {
    case 'recurring_donation.started':
    case 'recurring_donation.updated': {
      const license = await handleRecurringDonationStarted(email);
      return { duplicate: false, eventId, processed: true, email: license.email, plan: license.plan };
    }
    case 'recurring_donation.cancelled': {
      const license = await deactivateLicense(email, 'trial');
      return {
        duplicate: false,
        eventId,
        processed: !!license,
        email: normalizeEmail(email),
        plan: 'trial'
      };
    }
    case 'donation.created': {
      const result = await handleDonationCreated(email, payload);
      return {
        duplicate: false,
        eventId,
        processed: result.processed,
        email: result.license?.email || normalizeEmail(email),
        plan: result.license?.plan || 'coffee',
        reason: result.reason
      };
    }
    case 'donation.refunded': {
      const result = await handleDonationRefunded(email, payload);
      return {
        duplicate: false,
        eventId,
        processed: result.processed,
        email: normalizeEmail(email),
        plan: result.license?.plan || 'coffee',
        reason: result.reason
      };
    }
    case 'membership.started':
    case 'membership.updated': {
      const result = await handleMembershipEvent(email, payload, true);
      return { duplicate: false, eventId, ...result };
    }
    case 'membership.cancelled':
    case 'membership.paused': {
      const plan = extractMembershipPlan(payload);
      const license = plan ? await deactivateLicense(email, plan) : await deactivateLicense(email);
      return {
        duplicate: false,
        eventId,
        processed: !!license,
        email: normalizeEmail(email),
        plan
      };
    }
    default:
      return { duplicate: false, eventId, processed: false, reason: 'unsupported_event', type: eventType };
  }
}

async function consumeToken(clientType, deviceId, usageKey) {
  const key = String(usageKey || '').trim();
  if (!key) {
    const err = new Error('usageKey is required');
    err.code = 'INVALID_USAGE_KEY';
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

  if (!device.email) {
    const err = new Error('Link your Buy Me a Coffee email before booking');
    err.code = 'EMAIL_NOT_LINKED';
    err.status = 403;
    throw err;
  }

  const license = await getLicenseByEmail(device.email);
  if (!license || !license.active) {
    const err = new Error('No active license found');
    err.code = 'NO_LICENSE';
    err.status = 403;
    throw err;
  }

  const plan = normalizePlan(license.plan);
  if (!isClientAllowedForPlan(plan, clientType)) {
    const err = new Error('Your plan does not include access for this client');
    err.code = 'CLIENT_NOT_ALLOWED';
    err.status = 403;
    throw err;
  }

  if (isUnlimitedPlan(plan)) {
    if (!isLicenseActive(license)) {
      const err = new Error('Your access has expired');
      err.code = 'ACCESS_EXPIRED';
      err.status = 403;
      throw err;
    }
    return buildStatusFromLicense(license, clientType);
  }

  if (plan !== 'coffee') {
    const err = new Error('Token consumption is not applicable for this plan');
    err.code = 'INVALID_PLAN';
    err.status = 400;
    throw err;
  }

  if (!isLicenseActive(license)) {
    const err = new Error('No tokens remaining or token period expired');
    err.code = 'NO_TOKENS';
    err.status = 403;
    throw err;
  }

  const normalizedEmail = normalizeEmail(device.email);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existingUsage = await client.query(
      `SELECT id FROM token_usages
       WHERE client_type = $1 AND device_id = $2 AND usage_key = $3`,
      [clientType, deviceId, key]
    );
    if (existingUsage.rows[0]) {
      await client.query('COMMIT');
      const refreshed = await getLicenseByEmail(device.email);
      return buildStatusFromLicense(refreshed, clientType);
    }

    const deductResult = await client.query(
      `UPDATE licenses
       SET tokens_balance = tokens_balance - 1, updated_at = NOW()
       WHERE email = $1
         AND plan = 'coffee'
         AND active = TRUE
         AND tokens_balance > 0
         AND token_period_end > NOW()
       RETURNING *`,
      [normalizedEmail]
    );

    if (!deductResult.rows[0]) {
      await client.query('ROLLBACK');
      const err = new Error('No tokens remaining or token period expired');
      err.code = 'NO_TOKENS';
      err.status = 403;
      throw err;
    }

    await client.query(
      `INSERT INTO token_usages (client_type, device_id, usage_key, email)
       VALUES ($1, $2, $3, $4)`,
      [clientType, deviceId, key, normalizedEmail]
    );

    await client.query('COMMIT');
  } catch (txErr) {
    await client.query('ROLLBACK');
    throw txErr;
  } finally {
    client.release();
  }

  const updated = await getLicenseByEmail(device.email);
  return buildStatusFromLicense(updated, clientType);
}

module.exports = {
  registerDevice,
  resolveAccessStatus,
  linkEmail,
  processBmcWebhook,
  syncMembershipEventsForEmail,
  grantManualLicense,
  consumeToken
};
