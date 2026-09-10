const path = require('path');
const dns = require('dns');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

dns.setDefaultResultOrder('ipv4first');

function isSupabaseHost(host) {
  return typeof host === 'string' && host.includes('supabase.co');
}

function stripSslModeParam(connectionString) {
  return connectionString
    .replace(/([?&])sslmode=[^&]*/g, (match, prefix) => (prefix === '?' ? '?' : ''))
    .replace(/\?&/g, '?')
    .replace(/\?$/, '');
}

function buildPoolConfig(env = process.env) {
  const connectionString = env.DATABASE_URL?.trim();
  if (connectionString) {
    const poolConfig = {
      connectionString: stripSslModeParam(connectionString)
    };

    if (connectionString.includes('supabase.co') || env.DB_SSL !== 'false') {
      poolConfig.ssl = { rejectUnauthorized: false };
    }

    return poolConfig;
  }

  const host = env.DB_HOST?.trim();
  if (host) {
    const config = {
      host,
      port: Number(env.DB_PORT || 5432),
      user: env.DB_USER || 'postgres',
      password: env.DB_PASSWORD || '',
      database: env.DB_NAME || 'postgres'
    };

    if (env.DB_SSL !== 'false' || isSupabaseHost(host)) {
      config.ssl = { rejectUnauthorized: false };
    }

    return config;
  }

  throw new Error('Missing DATABASE_URL or DB_HOST environment variable');
}

module.exports = { buildPoolConfig, isSupabaseHost };
