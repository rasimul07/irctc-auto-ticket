const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool({
  connectionString: config.databaseUrl
});

pool.on('error', (err) => {
  console.error('[db] Unexpected pool error', err);
});

async function query(text, params) {
  return pool.query(text, params);
}

async function ping() {
  await query('SELECT 1');
}

module.exports = { pool, query, ping };
