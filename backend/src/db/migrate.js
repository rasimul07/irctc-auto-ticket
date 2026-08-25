const fs = require('fs');
const path = require('path');
const { pool, query } = require('./pool');

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function runMigrations() {
  const sqlDir = path.join(__dirname, '..', '..', 'sql');
  const files = fs
    .readdirSync(sqlDir)
    .filter((name) => name.endsWith('.sql'))
    .sort();

  const bootstrap = await pool.connect();
  try {
    await bootstrap.query('BEGIN');
    await ensureMigrationsTable(bootstrap);
    await bootstrap.query('COMMIT');
  } catch (err) {
    await bootstrap.query('ROLLBACK');
    throw err;
  } finally {
    bootstrap.release();
  }

  for (const filename of files) {
    const existing = await query('SELECT 1 FROM schema_migrations WHERE filename = $1', [filename]);
    if (existing.rowCount) {
      console.log(`[migrate] skip ${filename}`);
      continue;
    }

    const sql = fs.readFileSync(path.join(sqlDir, filename), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
      await client.query('COMMIT');
      console.log(`[migrate] applied ${filename}`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

runMigrations()
  .then(() => {
    console.log('[migrate] done');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[migrate] failed', err);
    process.exit(1);
  });
