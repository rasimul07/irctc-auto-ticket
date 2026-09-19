window.IRCTCExt = window.IRCTCExt || {};

IRCTCExt.IrctcPaymentsGateway = {
  getSelectors() {
    return IRCTCExt.SELECTORS?.irctcPaymentsGateway || {};
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

  isAuthRedirectPage() {
    return !!(
      IRCTCExt.NgetPaths?.isGatewayAuthRedirectPath?.() || location.pathname.includes('/authRedirect')
    );
  },

  resolveUpiVariant(config) {
    const method =
      config?.state?.gatewayPaymentMethod || config?.preferences?.paymentMethod || 'cards';
    if (method === 'upi') return 'bhim';
    if (IRCTCExt.Wait.queryOne(IRCTCExt.IrctcPaymentsGateway.getSelectors().upiBhimAccordionBtn)) {
      return 'bhim';
    }
    if (IRCTCExt.Wait.queryOne(IRCTCExt.IrctcPaymentsGateway.getSelectors().upiCcClAccordionBtn)) {
      return 'cccl';
    }
    if (document.querySelector('#show-qr-div #qr-click')) return 'bhim';
    return 'cccl';
  },

  getUpiSelectors(variant) {
    const sel = IRCTCExt.IrctcPaymentsGateway.getSelectors();
    if (variant === 'bhim') {
      return {
        accordionBtn: sel.upiBhimAccordionBtn,
        accordionPanel: sel.upiBhimAccordionPanel,
        qrRadio: sel.upiBhimQrRadio,
        qrSection: sel.upiBhimQrSection
      };
    }
    return {
      accordionBtn: sel.upiCcClAccordionBtn,
      accordionPanel: sel.upiCcClAccordionPanel,
      qrRadio: sel.upiCcClQrRadio,
      qrSection: sel.upiCcClQrSection
    };
  },

  isUpiQrSectionVisible(upiSel) {
    const section = IRCTCExt.Wait.queryOne(upiSel.qrSection);
    if (!section || !IRCTCExt.Wait.isVisible(section)) return false;
    const radio = IRCTCExt.Wait.queryOne(upiSel.qrRadio, section);
    return !!(radio && IRCTCExt.Wait.isVisible(radio));
  },

  isUpiAccordionOpen(upiSel) {
    const btn = IRCTCExt.Wait.queryOne(upiSel.accordionBtn);
    const panel = IRCTCExt.Wait.queryOne(upiSel.accordionPanel);
    if (btn?.getAttribute('aria-expanded') === 'true') return true;
    if (panel?.classList?.contains('show')) return true;
    return IRCTCExt.IrctcPaymentsGateway.isUpiQrSectionVisible(upiSel);
  },

  async waitForReady(overlay) {
    const sel = IRCTCExt.IrctcPaymentsGateway.getSelectors();
    const onAuthRedirect = IRCTCExt.IrctcPaymentsGateway.isAuthRedirectPage();
    const timeout = onAuthRedirect ? 90000 : 30000;

    if (onAuthRedirect) {
      overlay?.setStatus?.('Payment gateway loading — waiting for card/UPI form...');
    }

    const ready = await IRCTCExt.Wait.poll(
      () => {
        const cardAccordion = IRCTCExt.Wait.queryOne(sel.cardAccordionBtn);
        const bhimAccordion = IRCTCExt.Wait.queryOne(sel.upiBhimAccordionBtn);
        const ccclAccordion = IRCTCExt.Wait.queryOne(sel.upiCcClAccordionBtn);
        if (cardAccordion && IRCTCExt.Wait.isVisible(cardAccordion)) return cardAccordion;
        if (bhimAccordion && IRCTCExt.Wait.isVisible(bhimAccordion)) return bhimAccordion;
        if (ccclAccordion && IRCTCExt.Wait.isVisible(ccclAccordion)) return ccclAccordion;
        return null;
      },
      { timeout, interval: 250 }
    );
    if (!ready) throw new Error('IRCTC Payments gateway did not load');
    overlay?.setStatus?.('Payment form ready — continuing automation...');
    await IRCTCExt.Wait.delay(300);
    return ready;
  },

  parseExpiryParts(expiry) {
    const raw = String(expiry || '').trim();
    const slash = raw.match(/^(\d{1,2})\s*\/\s*(\d{2,4})$/);
    if (slash) {
      const month = slash[1].padStart(2, '0');
      const year = slash[2].length === 4 ? slash[2] : `20${slash[2]}`;
      return { month, year };
    }
    const digits = raw.replace(/\D/g, '');
    if (digits.length >= 4) {
      const month = digits.slice(0, 2).padStart(2, '0');
      const yy = digits.slice(2, 4);
      return { month, year: `20${yy}` };
    }
    return { month: '', year: '' };
  },

  async clearGatewayInput(el) {
    if (!el) return;
    el.focus();
    IRCTCExt.Events.setNativeValue(el, '');
    el.dispatchEvent(new InputEvent('input', { bubbles: true, data: '', inputType: 'deleteContentBackward' }));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('keyup', { bubbles: true }));
    el.dispatchEvent(new Event('focusout', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
    await IRCTCExt.Wait.delay(150);
  },

  async fillGatewayInput(el, value, { slow = false } = {}) {
    if (!el) return;
    await IRCTCExt.IrctcPaymentsGateway.clearGatewayInput(el);
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

  async fillSelect(select, value) {
    if (!select || !value) return;
    select.focus();
    IRCTCExt.Events.setNativeValue(select, value);
    select.dispatchEvent(new Event('change', { bubbles: true }));
    select.dispatchEvent(new Event('blur', { bubbles: true }));
    await IRCTCExt.Wait.delay(150);
  },

  getCardPanelRoot() {
    const sel = IRCTCExt.IrctcPaymentsGateway.getSelectors();
    const panel = IRCTCExt.Wait.queryOne(sel.cardAccordionPanel);
    if (panel) return panel;
    const form = IRCTCExt.Wait.queryOne(sel.cardForm);
    if (form) return form;
    return document.body || document;
  },

  isCardsAccordionOpen() {
    const sel = IRCTCExt.IrctcPaymentsGateway.getSelectors();
    const btn = IRCTCExt.Wait.queryOne(sel.cardAccordionBtn);
    const panel = IRCTCExt.Wait.queryOne(sel.cardAccordionPanel);
    if (btn?.getAttribute('aria-expanded') === 'true') return true;
    if (panel?.classList?.contains('show')) return true;
    return IRCTCExt.IrctcPaymentsGateway.isCardFormVisible();
  },

  isCardFormVisible() {
    const sel = IRCTCExt.IrctcPaymentsGateway.getSelectors();
    const root = IRCTCExt.IrctcPaymentsGateway.getCardPanelRoot();
    const number = IRCTCExt.Wait.queryOne(sel.cardNumberMasked, root);
    return !!(number && IRCTCExt.Wait.isVisible(number));
  },

  async openCardsAccordion(overlay) {
    const sel = IRCTCExt.IrctcPaymentsGateway.getSelectors();

    const btn = await IRCTCExt.Wait.poll(
      () => {
        const candidate = IRCTCExt.Wait.queryOne(sel.cardAccordionBtn);
        return candidate && IRCTCExt.Wait.isVisible(candidate) ? candidate : null;
      },
      { timeout: 20000, interval: 200 }
    );
    if (!btn) throw new Error('Cards accordion button not found on IRCTC Payments gateway');

    if (!IRCTCExt.IrctcPaymentsGateway.isCardsAccordionOpen()) {
      overlay?.setStatus('Opening Cards payment section...');
      btn.scrollIntoView({ block: 'center', inline: 'nearest' });
      IRCTCExt.Events.click(btn);
      await IRCTCExt.Wait.delay(500);

      if (!IRCTCExt.IrctcPaymentsGateway.isCardsAccordionOpen()) {
        IRCTCExt.Events.click(btn);
        await IRCTCExt.Wait.delay(500);
      }
    }

    const opened = await IRCTCExt.Wait.poll(
      () => (IRCTCExt.IrctcPaymentsGateway.isCardFormVisible() ? true : null),
      { timeout: 15000, interval: 200 }
    );
    if (!opened) throw new Error('Cards payment form did not open');
    overlay?.setStatus('Cards section open — filling details...');
    return true;
  },

  async ensureSmartPayEnabled() {
    const sel = IRCTCExt.IrctcPaymentsGateway.getSelectors();
    const root = IRCTCExt.IrctcPaymentsGateway.getCardPanelRoot();
    const toggle = IRCTCExt.Wait.queryOne(sel.smartPayToggle, root);
    if (!toggle) return;
    if (!toggle.checked) {
      IRCTCExt.Events.click(toggle);
      await IRCTCExt.Wait.delay(200);
    }
  },

  hasVisibleCardErrors() {
    const sel = IRCTCExt.IrctcPaymentsGateway.getSelectors();
    for (const selector of sel.cardErrors || []) {
      const el = document.querySelector(selector);
      if (!el || !IRCTCExt.Wait.isVisible(el)) continue;
      if (el.classList.contains('hideErrFld')) continue;
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (text && !/^error\.{3}$/i.test(text)) return true;
      if (el.classList.contains('errorBorder')) return true;
    }
    return false;
  },

  async fillCardForm(card, overlay) {
    const sel = IRCTCExt.IrctcPaymentsGateway.getSelectors();
    const root = IRCTCExt.IrctcPaymentsGateway.getCardPanelRoot();
    const numberEl = IRCTCExt.Wait.queryOne(sel.cardNumberMasked, root);
    const monthEl = IRCTCExt.Wait.queryOne(sel.expiryMonth, root);
    const yearEl = IRCTCExt.Wait.queryOne(sel.expiryYear, root);
    const cvvEl = IRCTCExt.Wait.queryOne(sel.cvv, root);
    const nameEl = IRCTCExt.Wait.queryOne(sel.nameOnCard, root);

    if (!numberEl || !monthEl || !yearEl || !cvvEl || !nameEl) {
      throw new Error('Card form fields not found on IRCTC Payments gateway');
    }

    const cardNumber = String(card?.number || '').replace(/\s+/g, '');
    const { month, year } = IRCTCExt.IrctcPaymentsGateway.parseExpiryParts(card?.expiry);

    overlay?.setStatus('Filling card details...');
    await IRCTCExt.IrctcPaymentsGateway.fillGatewayInput(numberEl, cardNumber, { slow: true });
    await IRCTCExt.IrctcPaymentsGateway.fillSelect(monthEl, month);
    await IRCTCExt.IrctcPaymentsGateway.fillSelect(yearEl, year);
    await IRCTCExt.IrctcPaymentsGateway.fillGatewayInput(cvvEl, card?.cvv || '');
    await IRCTCExt.IrctcPaymentsGateway.fillGatewayInput(nameEl, card?.name || '');
    await IRCTCExt.Wait.delay(300);

    if (IRCTCExt.IrctcPaymentsGateway.hasVisibleCardErrors()) {
      throw new Error('Gateway rejected saved card details — check card number, expiry, CVV, and name');
    }
  },

  async openUpiAccordion(config, overlay) {
    const variant = IRCTCExt.IrctcPaymentsGateway.resolveUpiVariant(config);
    const upiSel = IRCTCExt.IrctcPaymentsGateway.getUpiSelectors(variant);

    const btn = await IRCTCExt.Wait.poll(
      () => {
        const candidate = IRCTCExt.Wait.queryOne(upiSel.accordionBtn);
        return candidate && IRCTCExt.Wait.isVisible(candidate) ? candidate : null;
      },
      { timeout: 20000, interval: 200 }
    );
    if (!btn) throw new Error('UPI accordion button not found on IRCTC Payments gateway');

    if (!IRCTCExt.IrctcPaymentsGateway.isUpiAccordionOpen(upiSel)) {
      overlay?.setStatus('Opening UPI payment section...');
      btn.scrollIntoView({ block: 'center', inline: 'nearest' });
      IRCTCExt.Events.click(btn);
      await IRCTCExt.Wait.delay(500);

      if (!IRCTCExt.IrctcPaymentsGateway.isUpiAccordionOpen(upiSel)) {
        IRCTCExt.Events.click(btn);
        await IRCTCExt.Wait.delay(500);
      }
    }

    const section = await IRCTCExt.Wait.poll(
      () => (IRCTCExt.IrctcPaymentsGateway.isUpiQrSectionVisible(upiSel) ? true : null),
      { timeout: 15000, interval: 200 }
    );
    if (!section) throw new Error('UPI payment section did not open');
    overlay?.setStatus('UPI section open — selecting QR...');
    return upiSel;
  },

  async selectQrPayment(upiSel, overlay) {
    overlay?.setStatus('Selecting QR payment...');

    const radio = await IRCTCExt.Wait.poll(
      () => {
        const root = IRCTCExt.Wait.queryOne(upiSel.qrSection) || document;
        const candidate = IRCTCExt.Wait.queryOne(upiSel.qrRadio, root);
        return candidate && IRCTCExt.Wait.isVisible(candidate) ? candidate : null;
      },
      { timeout: 15000, interval: 200 }
    );
    if (!radio) throw new Error('UPI QR payment option not found');

    if (!radio.checked) {
      IRCTCExt.Events.click(radio);
      const label = document.querySelector(`label[for="${radio.id}"]`);
      if (label) IRCTCExt.Events.click(label);
      await IRCTCExt.Wait.delay(400);
    }

    if (!radio.checked) {
      throw new Error('Could not select UPI QR payment option');
    }

    await IRCTCExt.Wait.delay(500);
  },

  findShowQrButton() {
    const sel = IRCTCExt.IrctcPaymentsGateway.getSelectors();
    const direct = IRCTCExt.Wait.queryAll(sel.upiShowQrBtn);
    for (const btn of direct) {
      if (!IRCTCExt.Wait.isVisible(btn) || btn.disabled) continue;
      if (/show\s*qr|click\s*here/i.test(btn.textContent || '')) return btn;
    }

    const buttons = document.querySelectorAll('button[data-click="showUpiQR"], #irctc-generate-qr-btn');
    for (const btn of buttons) {
      if (!IRCTCExt.Wait.isVisible(btn) || btn.disabled) continue;
      return btn;
    }

    return null;
  },

  isQrCodeVisible() {
    const sel = IRCTCExt.IrctcPaymentsGateway.getSelectors();
    for (const selector of sel.upiQrImage || []) {
      const el = document.querySelector(selector);
      if (!el || !IRCTCExt.Wait.isVisible(el)) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width > 40 && rect.height > 40) return true;
    }
    return false;
  },

  async clickShowQrButton(overlay) {
    overlay?.setStatus('Opening QR modal...');

    const showBtn = await IRCTCExt.Wait.poll(
      () => IRCTCExt.IrctcPaymentsGateway.findShowQrButton(),
      { timeout: 20000, interval: 250 }
    );
    if (!showBtn) throw new Error('Show QR button not found on IRCTC Payments gateway');

    overlay?.setStatus('Clicking Show QR...');
    showBtn.scrollIntoView({ block: 'center', inline: 'nearest' });
    IRCTCExt.Events.click(showBtn);
    await IRCTCExt.Wait.delay(600);

    const qrReady = await IRCTCExt.Wait.poll(
      () => {
        if (IRCTCExt.IrctcPaymentsGateway.isQrCodeVisible()) return true;
        const btn = IRCTCExt.IrctcPaymentsGateway.findShowQrButton();
        return btn ? null : true;
      },
      { timeout: 15000, interval: 300 }
    );

    if (!qrReady) {
      throw new Error('QR code did not appear after clicking Show QR');
    }

    return true;
  },

  findPayNowButton() {
    const sel = IRCTCExt.IrctcPaymentsGateway.getSelectors();
    const direct = IRCTCExt.Wait.queryAll(sel.payNowBtn);
    for (const btn of direct) {
      if (!IRCTCExt.Wait.isVisible(btn) || btn.disabled) continue;
      if (/pay\s*now/i.test(btn.textContent || '')) return btn;
    }

    const buttons = document.querySelectorAll('button');
    for (const btn of buttons) {
      if (!IRCTCExt.Wait.isVisible(btn) || btn.disabled) continue;
      if (btn.classList.contains('disabled')) continue;
      if (btn.getAttribute('aria-disabled') === 'true') continue;
      if (/pay\s*now/i.test(btn.textContent || '')) return btn;
    }

    return null;
  },

  async clickPayNow(overlay) {
    overlay?.setStatus('Clicking Pay Now...');
    const payBtn = await IRCTCExt.Wait.poll(
      () => IRCTCExt.IrctcPaymentsGateway.findPayNowButton(),
      { timeout: 15000, interval: 250 }
    );
    if (!payBtn) throw new Error('Pay Now button not found on IRCTC Payments gateway');

    IRCTCExt.Events.click(payBtn);
    await IRCTCExt.Wait.delay(600);
    return true;
  },

  async handleCardFlow(config, overlay) {
    const autoPay = IRCTCExt.BkgPayment.getAutoPaySettings(config);
    const type = autoPay.type === 'credit' ? 'credit' : 'debit';
    const card = autoPay.card;
    if (!card?.number) {
      throw new Error(`Saved ${type} card details are missing in extension popup`);
    }

    const maxAttempts = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        if (attempt > 1) {
          overlay?.setStatus(`Retrying card fill (${attempt}/${maxAttempts})...`);
          await IRCTCExt.Wait.delay(300);
        }

        await IRCTCExt.IrctcPaymentsGateway.openCardsAccordion(overlay);
        await IRCTCExt.IrctcPaymentsGateway.ensureSmartPayEnabled();
        await IRCTCExt.IrctcPaymentsGateway.fillCardForm(card, overlay);
        await IRCTCExt.IrctcPaymentsGateway.clickPayNow(overlay);
        await IRCTCExt.IrctcPaymentsGateway.finishGateway(
          overlay,
          'Card submitted — complete OTP/bank step manually.'
        );
        return true;
      } catch (err) {
        lastError = err;
        if (attempt >= maxAttempts) break;
      }
    }

    throw lastError || new Error('Could not complete card payment on IRCTC Payments gateway');
  },

  async handleQrFlow(config, overlay) {
    const upiSel = await IRCTCExt.IrctcPaymentsGateway.openUpiAccordion(config, overlay);
    await IRCTCExt.IrctcPaymentsGateway.selectQrPayment(upiSel, overlay);
    await IRCTCExt.IrctcPaymentsGateway.clickShowQrButton(overlay);
    await IRCTCExt.IrctcPaymentsGateway.finishGateway(
      overlay,
      'QR displayed — scan with your UPI app to complete payment.'
    );
    return true;
  },

  async handle(config, overlay) {
    await IRCTCExt.IrctcPaymentsGateway.waitForReady(overlay);

    const autoPay = IRCTCExt.BkgPayment.getAutoPaySettings(config);
    if (!autoPay.enabled) {
      await IRCTCExt.IrctcPaymentsGateway.finishGateway(
        overlay,
        'Auto pay disabled — complete payment manually on gateway.'
      );
      return true;
    }

    if (autoPay.type === 'credit' || autoPay.type === 'debit') {
      return IRCTCExt.IrctcPaymentsGateway.handleCardFlow(config, overlay);
    }

    const method = config.preferences?.paymentMethod || 'cards';
    if (autoPay.type === 'qr' || method === 'upi') {
      return IRCTCExt.IrctcPaymentsGateway.handleQrFlow(config, overlay);
    }

    if (method === 'cards') {
      return IRCTCExt.IrctcPaymentsGateway.handleCardFlow(config, overlay);
    }

    throw new Error(`Unsupported auto pay type: ${autoPay.type}`);
  }
};
