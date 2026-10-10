window.IRCTCExt = window.IRCTCExt || {};

IRCTCExt.PsgnPreferences = {
  isOptionSelected(optionRow) {
    if (!optionRow) return false;
    const box = optionRow.querySelector('.ui-radiobutton-box, [role="radio"]');
    if (box?.classList.contains('ui-state-active')) return true;
    if (box?.getAttribute('aria-checked') === 'true') return true;
    if (optionRow.classList.contains('loyalty-option-active')) return true;
    if (optionRow.classList.contains('selected')) return true;
    const input = optionRow.querySelector('input[type="radio"]');
    return !!input?.checked;
  },

  findLoyaltySkipOption(section) {
    const options = section.querySelectorAll('.loyalty-option');
    for (const option of options) {
      const label = option.querySelector('.loyalty-label, label');
      if (label && /^\s*skip\s*$/i.test(label.textContent || '')) return option;
    }

    const skipInput = section.querySelector('input[name="loyalityOperationType"][value="3"]');
    if (skipInput) return skipInput.closest('.loyalty-option');

    const skipLabel = section.querySelector('label[for="lo-3"]');
    if (skipLabel) return skipLabel.closest('.loyalty-option');

    return null;
  },

  findPaymentOption(section, method) {
    const options = section.querySelectorAll('.payment-option');
    for (const option of options) {
      const label = option.querySelector('.payment-label');
      const text = (label?.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      if (method === 'upi') {
        if (/bhim\/?upi|pay through bhim/.test(text)) return option;
      } else if (/credit.*debit|net banking|wallets|rewards and others/.test(text)) {
        return option;
      }
    }

    const value = method === 'upi' ? '2' : '3';
    const input = section.querySelector(`input[name="payment"][value="${value}"]`);
    if (input) return input.closest('.payment-option');

    const id = method === 'upi' ? 'payment-option-1' : 'payment-option-0';
    const byId = section.querySelector(`#${id}`);
    if (byId) return byId.closest('.payment-option');

    return null;
  },

  findOptionRow(inputEl) {
    if (!inputEl) return null;
    return inputEl.closest('.loyalty-option, .payment-option');
  },

  clickTarget(el) {
    if (!el) return;
    el.scrollIntoView({ block: 'center', inline: 'nearest' });
    IRCTCExt.Events.click(el);
  },

  clickPrimeNgRadio(optionEl) {
    if (!optionEl) return;
    optionEl.scrollIntoView({ block: 'center', inline: 'nearest' });

    // Pick single primary target instead of rapid multi-clicking
    const box = optionEl.querySelector('.ui-radiobutton-box, [role="radio"]');
    const label = optionEl.querySelector('.loyalty-label, .payment-label, label');
    const input = optionEl.querySelector('input[type="radio"]');
    const target = box || label || input || optionEl;

    this.clickTarget(target);

    // Sync input state if needed without extra synthetic spam
    if (input && !input.checked) {
      input.checked = true;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  },

  async selectRadioWithRetry(optionRow, label, maxAttempts = 6) {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      if (this.isOptionSelected(optionRow)) return true;
      this.clickPrimeNgRadio(optionRow);
      await IRCTCExt.Wait.delay(350);
    }
    return this.isOptionSelected(optionRow);
  },

  async selectLoyaltySkip(overlay) {
    const sel = IRCTCExt.SELECTORS.psgnPreferences;
    overlay.setStatus('Selecting loyalty option: Skip...');

    const section = await IRCTCExt.Wait.waitFor(sel.loyaltySection, { timeout: 15000, visible: true });
    if (!section) throw new Error('IRCTC Co-branded Card Benefits section not found');

    const optionRow = await IRCTCExt.Wait.poll(
      () => {
        const row = this.findLoyaltySkipOption(section);
        return row && IRCTCExt.Wait.isVisible(row) ? row : null;
      },
      { timeout: 10000, interval: 200 }
    );
    if (!optionRow) throw new Error('Loyalty Skip option not found');

    const selected = await this.selectRadioWithRetry(optionRow, 'Skip');
    if (!selected) throw new Error('Could not select loyalty Skip option');
  },

  async selectPaymentMethod(config, overlay) {
    const sel = IRCTCExt.SELECTORS.psgnPreferences;
    const method = config.preferences?.paymentMethod || 'cards';
    overlay.setStatus(method === 'upi' ? 'Selecting BHIM/UPI payment...' : 'Selecting Cards/Net Banking payment...');

    const section = await IRCTCExt.Wait.waitFor(sel.paymentSection, { timeout: 15000, visible: true });
    if (!section) throw new Error('Payment Options section not found');

    const optionRow = await IRCTCExt.Wait.poll(
      () => {
        const row = this.findPaymentOption(section, method);
        return row && IRCTCExt.Wait.isVisible(row) ? row : null;
      },
      { timeout: 10000, interval: 200 }
    );
    if (!optionRow) throw new Error(`Payment option not found: ${method}`);

    const selected = await this.selectRadioWithRetry(optionRow, method);
    if (!selected) throw new Error(`Could not select payment option: ${method}`);

    await IRCTCExt.Wait.delay(400);
  },

  findCalculateFareButton() {
    const sel = IRCTCExt.SELECTORS.psgnPreferences;
    const direct = IRCTCExt.Wait.queryOne(sel.calculateFareBtn);
    if (direct && IRCTCExt.Wait.isVisible(direct)) return direct;

    const buttons = Array.from(document.querySelectorAll('button'));
    return (
      buttons.find((btn) => /calculate fare/i.test(btn.textContent || '') && IRCTCExt.Wait.isVisible(btn)) ||
      null
    );
  },

  isCalculateFareEnabled(btn) {
    if (!btn) return false;
    if (btn.disabled) return false;
    if (btn.classList.contains('disabled')) return false;
    if (btn.getAttribute('aria-disabled') === 'true') return false;
    return IRCTCExt.Wait.isVisible(btn);
  },

  isCalculateFareProcessing(btn) {
    if (!btn || !IRCTCExt.Wait.isVisible(btn)) return false;
    const text = (btn.textContent || '').trim();
    if (/processing|calculating/i.test(text)) return true;
    if (btn.classList.contains('ui-button-loading')) return true;
    if (btn.querySelector('.pi-spin, .spinner, [class*="loading"]')) return true;
    const parent = btn.closest('.review-actions, .cta-row, button');
    if (parent?.querySelector?.('.pi-spin, .spinner, [class*="loading"]')) return true;
    if ((btn.disabled || btn.getAttribute('aria-disabled') === 'true') && /calculate fare/i.test(text)) {
      return true;
    }
    return false;
  },

  getPostCalculateFareDestination() {
    if (location.pathname.includes('bkgPaymentOptions')) return 'payment';
    if (location.pathname.includes('reviewBooking')) return 'review';
    return null;
  },

  async waitForPostCalculateFarePage(overlay, timeout = 60000) {
    const existing = this.getPostCalculateFareDestination();
    if (existing) return existing;

    overlay.setStatus('Waiting for review or payment page...');
    const destination = await IRCTCExt.Wait.poll(
      () => {
        const waf = IRCTCExt.Modals?.detectWafOrServerError?.();
        if (waf) return 'waf_blocked';
        return this.getPostCalculateFareDestination();
      },
      { timeout, interval: 500 }
    );
    if (destination === 'waf_blocked') {
      const waf = IRCTCExt.Modals?.detectWafOrServerError?.();
      throw new Error(`Akamai WAF block: ${waf?.message || 'Unable to Process Request !!'}`);
    }
    if (!destination) {
      throw new Error('Did not reach review booking or payment page after Calculate Fare');
    }
    return destination;
  },

  readAvailabilityStatus() {
    const sel = IRCTCExt.SELECTORS.psgnPreferences;
    const el = IRCTCExt.Wait.queryOne(sel.availabilityStatus);
    if (!el || !IRCTCExt.Wait.isVisible(el)) return '';
    return (el.textContent || '').replace(/\s+/g, ' ').trim();
  },

  isSessionRestoreModal(host) {
    if (!host) return false;
    const sel = IRCTCExt.SELECTORS.psgnPreferences;
    const title = IRCTCExt.Wait.queryOne(sel.reviewConfirmTitle, host);
    if (!title) return false;
    return /session\s*restore/i.test(title.textContent || '');
  },

  findReviewConfirmModal() {
    const sel = IRCTCExt.SELECTORS.psgnPreferences;

    for (const host of IRCTCExt.Wait.queryAll(sel.reviewConfirmHost)) {
      if (!IRCTCExt.Wait.isVisible(host)) continue;
      if (this.isSessionRestoreModal(host)) continue;

      const card = IRCTCExt.Wait.queryOne(sel.reviewConfirmCard, host);
      if (card && IRCTCExt.Wait.isVisible(card)) return { host, card };
    }

    const dialogs = document.querySelectorAll('[role="dialog"], .ui-dialog, .p-dialog, .bc-overlay');
    for (const dialog of dialogs) {
      if (!IRCTCExt.Wait.isVisible(dialog)) continue;
      const buttons = Array.from(dialog.querySelectorAll('button'));
      const hasContinue = buttons.some(
        (btn) => /continue\s*(to\s*)?payment/i.test(btn.textContent || '') && IRCTCExt.Wait.isVisible(btn)
      );
      if (hasContinue) return { host: dialog, card: dialog };
    }

    return null;
  },

  findReviewConfirmContinueButton(root = document) {
    const sel = IRCTCExt.SELECTORS.psgnPreferences;
    const direct = IRCTCExt.Wait.queryOne(sel.reviewConfirmContinue, root);
    if (direct && IRCTCExt.Wait.isVisible(direct) && !direct.disabled) return direct;

    const buttons = Array.from(root.querySelectorAll('button'));
    return (
      buttons.find(
        (btn) =>
          /continue\s*(to\s*)?payment/i.test(btn.textContent || '') &&
          IRCTCExt.Wait.isVisible(btn) &&
          !btn.disabled
      ) || null
    );
  },

  async waitForReviewConfirmModal(overlay, timeout = 20000) {
    overlay.setStatus('Waiting for booking review confirmation...');
    const modal = await IRCTCExt.Wait.poll(() => this.findReviewConfirmModal(), {
      timeout,
      interval: 250
    });
    if (!modal) throw new Error('Booking review confirmation popup did not appear');
    return modal;
  },

  async clickReviewConfirmContinue(overlay, modalRoot) {
    const root = modalRoot?.card || modalRoot?.host || document;
    const btn = await IRCTCExt.Wait.poll(() => this.findReviewConfirmContinueButton(root), {
      timeout: 10000,
      interval: 250
    });
    if (!btn) throw new Error('Continue to payment button not found in confirmation popup');

    overlay.setStatus('Confirming booking review...');
    this.clickTarget(btn);
    await IRCTCExt.Wait.delay(500);
  },

  async waitForPaymentPage(overlay, timeout = 60000) {
    if (location.pathname.includes('bkgPaymentOptions')) return true;

    overlay.setStatus('Waiting for payment page...');
    const reached = await IRCTCExt.Wait.poll(
      () => (location.pathname.includes('bkgPaymentOptions') ? true : null),
      { timeout, interval: 500 }
    );
    if (!reached) throw new Error('Did not reach payment page after review confirmation');
    return true;
  },

  async clickCalculateFare(overlay) {
    const destination = this.getPostCalculateFareDestination();
    if (destination) return destination;

    const existing = this.findCalculateFareButton();
    if (existing && this.isCalculateFareProcessing(existing)) {
      overlay.setStatus('Calculate Fare is processing...');
      return this.waitForPostCalculateFarePage(overlay);
    }

    overlay.setStatus('Waiting for Calculate Fare button...');

    const btn = await IRCTCExt.Wait.poll(
      () => {
        const waf = IRCTCExt.Modals?.detectWafOrServerError?.();
        if (waf) return 'waf_blocked';
        const candidate = this.findCalculateFareButton();
        if (!candidate) return null;
        if (this.isCalculateFareProcessing(candidate)) return 'processing';
        if (this.isCalculateFareEnabled(candidate)) return candidate;
        return null;
      },
      { timeout: 20000, interval: 250 }
    );

    if (btn === 'waf_blocked') {
      const waf = IRCTCExt.Modals?.detectWafOrServerError?.();
      throw new Error(`Akamai WAF block: ${waf?.message || 'Unable to Process Request !!'}`);
    }
    if (btn === 'processing') {
      overlay.setStatus('Calculate Fare is processing...');
      return this.waitForPostCalculateFarePage(overlay);
    }
    if (!btn) throw new Error('Calculate Fare button not found or still disabled');

    // Anti-bot pacing: satisfy Akamai minimum dwell time threshold
    overlay.setStatus('Pacing before fare calculation (anti-bot delay)...');
    await IRCTCExt.Wait.delay(2500 + Math.floor(Math.random() * 1000));

    overlay.setStatus('Clicking Calculate Fare...');
    this.clickTarget(btn);
    return this.waitForPostCalculateFarePage(overlay);
  },

  findContinueToPaymentButton() {
    const sel = IRCTCExt.SELECTORS.psgnPreferences;
    const direct = IRCTCExt.Wait.queryOne(sel.continueToPaymentBtn);
    if (direct && IRCTCExt.Wait.isVisible(direct)) return direct;

    const buttons = Array.from(document.querySelectorAll('button'));
    return (
      buttons.find(
        (btn) => /continue\s*to\s*payment/i.test(btn.textContent || '') && IRCTCExt.Wait.isVisible(btn)
      ) || null
    );
  },

  isContinueToPaymentEnabled(btn) {
    if (!btn) return false;
    if (btn.disabled) return false;
    if (btn.classList.contains('disabled')) return false;
    if (btn.getAttribute('aria-disabled') === 'true') return false;
    return IRCTCExt.Wait.isVisible(btn);
  },

  async clickContinueToPayment(overlay) {
    if (location.pathname.includes('bkgPaymentOptions')) {
      return this.waitForPaymentPage(overlay);
    }

    overlay.setStep('Review');

    const availability = this.readAvailabilityStatus();
    if (availability) {
      overlay.setStatus(`Availability: ${availability}`);
      await IRCTCExt.Wait.delay(400);
    }

    overlay.setStatus('Waiting for Continue To Payment button...');

    const btn = await IRCTCExt.Wait.poll(
      () => {
        const waf = IRCTCExt.Modals?.detectWafOrServerError?.();
        if (waf) return 'waf_blocked';
        const candidate = this.findContinueToPaymentButton();
        return candidate && this.isContinueToPaymentEnabled(candidate) ? candidate : null;
      },
      { timeout: 20000, interval: 250 }
    );
    if (btn === 'waf_blocked') {
      const waf = IRCTCExt.Modals?.detectWafOrServerError?.();
      throw new Error(`Akamai WAF block: ${waf?.message || 'Unable to Process Request !!'}`);
    }
    if (!btn) throw new Error('Continue To Payment button not found or still disabled');

    // Anti-bot pacing
    overlay.setStatus('Pacing before Continue to payment (anti-bot delay)...');
    await IRCTCExt.Wait.delay(2500 + Math.floor(Math.random() * 1000));

    overlay.setStatus('Clicking Continue To Payment...');
    this.clickTarget(btn);
    await IRCTCExt.Wait.delay(800);

    const afterClick = await IRCTCExt.Wait.poll(
      () => {
        const waf = IRCTCExt.Modals?.detectWafOrServerError?.();
        if (waf) return 'waf_blocked';
        if (location.pathname.includes('bkgPaymentOptions')) return 'payment';
        const modal = this.findReviewConfirmModal();
        if (modal) return modal;
        return null;
      },
      { timeout: 20000, interval: 250 }
    );

    if (afterClick === 'waf_blocked') {
      const waf = IRCTCExt.Modals?.detectWafOrServerError?.();
      throw new Error(`Akamai WAF block: ${waf?.message || 'Unable to Process Request !!'}`);
    }
    if (afterClick === 'payment') {
      return this.waitForPaymentPage(overlay);
    }
    if (!afterClick) throw new Error('Booking review confirmation popup did not appear');

    await this.clickReviewConfirmContinue(overlay, afterClick);
    await this.waitForPaymentPage(overlay);
  },

  async configure(config, overlay) {
    overlay.setStep('Review');
    await IRCTCExt.Wait.delay(600);
    await this.selectLoyaltySkip(overlay);
    await IRCTCExt.Wait.delay(400);
    await this.selectPaymentMethod(config, overlay);
    await IRCTCExt.Wait.delay(1000 + Math.floor(Math.random() * 500));
    const destination = await this.clickCalculateFare(overlay);
    overlay.setStatus(
      destination === 'payment' ? 'Fare calculated — on payment page.' : 'Fare calculated.'
    );
    return true;
  }
};
