const dns = require('dns');

dns.setDefaultResultOrder('ipv4first');

function isSupabaseHost(host) {
  return typeof host === 'string' && host.includes('supabase.co');
}

function appendSslMode(connectionString) {
  if (!connectionString || connectionString.includes('sslmode=')) {
    return connectionString;
  }
  const separator = connectionString.includes('?') ? '&' : '?';
  return `${connectionString}${separator}sslmode=require`;
}

function buildPoolConfig(env = process.env) {
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

  const connectionString = env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error('Missing DATABASE_URL or DB_HOST environment variable');
  }

  const poolConfig = {
    connectionString: appendSslMode(connectionString)
  };

  if (connectionString.includes('supabase.co')) {
    poolConfig.ssl = { rejectUnauthorized: false };
  }

  return poolConfig;
}

module.exports = { buildPoolConfig, isSupabaseHost };
