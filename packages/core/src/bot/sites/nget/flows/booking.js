(function (root) {
  root.IRCTCExt = root.IRCTCExt || {};
  if (IRCTCExt.NgetBookingFlow) return;

  function activateSharedBookingSelectors() {
    IRCTCExt.SELECTORS = {
      ...IRCTCExt.NgetSelectors
    };
  }

  IRCTCExt.NgetBookingFlow = {
    async fillPassengers(config, overlay) {
      if (!location.pathname.includes('psgninput')) {
        throw new Error('Not on passenger input page');
      }
      activateSharedBookingSelectors();
      return IRCTCExt.NgetPassengersFlow.addPassengers(config, overlay);
    },

    async configurePsgninputOptions(config, overlay) {
      if (!location.pathname.includes('psgninput')) {
        throw new Error('Not on passenger input page');
      }
      activateSharedBookingSelectors();
      return IRCTCExt.NgetPsgnPreferencesFlow.configure(config, overlay);
    },

    async clickContinueToPayment(overlay) {
      if (!location.pathname.includes('reviewBooking') && !location.pathname.includes('review')) {
        throw new Error('Not on review booking page');
      }
      activateSharedBookingSelectors();
      return IRCTCExt.NgetReviewFlow.run(overlay);
    },

    async handlePayment(config, overlay) {
      if (!location.pathname.includes('bkgPaymentOptions') && !location.pathname.includes('payment')) {
        throw new Error('Not on NGET payment page');
      }
      activateSharedBookingSelectors();
      const method = config.preferences?.paymentMethod || 'cards';
      if (method === 'upi') {
        return IRCTCExt.NgetPaymentFlow.handleUpi(config, overlay);
      }
      return IRCTCExt.NgetPaymentFlow.handleCards(config, overlay);
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
