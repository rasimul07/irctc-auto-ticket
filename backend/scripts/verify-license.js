const { query, pool } = require('../src/db/pool');

const email = process.argv[2] || 'brucelee13196@gmail.com';

async function main() {
  const events = await query(
    `SELECT event_id, payload
     FROM bmc_events
     WHERE LOWER(payload->'data'->>'supporter_email') = $1
     ORDER BY id DESC
     LIMIT 5`,
    [email.toLowerCase()]
  );

  const licenses = await query(
    `SELECT email, plan, active, expires_at, tokens_balance, token_period_end
     FROM licenses
     WHERE email = $1`,
    [email.toLowerCase()]
  );

  const summarizedEvents = events.rows.map((row) => ({
    event_id: row.event_id,
    type: row.payload?.type,
    email: row.payload?.data?.supporter_email,
    membership_level_name: row.payload?.data?.membership_level_name,
    psp_id: row.payload?.data?.psp_id,
    status: row.payload?.data?.status
  }));

  console.log(JSON.stringify({ email, events: summarizedEvents, licenses: licenses.rows }, null, 2));
}

main()
  .then(() => pool.end())
  .catch((err) => {
    console.error(err);
    pool.end().finally(() => process.exit(1));
  });
