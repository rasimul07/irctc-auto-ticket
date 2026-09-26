window.IRCTCExt = window.IRCTCExt || {};

IRCTCExt.IrctcIpayGateway = {
  formatExpiry(expiry) {
    const raw = String(expiry || '').trim();
    if (!raw) return '';
    if (/^\d{2}\/\d{2}$/.test(raw)) return raw;
    const slash = raw.match(/^(\d{1,2})\/(\d{2,4})$/);
    if (slash) {
      const mm = slash[1].padStart(2, '0');
      const yy = slash[2].length === 4 ? slash[2].slice(-2) : slash[2];
      return `${mm}/${yy}`;
    }
    const digits = raw.replace(/\D/g, '');
    if (digits.length >= 4) {
      return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
    }
    return raw;
  },

  async waitForGatewayReady() {
    const sel = IRCTCExt.SELECTORS.irctcIpayGateway;
    const ready = await IRCTCExt.Wait.waitFor(sel.paymentNavs, { timeout: 20000, visible: true });
    if (!ready) throw new Error('IRCTC iPay gateway did not load');
    await IRCTCExt.Wait.delay(300);
  },

  async finishGateway(overlay, message) {
    await IRCTCExt.Storage.updateState({
      paymentDone: true,
      paymentPhase: null,
      awaitingGateway: false,
      paymentGateway: null,
      status: 'done',
      running: false,
      currentStep: 'done'
    });
    overlay?.setStep('Payment');
    overlay?.setStatus(message);
    overlay?.showPause(message);
  },

  autoPayRadioLabel(type) {
    if (type === 'credit') return 'Credit Card';
    if (type === 'qr') return 'UPI';
    return 'Debit Card';
  },

  autoPayRadioSelectors(type) {
    const sel = IRCTCExt.SELECTORS.irctcIpayGateway;
    if (type === 'credit') return sel.creditRadio;
    if (type === 'qr') return sel.upiMandateRadio;
    return sel.debitRadio;
  },

  async ensureAutopayTabActive() {
    const sel = IRCTCExt.SELECTORS.irctcIpayGateway;
    const tab = IRCTCExt.Wait.queryOne(sel.autoDebitTab);
    if (!tab) return;

    if (!tab.classList.contains('activeLi')) {
      IRCTCExt.Events.click(tab);
      await IRCTCExt.Wait.delay(350);
    }

    await IRCTCExt.Wait.waitFor(sel.paymentNavs, { timeout: 5000, visible: true });
  },

  async selectAutoPayRadio(type) {
    const normalized = type === 'upi' ? 'qr' : type;
    const label = IRCTCExt.IrctcIpayGateway.autoPayRadioLabel(normalized);
    const selectors = IRCTCExt.IrctcIpayGateway.autoPayRadioSelectors(normalized);

    await IRCTCExt.IrctcIpayGateway.ensureAutopayTabActive();

    const radio = await IRCTCExt.Wait.waitFor(selectors, { timeout: 8000, visible: true });
    if (!radio) throw new Error(`${label} auto pay option not found on gateway`);

    if (!radio.checked) {
      IRCTCExt.Events.click(radio);
      await IRCTCExt.Wait.delay(400);
    }

    if (!radio.checked) {
      const labelEl = radio.closest('label');
      if (labelEl) IRCTCExt.Events.click(labelEl);
      await IRCTCExt.Wait.delay(400);
    }

    return radio;
  },

  async selectMandateType(type) {
    return IRCTCExt.IrctcIpayGateway.selectAutoPayRadio(type);
  },

  findVisibleField(selectors) {
    const list = Array.isArray(selectors) ? selectors : [selectors];
    for (const selector of list) {
      const el = document.querySelector(selector);
      if (el && IRCTCExt.Wait.isVisible(el)) return el;
    }
    return null;
  },

  resolveCardFields() {
    const sel = IRCTCExt.SELECTORS.irctcIpayGateway;
    const sets = [
      {
        number: sel.altCardNumber,
        expiry: sel.altExpiry,
        cvv: sel.altCvv,
        name: sel.altCardName,
        payBtn: sel.altPayBtn
      },
      {
        number: ['#mndtCardNo'],
        expiry: ['#mandateDate'],
        cvv: ['#mandateCvv'],
        name: ['#mandateName'],
        payBtn: ['#autoDebitBtn']
      }
    ];

    for (const set of sets) {
      const numberEl = IRCTCExt.IrctcIpayGateway.findVisibleField(set.number);
      if (!numberEl) continue;

      const expiryEl = IRCTCExt.IrctcIpayGateway.findVisibleField(set.expiry);
      const cvvEl = IRCTCExt.IrctcIpayGateway.findVisibleField(set.cvv);
      const nameEl = IRCTCExt.IrctcIpayGateway.findVisibleField(set.name);
      const payBtn = IRCTCExt.IrctcIpayGateway.findVisibleField(set.payBtn);

      if (expiryEl && cvvEl && nameEl) {
        return { numberEl, expiryEl, cvvEl, nameEl, payBtn };
      }
    }

    throw new Error('Card fields not found on IRCTC iPay gateway');
  },

  async waitForCardFields() {
    const fields = await IRCTCExt.Wait.poll(
      () => {
        try {
          return IRCTCExt.IrctcIpayGateway.resolveCardFields();
        } catch {
          return null;
        }
      },
      { timeout: 8000, interval: 150 }
    );
    if (!fields) throw new Error('Card form not visible on IRCTC iPay gateway');
    return fields;
  },

  fieldHasInputError(el) {
    if (!el || !IRCTCExt.Wait.isVisible(el)) return true;
    if (el.classList.contains('redLine')) return true;
    return !String(el.value || '').trim();
  },

  hasVisibleCardFieldError(fields) {
    const sel = IRCTCExt.SELECTORS.irctcIpayGateway;
    for (const id of sel.cardFieldErrors) {
      const el = document.querySelector(id);
      if (el && IRCTCExt.Wait.isVisible(el)) return true;
    }

    if (fields) {
      for (const el of [fields.numberEl, fields.expiryEl, fields.cvvEl, fields.nameEl]) {
        if (IRCTCExt.IrctcIpayGateway.fieldHasInputError(el)) return true;
      }

      const panel =
        fields.numberEl?.closest('.cardNumValiWrapper, .cardNumUiNew, .mndt_wrapper, form') ||
        fields.numberEl?.parentElement;
      if (panel) {
        for (const err of panel.querySelectorAll('.text-danger1')) {
          if (IRCTCExt.Wait.isVisible(err)) return true;
        }
      }
    }

    return false;
  },

  async clearGatewayInput(el) {
    if (!el) return;
    el.focus();
    IRCTCExt.Events.setNativeValue(el, '');
    el.dispatchEvent(
      new InputEvent('input', { bubbles: true, data: '', inputType: 'deleteContentBackward' })
    );
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('keyup', { bubbles: true }));
    el.dispatchEvent(new Event('focusout', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
    await IRCTCExt.Wait.delay(200);
  },

  async fillGatewayInput(el, value, { slow = false } = {}) {
    if (!el) return;
    await IRCTCExt.IrctcIpayGateway.clearGatewayInput(el);
    const text = String(value || '');

    if (slow) {
      await IRCTCExt.Events.typeSlowly(el, text, 40);
    } else {
      IRCTCExt.Events.setInputValue(el, text, { blur: false });
      el.dispatchEvent(new Event('keyup', { bubbles: true }));
      el.dispatchEvent(new Event('focusout', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
    }

    await IRCTCExt.Wait.delay(150);
  },

  cardNumberLooksValid(el, expectedDigits) {
    if (!el) return false;
    const digits = String(el.value || '').replace(/\D/g, '');
    const expected = String(expectedDigits || '').replace(/\D/g, '');
    if (digits.length < 12) return false;
    if (expected && digits !== expected) return false;
    if (el.classList.contains('redLine')) return false;
    return true;
  },

  async fillCardNumberWithRetry(numberEl, cardNumber) {
    const maxTries = 3;
    for (let attempt = 1; attempt <= maxTries; attempt++) {
      await IRCTCExt.IrctcIpayGateway.fillGatewayInput(numberEl, cardNumber, { slow: true });
      await IRCTCExt.Wait.delay(200);

      if (IRCTCExt.IrctcIpayGateway.cardNumberLooksValid(numberEl, cardNumber)) return;

      if (attempt < maxTries) {
        await IRCTCExt.IrctcIpayGateway.clearGatewayInput(numberEl);
        await IRCTCExt.Wait.delay(200);
      }
    }

    throw new Error('Could not enter card number on IRCTC iPay gateway');
  },

  async clearCardFields(fields) {
    const resolved = fields || IRCTCExt.IrctcIpayGateway.resolveCardFields();
    for (const el of [resolved.numberEl, resolved.expiryEl, resolved.cvvEl, resolved.nameEl]) {
      await IRCTCExt.IrctcIpayGateway.clearGatewayInput(el);
    }
  },

  async fillCardFields(card) {
    const fields = IRCTCExt.IrctcIpayGateway.resolveCardFields();
    const cardNumber = String(card?.number || '').replace(/\s+/g, '');
    const expiryDigits = IRCTCExt.IrctcIpayGateway.formatExpiry(card?.expiry).replace(/\D/g, '');

    await IRCTCExt.IrctcIpayGateway.fillCardNumberWithRetry(fields.numberEl, cardNumber);
    await IRCTCExt.IrctcIpayGateway.fillGatewayInput(fields.expiryEl, expiryDigits, { slow: true });
    await IRCTCExt.IrctcIpayGateway.fillGatewayInput(fields.cvvEl, card?.cvv || '');
    await IRCTCExt.IrctcIpayGateway.fillGatewayInput(fields.nameEl, card?.name || '');

    return fields;
  },

  async waitForCardFormValid(fields) {
    const resolved = fields || IRCTCExt.IrctcIpayGateway.resolveCardFields();
    const ok = await IRCTCExt.Wait.poll(
      () => {
        if (IRCTCExt.IrctcIpayGateway.hasVisibleCardFieldError(resolved)) return false;

        const payBtn =
          resolved.payBtn ||
          IRCTCExt.IrctcIpayGateway.findVisibleField(IRCTCExt.SELECTORS.irctcIpayGateway.autoDebitPayBtn);
        if (!payBtn || !IRCTCExt.Wait.isVisible(payBtn)) return false;
        if (payBtn.disabled) return false;
        return true;
      },
      { timeout: 5000, interval: 150 }
    );

    if (!ok) {
      throw new Error('Gateway rejected saved card details — check card number, expiry, CVV, and name');
    }

    return resolved;
  },

  async fillAutopayCard(overlay, card, type) {
    const label = type === 'credit' ? 'credit' : 'debit';
    const maxAttempts = 3;

    overlay?.setStatus(`Selecting ${label} card auto pay type...`);
    await IRCTCExt.IrctcIpayGateway.selectAutoPayRadio(type);
    await IRCTCExt.IrctcIpayGateway.waitForCardFields();

    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        let fields = IRCTCExt.IrctcIpayGateway.resolveCardFields();

        if (attempt > 1) {
          overlay?.setStatus(`Retrying card fill (${attempt}/${maxAttempts})...`);
          await IRCTCExt.IrctcIpayGateway.clearCardFields(fields);
          await IRCTCExt.Wait.delay(300);
        } else {
          overlay?.setStatus(`Filling ${label} card on IRCTC iPay...`);
        }

        fields = await IRCTCExt.IrctcIpayGateway.fillCardFields(card);

        overlay?.setStatus('Validating card details...');
        fields = await IRCTCExt.IrctcIpayGateway.waitForCardFormValid(fields);

        const payBtn =
          fields.payBtn ||
          IRCTCExt.IrctcIpayGateway.findVisibleField(IRCTCExt.SELECTORS.irctcIpayGateway.autoDebitPayBtn);
        if (!payBtn) throw new Error('Pay button not found on IRCTC iPay gateway');

        overlay?.setStatus('Submitting card payment...');
        IRCTCExt.Events.click(payBtn);
        await IRCTCExt.Wait.delay(500);

        await IRCTCExt.IrctcIpayGateway.finishGateway(
          overlay,
          'Card submitted — complete OTP/bank step manually.'
        );
        return;
      } catch (err) {
        lastError = err;
        if (attempt >= maxAttempts) break;
      }
    }

    throw lastError || new Error('Gateway rejected saved card details — check card number, expiry, CVV, and name');
  },

  async clickQrTrigger(selectors) {
    const qrBtn = await IRCTCExt.Wait.poll(
      () => {
        const btn = IRCTCExt.Wait.queryOne(selectors);
        return btn && IRCTCExt.Wait.isVisible(btn) ? btn : null;
      },
      { timeout: 8000, interval: 150 }
    );
    if (!qrBtn) return null;
    IRCTCExt.Events.click(qrBtn);
    await IRCTCExt.Wait.delay(500);
    return qrBtn;
  },

  async handleQrFlow(overlay) {
    const sel = IRCTCExt.SELECTORS.irctcIpayGateway;
    overlay?.setStatus('Selecting UPI auto pay type...');
    await IRCTCExt.IrctcIpayGateway.selectAutoPayRadio('qr');

    await IRCTCExt.Wait.waitFor(sel.upiMandatePanel, { timeout: 8000, visible: true });

    overlay?.setStatus('Opening UPI QR on IRCTC iPay...');
    let clicked = await IRCTCExt.IrctcIpayGateway.clickQrTrigger(sel.autopayQrTrigger);

    if (!clicked) {
      const upiTab = IRCTCExt.Wait.queryOne(sel.upiTab);
      if (upiTab && IRCTCExt.Wait.isVisible(upiTab)) {
        IRCTCExt.Events.click(upiTab);
        await IRCTCExt.Wait.delay(400);
        await IRCTCExt.Wait.waitFor(sel.upiPanel, { timeout: 8000, visible: true });
        clicked = await IRCTCExt.IrctcIpayGateway.clickQrTrigger(sel.qrTrigger);
      }
    }

    if (!clicked) throw new Error('QR pay button not found on IRCTC iPay gateway');

    await IRCTCExt.IrctcIpayGateway.finishGateway(overlay, 'QR ready — scan and pay manually.');
  },

  async handle(config, overlay) {
    await IRCTCExt.IrctcIpayGateway.waitForGatewayReady();

    const autoPay = IRCTCExt.BkgPayment.getAutoPaySettings(config);
    if (!autoPay.enabled) {
      await IRCTCExt.IrctcIpayGateway.finishGateway(
        overlay,
        'Auto pay disabled — complete payment manually on gateway.'
      );
      return true;
    }

    if (autoPay.type === 'qr') {
      return IRCTCExt.IrctcIpayGateway.handleQrFlow(overlay);
    }

    if (autoPay.type === 'credit' || autoPay.type === 'debit') {
      if (!autoPay.card?.number) {
        throw new Error(`Saved ${autoPay.type} card details are missing in extension popup`);
      }
      return IRCTCExt.IrctcIpayGateway.fillAutopayCard(overlay, autoPay.card, autoPay.type);
    }

    throw new Error(`Unsupported auto pay type: ${autoPay.type}`);
  }
};
