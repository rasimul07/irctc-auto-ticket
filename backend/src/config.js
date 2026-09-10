require('dotenv').config();

const allowedClientTypes = (process.env.ALLOWED_CLIENT_TYPES || 'chrome_extension,ionic_android,ionic_ios')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
  throw new Error('Missing required environment variable: DATABASE_URL or DB_HOST');
}

const config = {
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiBasePath: process.env.API_BASE_PATH || '/api/v1',
  databaseUrl: process.env.DATABASE_URL || '',
  freeTrialDays: Number(process.env.FREE_TRIAL_DAYS || 7),
  coffeeTokensPerMonth: Number(process.env.COFFEE_TOKENS_PER_MONTH || 10),
  coffeeTokenPeriodDays: Number(process.env.COFFEE_TOKEN_PERIOD_DAYS || 30),
  bmcPlanBasic: process.env.BMC_PLAN_BASIC || 'Basic',
  bmcPlanPro: process.env.BMC_PLAN_PRO || 'Pro',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  bmcWebhookSecret: process.env.BMC_WEBHOOK_SECRET || '',
  coffeeRenewCronEnabled: process.env.COFFEE_RENEW_CRON_ENABLED !== 'false',
  coffeeRenewCronSchedule: process.env.COFFEE_RENEW_CRON_SCHEDULE || '0 0 * * *',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  allowedClientTypes,
  apiBaseProd: process.env.API_BASE_PROD || 'https://api.railticket.tool.mridev.in/api/v1'
};

module.exports = config;
