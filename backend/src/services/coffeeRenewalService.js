const config = require('../config');
const { query } = require('../db/pool');

async function renewExpiredCoffeeLicenses() {
  const result = await query(
    `UPDATE licenses
     SET tokens_balance = $1,
         token_period_end = NOW() + ($2 || ' days')::interval,
         coffee_renewals_remaining = coffee_renewals_remaining - 1,
         updated_at = NOW()
     WHERE plan = 'coffee'
       AND active = TRUE
       AND coffee_donations_count >= 1
       AND coffee_renewals_remaining > 0
       AND token_period_end IS NOT NULL
       AND token_period_end <= NOW()
     RETURNING email, tokens_balance, token_period_end, coffee_renewals_remaining`,
    [config.coffeeTokensPerMonth, String(config.coffeeTokenPeriodDays)]
  );

  return {
    renewed: result.rowCount,
    emails: result.rows.map((row) => row.email)
  };
}

module.exports = { renewExpiredCoffeeLicenses };
