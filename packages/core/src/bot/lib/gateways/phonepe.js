window.IRCTCExt = window.IRCTCExt || {};

IRCTCExt.PhonePeGateway = {
  isPhonePeHost() {
    return location.hostname.includes('phonepe.com');
  },

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

  isLoadingScreen() {
    const text = (document.body?.textContent || '').toLowerCase();
    return text.includes('please wait') && text.includes('processing your request');
  },

  isPaymentOptionsVisible() {
    const sel = IRCTCExt.SELECTORS.phonepeGateway;
    if (IRCTCExt.Wait.queryOne(sel.cardInstrument)) return true;
    if (IRCTCExt.Wait.queryOne(sel.upiInstrument)) return true;
    const title = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span')).find((el) =>
      /payment options/i.test(el.textContent || '')
    );
    return !!(title && IRCTCExt.Wait.isVisible(title));
  },

  async waitForGatewayReady() {
    const ready = await IRCTCExt.Wait.poll(
      () => {
        if (IRCTCExt.PhonePeGateway.isPaymentOptionsVisible()) return true;
        if (IRCTCExt.PhonePeGateway.isLoadingScreen()) return null;
        return IRCTCExt.PhonePeGateway.isPaymentOptionsVisible() ? true : null;
      },
      { timeout: 30000, interval: 300 }
    );
    if (!ready) throw new Error('PhonePe payment gateway did not load');
    await IRCTCExt.Wait.delay(400);
  },

  findUpiInstrument() {
    const sel = IRCTCExt.SELECTORS.phonepeGateway;
    const direct = IRCTCExt.Wait.queryOne(sel.upiInstrument);
    if (direct && IRCTCExt.Wait.isVisible(direct)) return direct;

    for (const item of IRCTCExt.Wait.queryAll(sel.paymentOptionItem)) {
      if (!IRCTCExt.Wait.isVisible(item)) continue;
      const title = item.querySelector('._titleContainer_1cewd_41, [class*="titleContainer"]');
      const text = (title?.textContent || item.textContent || '').replace(/\s+/g, ' ').trim();
      if (/^UPI$/i.test(text) || (/\bUPI\b/i.test(text) && !/debit|credit card/i.test(text))) {
        return item;
      }
    }
    return null;
  },

  isInstrumentSelected(el) {
    if (!el) return false;
    if (el.classList.contains('_selected_1cewd_32')) return true;
    if (el.id === 'card-instrument' && el.className.includes('_selected_')) return true;
    return el.getAttribute('aria-selected') === 'true';
  },

  async selectInstrument(el, label, overlay) {
    if (!el) throw new Error(`${label} payment option not found on PhonePe gateway`);
    if (IRCTCExt.PhonePeGateway.isInstrumentSelected(el)) return el;

    overlay?.setStatus(`Selecting ${label} on PhonePe...`);
    IRCTCExt.Events.click(el);
    await IRCTCExt.Wait.delay(500);
    return el;
  },

  async selectCardInstrument(overlay) {
    const sel = IRCTCExt.SELECTORS.phonepeGateway;
    const card = await IRCTCExt.Wait.waitFor(sel.cardInstrument, { timeout: 15000, visible: true });
    await IRCTCExt.PhonePeGateway.selectInstrument(card, 'Debit/Credit Card', overlay);

    const numberInput = await IRCTCExt.Wait.waitFor(sel.cardNumber, { timeout: 10000, visible: true });
    if (!numberInput) throw new Error('PhonePe card form did not appear');
    return numberInput;
  },

  async selectUpiInstrument(overlay) {
    const upi = await IRCTCExt.Wait.poll(
      () => IRCTCExt.PhonePeGateway.findUpiInstrument(),
      { timeout: 10000, interval: 200 }
    );
    if (!upi) return false;
    await IRCTCExt.PhonePeGateway.selectInstrument(upi, 'UPI', overlay);
    return true;
  },

  hasVisibleFieldError() {
    const sel = IRCTCExt.SELECTORS.phonepeGateway;
    for (const err of IRCTCExt.Wait.queryAll(sel.fieldErrorVisible)) {
      if (IRCTCExt.Wait.isVisible(err) && (err.textContent || '').trim()) return true;
    }
    return false;
  },

  isProceedEnabled(btn) {
    if (!btn || !IRCTCExt.Wait.isVisible(btn)) return false;
    if (btn.disabled) return false;
    if (btn.getAttribute('aria-disabled') === 'true') return false;
    if (btn.classList.contains('_disabled_1ozip_25')) return false;
    return true;
  },

  async fillCardForm(card, overlay) {
    const sel = IRCTCExt.SELECTORS.phonepeGateway;
    const numberEl = IRCTCExt.Wait.queryOne(sel.cardNumber);
    const nameEl = IRCTCExt.Wait.queryOne(sel.cardName);
    const expiryEl = IRCTCExt.Wait.queryOne(sel.cardExpiry);
    const cvvEl = IRCTCExt.Wait.queryOne(sel.cardCvv);

    if (!numberEl || !nameEl || !expiryEl || !cvvEl) {
      throw new Error('PhonePe card fields not found');
    }

    const cardNumber = String(card?.number || '').replace(/\s+/g, '');
    const expiry = IRCTCExt.PhonePeGateway.formatExpiry(card?.expiry);

    overlay?.setStatus('Filling card details on PhonePe...');
    IRCTCExt.Events.setInputValue(numberEl, cardNumber);
    await IRCTCExt.Wait.delay(200);
    IRCTCExt.Events.setInputValue(nameEl, card?.name || '');
    await IRCTCExt.Wait.delay(200);
    IRCTCExt.Events.setInputValue(expiryEl, expiry);
    await IRCTCExt.Wait.delay(200);
    IRCTCExt.Events.setInputValue(cvvEl, card?.cvv || '');
    await IRCTCExt.Wait.delay(400);

    if (IRCTCExt.PhonePeGateway.hasVisibleFieldError()) {
      throw new Error('PhonePe rejected card details — check number, expiry, CVV, and name');
    }
  },

  async clickProceedWhenEnabled(overlay) {
    const sel = IRCTCExt.SELECTORS.phonepeGateway;
    overlay?.setStatus('Waiting for Proceed button...');

    const btn = await IRCTCExt.Wait.poll(
      () => {
        const candidate = IRCTCExt.Wait.queryOne(sel.proceedBtn);
        return IRCTCExt.PhonePeGateway.isProceedEnabled(candidate) ? candidate : null;
      },
      { timeout: 15000, interval: 250 }
    );

    if (!btn) throw new Error('PhonePe Proceed button not enabled — check saved card details');

    overlay?.setStatus('Clicking Proceed...');
    IRCTCExt.Events.click(btn);
    await IRCTCExt.Wait.delay(600);
    return btn;
  },

  async isQrVisible() {
    const sel = IRCTCExt.SELECTORS.phonepeGateway;
    for (const selector of sel.qrCode) {
      const el = document.querySelector(selector);
      if (el && IRCTCExt.Wait.isVisible(el)) return true;
    }
    return false;
  },

  async handleQrFlow(overlay) {
    overlay?.setStatus('Preparing PhonePe UPI / QR...');

    const upiSelected = await IRCTCExt.PhonePeGateway.selectUpiInstrument(overlay);
    if (!upiSelected && !(await IRCTCExt.PhonePeGateway.isQrVisible())) {
      throw new Error('PhonePe UPI payment option not found');
    }

    const qrReady = await IRCTCExt.Wait.poll(
      () => (IRCTCExt.PhonePeGateway.isQrVisible() ? true : null),
      { timeout: 15000, interval: 300 }
    );

    if (!qrReady) throw new Error('PhonePe QR code did not appear');

    await IRCTCExt.PhonePeGateway.finishGateway(overlay, 'QR ready — scan and pay manually.');
  },

  async fillAutopayCard(overlay, card, type) {
    const label = type === 'credit' ? 'credit' : 'debit';
    if (!card?.number) {
      throw new Error(`Saved ${label} card details are missing in extension popup`);
    }

    await IRCTCExt.PhonePeGateway.selectCardInstrument(overlay);
    await IRCTCExt.PhonePeGateway.fillCardForm(card, overlay);
    await IRCTCExt.PhonePeGateway.clickProceedWhenEnabled(overlay);
    await IRCTCExt.PhonePeGateway.finishGateway(
      overlay,
      'Card submitted — complete OTP/3DS manually.'
    );
  },

  async handle(config, overlay) {
    await IRCTCExt.PhonePeGateway.waitForGatewayReady();

    const autoPay = IRCTCExt.BkgPayment.getAutoPaySettings(config);
    if (!autoPay.enabled) {
      await IRCTCExt.PhonePeGateway.finishGateway(
        overlay,
        'Auto pay disabled — complete payment manually on PhonePe gateway.'
      );
      return true;
    }

    if (autoPay.type === 'qr') {
      return IRCTCExt.PhonePeGateway.handleQrFlow(overlay);
    }

    if (autoPay.type === 'credit' || autoPay.type === 'debit') {
      return IRCTCExt.PhonePeGateway.fillAutopayCard(overlay, autoPay.card, autoPay.type);
    }

    throw new Error(`Unsupported auto pay type: ${autoPay.type}`);
  }
};
