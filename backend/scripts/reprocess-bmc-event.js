const accessService = require('../src/services/accessService');
const { query, pool } = require('../src/db/pool');

const eventId = String(process.argv[2] || '').trim();
if (!eventId) {
  console.error('Usage: node scripts/reprocess-bmc-event.js <event_id>');
  process.exit(1);
}

async function main() {
  const row = await query('SELECT payload FROM bmc_events WHERE event_id = $1', [eventId]);
  if (!row.rows[0]) {
    throw new Error(`bmc_events row not found for event_id=${eventId}`);
  }

  const payload = row.rows[0].payload;
  await query('DELETE FROM bmc_events WHERE event_id = $1', [eventId]);
  const result = await accessService.processBmcWebhook(payload);
  console.log(JSON.stringify(result, null, 2));
}

main()
  .then(() => pool.end())
  .catch((err) => {
    console.error(err);
    pool.end().finally(() => process.exit(1));
  });
