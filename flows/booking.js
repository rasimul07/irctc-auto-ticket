window.IRCTCExt = window.IRCTCExt || {};

IRCTCExt.BookingFlow = {
  async fillPassengers(config, overlay) {
    if (!location.pathname.includes('psgninput')) {
      throw new Error('Not on passenger input page');
    }
    return IRCTCExt.Passengers.selectExistingPassengers(config, overlay);
  },

  async configurePsgninputOptions(config, overlay) {
    if (!location.pathname.includes('psgninput')) {
      throw new Error('Not on passenger input page');
    }
    return IRCTCExt.PsgnPreferences.configure(config, overlay);
  },

  async clickContinueToPayment(overlay) {
    if (!location.pathname.includes('reviewBooking')) {
      throw new Error('Not on review booking page');
    }
    return IRCTCExt.PsgnPreferences.clickContinueToPayment(overlay);
  },

  // Legacy flow for old IRCTC payment gateway pages (not used on eticket psgninput).
  async proceedReview(overlay) {
    overlay.setStep('Review');
    overlay.setStatus('Proceeding to review...');
    await IRCTCExt.Storage.updateState({ currentStep: 'review' });

    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    for (const cb of checkboxes) {
      if (!cb.checked && IRCTCExt.Wait.isVisible(cb)) {
        IRCTCExt.Events.click(cb);
      }
    }

    const buttons = Array.from(document.querySelectorAll('button'));
    const proceed = buttons.find((b) => /continue|proceed|review|pay/i.test(b.textContent));
    if (proceed) {
      IRCTCExt.Events.click(proceed);
      await IRCTCExt.Wait.delay(1500);
    }
    return true;
  },

  async showPaymentReview(overlay) {
    await IRCTCExt.PaymentReviewOverlay.show();
    overlay.setStep('Payment');
    overlay.setStatus('Review booking details and complete payment on IRCTC.');
    overlay.showPause('Complete payment manually on IRCTC.');
    await IRCTCExt.Storage.updateState({ status: 'done', running: false, currentStep: 'done' });
    return true;
  },

  // Legacy flow for old IRCTC payment gateway pages (not used on eticket psgninput).
  async selectPayment(overlay) {
    overlay.setStep('Payment');
    overlay.setStatus('Selecting payment method...');
    await IRCTCExt.Storage.updateState({ currentStep: 'payment' });

    await IRCTCExt.Wait.delay(2000);
    const paymentOption = document.querySelector('.bank-type, .payment-opt, input[type="radio"]');
    if (paymentOption) IRCTCExt.Events.click(paymentOption);

    const payBtn = Array.from(document.querySelectorAll('button')).find((b) => /pay|make payment/i.test(b.textContent));
    if (payBtn) IRCTCExt.Events.click(payBtn);

    overlay.showPause('Complete payment OTP manually on the gateway, then click Continue.', () => {
      overlay.setStatus('Payment step acknowledged.');
    });

    await IRCTCExt.Storage.updateState({ status: 'done', running: false, currentStep: 'done' });
    return true;
  }
};
