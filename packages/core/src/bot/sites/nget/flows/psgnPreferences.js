(function (root) {
  root.IRCTCExt = root.IRCTCExt || {};
  if (IRCTCExt.NgetPsgnPreferencesFlow) return;

  const sharedPrefs = () => IRCTCExt.PsgnPreferences;

  IRCTCExt.NgetPsgnPreferencesFlow = {
    getSelectors() {
      return IRCTCExt.SELECTORS?.psgnPreferences || IRCTCExt.NgetSelectors.psgnPreferences;
    },

    findPaymentPanel() {
      const titles = IRCTCExt.Wait.queryAll(IRCTCExt.NgetPsgnPreferencesFlow.getSelectors().paymentPanelTitle);
      for (const title of titles) {
        if (!IRCTCExt.Wait.isVisible(title)) continue;
        const text = (title.textContent || '').replace(/\s+/g, ' ').trim();
        if (/payment\s*mode/i.test(text)) {
          return title.closest('p-panel') || title.closest('.ui-panel') || title.parentElement;
        }
      }
      return null;
    },

    findPaymentInput(method) {
      const sel = IRCTCExt.NgetPsgnPreferencesFlow.getSelectors();
      const value = method === 'upi' ? '2' : '3';
      const selectors = method === 'upi' ? sel.paymentTypeUpi : sel.paymentTypeCards;
      const panel = IRCTCExt.NgetPsgnPreferencesFlow.findPaymentPanel();
      const root = panel || document;

      const input = IRCTCExt.Wait.queryOne(selectors, root);
      if (input) return input;

      return IRCTCExt.Wait.queryOne(`input[name="paymentType"][value="${value}"]`, root);
    },

    findPaymentOption(method) {
      const input = IRCTCExt.NgetPsgnPreferencesFlow.findPaymentInput(method);
      if (!input) return null;

      return (
        input.closest('tr') ||
        input.closest('label') ||
        input.closest('p-radiobutton') ||
        sharedPrefs()?.findOptionRow?.(input) ||
        input.parentElement
      );
    },

    isPaymentOptionSelected(method) {
      const input = IRCTCExt.NgetPsgnPreferencesFlow.findPaymentInput(method);
      if (!input) return false;

      const optionRow = IRCTCExt.NgetPsgnPreferencesFlow.findPaymentOption(method);
      if (optionRow && sharedPrefs()?.isOptionSelected?.(optionRow)) return true;

      if (input.checked) return true;

      const box = input.closest('p-radiobutton')?.querySelector('.ui-radiobutton-box, [role="radio"]');
      return !!(
        box?.classList.contains('ui-state-active') || box?.getAttribute('aria-checked') === 'true'
      );
    },

    async selectPaymentMethod(config, overlay) {
      const method = config.preferences?.paymentMethod || 'cards';
      overlay.setStatus(
        method === 'upi' ? 'Selecting BHIM/UPI payment...' : 'Selecting Cards/Net Banking payment...'
      );

      const panel = await IRCTCExt.Wait.poll(
        () => IRCTCExt.NgetPsgnPreferencesFlow.findPaymentPanel(),
        { timeout: 15000, interval: 200 }
      );
      if (!panel) throw new Error('Payment Mode section not found');

      const optionRow = await IRCTCExt.Wait.poll(
        () => {
          const row = IRCTCExt.NgetPsgnPreferencesFlow.findPaymentOption(method);
          return row && IRCTCExt.Wait.isVisible(row) ? row : null;
        },
        { timeout: 10000, interval: 200 }
      );
      if (!optionRow) throw new Error(`Payment option not found: ${method}`);

      const selected = await sharedPrefs().selectRadioWithRetry(optionRow, method);
      if (!selected) throw new Error(`Could not select payment option: ${method}`);

      await IRCTCExt.Wait.delay(400);
      return true;
    },

    findContinueButton() {
      const sel = IRCTCExt.NgetPsgnPreferencesFlow.getSelectors();
      const candidates = IRCTCExt.Wait.queryAll(sel.continueBtn);
      for (const btn of candidates) {
        if (!IRCTCExt.Wait.isVisible(btn)) continue;
        const text = (btn.textContent || '').replace(/\s+/g, ' ').trim();
        if (/^\s*continue\s*$/i.test(text)) return btn;
      }

      const buttons = Array.from(document.querySelectorAll('button.train_Search.btnDefault'));
      return (
        buttons.find((btn) => {
          if (!IRCTCExt.Wait.isVisible(btn)) return false;
          const text = (btn.textContent || '').replace(/\s+/g, ' ').trim();
          return /^\s*continue\s*$/i.test(text);
        }) || null
      );
    },

    isPageProcessing() {
      const blockers = document.querySelectorAll(
        '.ui-blockui, .ui-blockui-document, .p-blockui, .p-blockui-document, .ui-widget-overlay'
      );
      for (const el of blockers) {
        if (IRCTCExt.Wait.isVisible(el)) return true;
      }

      const dialogs = document.querySelectorAll('[role="dialog"], .ui-dialog, .p-dialog');
      for (const dialog of dialogs) {
        if (!IRCTCExt.Wait.isVisible(dialog)) continue;
        const text = (dialog.textContent || '').replace(/\s+/g, ' ').trim();
        if (/please\s*wait/i.test(text)) return true;
      }

      return false;
    },

    isContinueEnabled(btn) {
      if (IRCTCExt.NgetPsgnPreferencesFlow.isPageProcessing()) return false;
      if (!btn || !IRCTCExt.Wait.isVisible(btn)) return false;
      if (btn.disabled) return false;
      if (btn.classList.contains('disabled')) return false;
      if (btn.getAttribute('aria-disabled') === 'true') return false;
      return true;
    },

    hasLeftPsgninput() {
      const path = location.pathname;
      if (!path.includes('psgninput')) return true;
      if (IRCTCExt.NgetPaths.isReviewPath(path)) return true;
      if (IRCTCExt.NgetPaths.isPaymentPath(path)) return true;
      return false;
    },

    async clickContinue(overlay) {
      overlay.setStatus('Waiting for Continue button...');

      const btn = await IRCTCExt.Wait.poll(
        () => {
          const candidate = IRCTCExt.NgetPsgnPreferencesFlow.findContinueButton();
          return candidate && IRCTCExt.NgetPsgnPreferencesFlow.isContinueEnabled(candidate)
            ? candidate
            : null;
        },
        { timeout: 20000, interval: 250 }
      );
      if (!btn) throw new Error('Continue button not found or still disabled');

      overlay.setStatus('Clicking Continue...');
      sharedPrefs().clickTarget(btn);
      await IRCTCExt.Storage.updateState({ psgnPaymentContinueClicked: true });
      await IRCTCExt.Wait.delay(800);

      const navigated = await IRCTCExt.Wait.poll(
        () => (IRCTCExt.NgetPsgnPreferencesFlow.hasLeftPsgninput() ? true : null),
        { timeout: 30000, interval: 300 }
      );
      if (!navigated) throw new Error('Did not leave passenger page after clicking Continue');
      await IRCTCExt.Storage.updateState({ psgnPaymentContinueClicked: false });
      return true;
    },

    async waitAfterContinueClick(overlay, timeout = 90000) {
      overlay.setStatus('IRCTC is processing — please wait...');
      const reached = await IRCTCExt.Wait.poll(
        () => {
          if (IRCTCExt.NgetPsgnPreferencesFlow.hasLeftPsgninput()) return true;
          if (IRCTCExt.NgetPaths.isReviewPath(location.pathname)) return true;
          if (IRCTCExt.NgetPaths.isPaymentPath(location.pathname)) return true;
          if (IRCTCExt.NgetPsgnPreferencesFlow.isPageProcessing()) return null;
          return null;
        },
        { timeout, interval: 400 }
      );
      if (!reached) {
        throw new Error('Timed out waiting for IRCTC after Continue on payment mode');
      }
      await IRCTCExt.Storage.updateState({ psgnPaymentContinueClicked: false });
      return true;
    },

    async configure(config, overlay) {
      const stored = await IRCTCExt.Storage.get();
      if (
        stored.state?.psgnPaymentContinueClicked ||
        IRCTCExt.NgetPsgnPreferencesFlow.isPageProcessing()
      ) {
        return IRCTCExt.NgetPsgnPreferencesFlow.waitAfterContinueClick(overlay);
      }

      overlay.setStep('Review');
      await IRCTCExt.Wait.delay(600);

      await IRCTCExt.NgetPassengersFlow.reviewPassengers(config, overlay);
      await IRCTCExt.Wait.delay(400);

      await IRCTCExt.NgetPsgnPreferencesFlow.selectPaymentMethod(config, overlay);
      await IRCTCExt.Wait.delay(400);

      await IRCTCExt.NgetPsgnPreferencesFlow.clickContinue(overlay);
      overlay.setStatus('Passenger review complete — continuing...');
      return true;
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
