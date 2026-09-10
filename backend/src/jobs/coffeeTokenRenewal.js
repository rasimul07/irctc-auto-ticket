const cron = require('node-cron');
const config = require('../config');
const { renewExpiredCoffeeLicenses } = require('../services/coffeeRenewalService');

let scheduledTask = null;

async function runCoffeeRenewalJob() {
  try {
    const result = await renewExpiredCoffeeLicenses();
    if (result.renewed > 0) {
      console.log(`[cron] coffee renewal: renewed ${result.renewed} license(s)`);
    }
    return result;
  } catch (err) {
    console.error('[cron] coffee renewal failed', err.message);
    throw err;
  }
}

function startCoffeeTokenRenewalCron() {
  if (!config.coffeeRenewCronEnabled) {
    console.log('[cron] coffee token renewal disabled');
    return null;
  }

  if (!cron.validate(config.coffeeRenewCronSchedule)) {
    console.error('[cron] invalid COFFEE_RENEW_CRON_SCHEDULE:', config.coffeeRenewCronSchedule);
    return null;
  }

  scheduledTask = cron.schedule(config.coffeeRenewCronSchedule, () => {
    runCoffeeRenewalJob().catch(() => {});
  });

  console.log(`[cron] coffee token renewal scheduled (${config.coffeeRenewCronSchedule})`);
  return scheduledTask;
}

module.exports = { startCoffeeTokenRenewalCron, runCoffeeRenewalJob };
