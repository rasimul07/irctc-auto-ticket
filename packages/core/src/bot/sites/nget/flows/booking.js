(function (root) {
  root.IRCTCExt = root.IRCTCExt || {};
  if (IRCTCExt.NgetBookingFlow) return;

  function activateSharedBookingSelectors() {
    const eticketSelectors = IRCTCExt.EticketSelectors;
    if (!eticketSelectors) {
      throw new Error('Eticket selectors not loaded. Reload the extension.');
    }
    IRCTCExt.SELECTORS = {
      ...IRCTCExt.NgetSelectors,
      passengers: eticketSelectors.passengers,
      psgnPreferences: eticketSelectors.psgnPreferences,
      payment: eticketSelectors.payment
    };
  }

  IRCTCExt.NgetBookingFlow = {
    async fillPassengers(config, overlay) {
      if (!location.pathname.includes('psgninput')) {
        throw new Error('Not on passenger input page');
      }
      activateSharedBookingSelectors();
      return IRCTCExt.Passengers.addPassengers(config, overlay);
    },

    async configurePsgninputOptions(config, overlay) {
      if (!location.pathname.includes('psgninput')) {
        throw new Error('Not on passenger input page');
      }
      activateSharedBookingSelectors();
      return IRCTCExt.PsgnPreferences.configure(config, overlay);
    },

    async clickContinueToPayment(overlay) {
      if (!location.pathname.includes('reviewBooking') && !location.pathname.includes('review')) {
        throw new Error('Not on review booking page');
      }
      activateSharedBookingSelectors();
      return IRCTCExt.PsgnPreferences.clickContinueToPayment(overlay);
    },

    async showPaymentReview(overlay) {
      activateSharedBookingSelectors();
      overlay.setStep('Payment');
      const message = 'Complete payment manually on IRCTC.';
      if (IRCTCExt.PaymentReviewOverlay?.show) {
        await IRCTCExt.PaymentReviewOverlay.show();
        overlay.showPause(message);
      } else {
        overlay.setStatus(message);
        overlay.showPause?.(message);
      }
      await IRCTCExt.Storage.updateState({ status: 'done', running: false, currentStep: 'done' });
      return true;
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
