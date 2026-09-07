const { Pool } = require('pg');
const { buildPoolConfig } = require('./databaseConfig');

const pool = new Pool(buildPoolConfig());

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
