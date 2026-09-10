const { runCoffeeRenewalJob } = require('./coffeeTokenRenewal');

runCoffeeRenewalJob()
  .then((result) => {
    console.log(`[jobs:renew-coffee] renewed ${result.renewed} license(s)`);
    if (result.emails.length) {
      console.log('[jobs:renew-coffee] emails:', result.emails.join(', '));
    }
    process.exit(0);
  })
  .catch((err) => {
    console.error('[jobs:renew-coffee] failed', err);
    process.exit(1);
  });
