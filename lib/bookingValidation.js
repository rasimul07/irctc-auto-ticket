(function (root) {
  root.IRCTCExt = root.IRCTCExt || {};

  function isCardComplete(card) {
    return !!(card?.name && card?.number && card?.expiry && card?.cvv);
  }

  /**
   * Returns null when valid, or { tab, focusId?, focusSelector?, message }.
   */
  function validateBookingConfig(config) {
    const credentials = config?.credentials || {};
    const journey = config?.journey || {};
    const passengers = config?.passengers || [];
    const preferences = config?.preferences || {};

    if (!credentials.username?.trim()) {
      return { tab: 'credentials', focusId: 'username', message: 'Please enter your IRCTC username.' };
    }
    if (!credentials.password) {
      return { tab: 'credentials', focusId: 'password', message: 'Please enter your IRCTC password.' };
    }
    if (!journey.from?.trim()) {
      return { tab: 'journey', focusId: 'fromStation', message: 'Please enter the From station.' };
    }
    if (!journey.to?.trim()) {
      return { tab: 'journey', focusId: 'toStation', message: 'Please enter the To station.' };
    }
    if (!journey.date) {
      return { tab: 'journey', focusId: 'journeyDate', message: 'Please select the journey date.' };
    }
    if (!journey.trainNo?.trim() && !journey.trainName?.trim()) {
      return {
        tab: 'journey',
        focusId: 'trainNo',
        message: 'Enter a train number or train name.'
      };
    }

    const hasNamedPassenger = passengers.some((p) => (p.name || '').trim());
    if (!hasNamedPassenger) {
      return {
        tab: 'passengers',
        focusSelector: '.passenger-card .p-name',
        message: 'Add at least one passenger with a name matching your IRCTC profile.'
      };
    }

    if (preferences.autoPayEnabled && preferences.paymentMethod === 'cards') {
      const type = preferences.autoPayType || 'debit';
      if (type === 'debit' || type === 'credit') {
        const card = type === 'credit' ? preferences.creditCard : preferences.debitCard;
        const prefix = type === 'credit' ? 'credit' : 'debit';
        const label = type === 'credit' ? 'credit' : 'debit';
        if (!card?.name) {
          return {
            tab: 'payment',
            focusId: `${prefix}CardName`,
            message: `Enter ${label} card name for auto pay.`
          };
        }
        if (!card?.number) {
          return {
            tab: 'payment',
            focusId: `${prefix}CardNumber`,
            message: `Enter ${label} card number for auto pay.`
          };
        }
        if (!card?.expiry) {
          return {
            tab: 'payment',
            focusId: `${prefix}CardExpiry`,
            message: `Enter ${label} card expiry for auto pay.`
          };
        }
        if (!card?.cvv) {
          return {
            tab: 'payment',
            focusId: `${prefix}CardCvv`,
            message: `Enter ${label} card CVV for auto pay.`
          };
        }
        if (!isCardComplete(card)) {
          return {
            tab: 'payment',
            focusId: `${prefix}CardName`,
            message: `Complete all ${label} card fields for auto pay.`
          };
        }
      }
    }

    return null;
  }

  IRCTCExt.BookingValidation = { validate: validateBookingConfig };
})(typeof globalThis !== 'undefined' ? globalThis : window);
