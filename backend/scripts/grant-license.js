const accessService = require('../src/services/accessService');
const { pool } = require('../src/db/pool');

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--subscription' || arg === '--sub') {
      flags.subscription = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === '--expires-days') {
      flags.expiresDays = Number(argv[i + 1]);
      i += 1;
      continue;
    }
    positional.push(arg);
  }
  return { email: positional[0], plan: positional[1] || 'pro', flags };
}

async function main() {
  const { email, plan, flags } = parseArgs(process.argv);
  if (!email) {
    console.error(
      'Usage: node scripts/grant-license.js <email> [plan] [--subscription sub_xxx] [--expires-days 31]'
    );
    process.exit(1);
  }

  const expiresAt =
    Number.isFinite(flags.expiresDays) && flags.expiresDays > 0
      ? new Date(Date.now() + flags.expiresDays * 24 * 60 * 60 * 1000)
      : null;

  const license = await accessService.grantManualLicense({
    email,
    plan,
    bmcMembershipId: flags.subscription || null,
    expiresAt
  });

  console.log(
    JSON.stringify(
      {
        email: license.email,
        plan: license.plan,
        active: license.active,
        bmc_membership_id: license.bmc_membership_id,
        expires_at: license.expires_at
      },
      null,
      2
    )
  );
}

main()
  .then(() => pool.end())
  .catch((err) => {
    console.error(err);
    pool.end().finally(() => process.exit(1));
  });
