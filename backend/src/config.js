require('dotenv').config();

const allowedClientTypes = (process.env.ALLOWED_CLIENT_TYPES || 'chrome_extension,ionic_android')
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
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  bmcWebhookSecret: process.env.BMC_WEBHOOK_SECRET || '',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  allowedClientTypes,
  apiBaseProd: process.env.API_BASE_PROD || 'https://api.yourdomain.com/api/v1'
};

module.exports = config;
