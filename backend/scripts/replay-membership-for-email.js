const accessService = require('../src/services/accessService');
const { pool } = require('../src/db/pool');

const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/replay-membership-for-email.js <email>');
  process.exit(1);
}

async function main() {
  const result = await accessService.syncMembershipEventsForEmail(email);
  console.log(JSON.stringify(result, null, 2));
}

main()
  .then(() => pool.end())
  .catch((err) => {
    console.error(err);
    pool.end().finally(() => process.exit(1));
  });
