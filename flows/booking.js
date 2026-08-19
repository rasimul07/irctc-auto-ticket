window.IRCTCExt = window.IRCTCExt || {};

IRCTCExt.BookingFlow = {
  async fillPassengers(config, overlay) {
    overlay.setStep('Passengers');
    overlay.setStatus('Filling passenger details...');
    await IRCTCExt.Storage.updateState({ currentStep: 'passengers' });

    await IRCTCExt.Wait.delay(1500);
    const passengers = config.passengers.filter((p) => p.name && p.age);

    for (let i = 0; i < passengers.length; i++) {
      const p = passengers[i];
      overlay.setStatus(`Filling passenger ${i + 1}: ${p.name}`);

      const nameInputs = document.querySelectorAll('input[formcontrolname="passengerName"], input[placeholder*="Name"]');
      const ageInputs = document.querySelectorAll('input[formcontrolname="passengerAge"], input[placeholder*="Age"]');

      if (nameInputs[i]) IRCTCExt.Events.setInputValue(nameInputs[i], p.name);
      if (ageInputs[i]) IRCTCExt.Events.setInputValue(ageInputs[i], String(p.age));

      const genderDropdowns = document.querySelectorAll('p-dropdown[formcontrolname="passengerGender"], p-dropdown[formcontrolname="passengerGenderCode"]');
      if (genderDropdowns[i]) {
        const trigger = genderDropdowns[i].querySelector('.ui-dropdown-trigger, .p-dropdown-trigger');
        if (trigger) {
          IRCTCExt.Events.click(trigger);
          await IRCTCExt.Wait.delay(300);
          const items = IRCTCExt.Wait.queryAll(IRCTCExt.SELECTORS.dropdownPanel);
          const genderMap = { M: 'Male', F: 'Female', T: 'Transgender' };
          const label = genderMap[p.gender] || p.gender;
          const item = items.find((li) => li.textContent.includes(label));
          if (item) IRCTCExt.Events.click(item);
        }
      }

      await IRCTCExt.Wait.delay(300);
    }

    return true;
  },

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
  },

  async run(config, overlay) {
    await IRCTCExt.Wait.poll(
      () => document.querySelector('input[formcontrolname="passengerName"], input[placeholder*="Name"]'),
      { timeout: 20000, interval: 300 }
    );

    await IRCTCExt.BookingFlow.fillPassengers(config, overlay);
    await IRCTCExt.BookingFlow.proceedReview(overlay);
    await IRCTCExt.BookingFlow.selectPayment(overlay);
    return true;
  }
};
