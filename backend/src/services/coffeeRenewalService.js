const config = require('../config');
const { query } = require('../db/pool');

async function renewExpiredCoffeeLicenses() {
  const result = await query(
    `UPDATE licenses
     SET tokens_balance = $1,
         token_period_end = NOW() + ($2 || ' days')::interval,
         updated_at = NOW()
     WHERE plan = 'coffee'
       AND active = TRUE
       AND coffee_donations_count >= 1
       AND token_period_end IS NOT NULL
       AND token_period_end <= NOW()
     RETURNING email, tokens_balance, token_period_end`,
    [config.coffeeTokensPerMonth, String(config.coffeeTokenPeriodDays)]
  );

  return {
    renewed: result.rowCount,
    emails: result.rows.map((row) => row.email)
  };
}

module.exports = { renewExpiredCoffeeLicenses };
