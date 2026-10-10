(function (root) {
  root.IRCTCExt = root.IRCTCExt || {};
  if (IRCTCExt.NgetReviewFlow) return;

  const sharedPrefs = () => IRCTCExt.PsgnPreferences;

  IRCTCExt.NgetReviewFlow = {
    getSelectors() {
      return IRCTCExt.SELECTORS?.review || IRCTCExt.NgetSelectors.review;
    },

    async waitForPassengerDetails() {
      const sel = IRCTCExt.NgetReviewFlow.getSelectors();
      const block = await IRCTCExt.Wait.poll(
        () => {
          const host = IRCTCExt.Wait.queryOne(sel.passengerDetailHost);
          if (!host || !IRCTCExt.Wait.isVisible(host)) return null;
          const content = IRCTCExt.Wait.queryOne(sel.passengerDetailContent, host);
          return content && IRCTCExt.Wait.isVisible(content) ? content : null;
        },
        { timeout: 20000, interval: 250 }
      );
      if (!block) throw new Error('Passenger details panel not found on review page');
      return block;
    },

    async showPassengerReviewPopup() {
      if (IRCTCExt.PaymentReviewOverlay?.showPassengerReview) {
        await IRCTCExt.PaymentReviewOverlay.showPassengerReview();
        return;
      }
      await IRCTCExt.NgetReviewFlow.waitForPassengerDetails();
    },

    findContinueButton() {
      const sel = IRCTCExt.NgetReviewFlow.getSelectors();
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

    isContinueEnabled(btn) {
      if (!btn || !IRCTCExt.Wait.isVisible(btn)) return false;
      if (btn.disabled) return false;
      if (btn.classList.contains('disabled')) return false;
      if (btn.getAttribute('aria-disabled') === 'true') return false;
      return true;
    },

    findConfirmationDialog() {
      const dialogs = document.querySelectorAll('[role="dialog"], .ui-dialog, .p-dialog');
      for (const dialog of dialogs) {
        if (!IRCTCExt.Wait.isVisible(dialog)) continue;
        const buttons = Array.from(dialog.querySelectorAll('button'));
        const hasContinue = buttons.some((btn) => {
          if (!IRCTCExt.Wait.isVisible(btn) || btn.disabled) return false;
          return /continue/i.test(btn.textContent || '');
        });
        if (hasContinue) return dialog;
      }
      return null;
    },

    findConfirmationContinueButton(root = document) {
      const buttons = Array.from(root.querySelectorAll('button'));
      return (
        buttons.find((btn) => {
          if (!IRCTCExt.Wait.isVisible(btn) || btn.disabled) return false;
          return /continue/i.test(btn.textContent || '');
        }) || null
      );
    },

    hasReachedPayment() {
      return IRCTCExt.NgetPaths.isPaymentPath(location.pathname);
    },

    async clickContinue(overlay) {
      overlay.setStatus('Waiting for Continue button...');

      const btn = await IRCTCExt.Wait.poll(
        () => {
          const candidate = IRCTCExt.NgetReviewFlow.findContinueButton();
          return candidate && IRCTCExt.NgetReviewFlow.isContinueEnabled(candidate) ? candidate : null;
        },
        { timeout: 20000, interval: 250 }
      );
      if (!btn) throw new Error('Continue button not found or still disabled');

      // Anti-bot pacing: dwell time before clicking Continue
      overlay.setStatus('Pacing before Continue (anti-bot delay)...');
      await IRCTCExt.Wait.delay(2000 + Math.floor(Math.random() * 1000));

      overlay.setStatus('Clicking Continue...');
      sharedPrefs().clickTarget(btn);
      await IRCTCExt.Wait.delay(800);
      return true;
    },

    async handleConfirmationIfNeeded(overlay) {
      const dialog = await IRCTCExt.Wait.poll(
        () => IRCTCExt.NgetReviewFlow.findConfirmationDialog(),
        { timeout: 5000, interval: 250 }
      );
      if (!dialog) return false;

      const btn = await IRCTCExt.Wait.poll(
        () => IRCTCExt.NgetReviewFlow.findConfirmationContinueButton(dialog),
        { timeout: 10000, interval: 250 }
      );
      if (!btn) return false;

      overlay.setStatus('Confirming booking review...');
      sharedPrefs().clickTarget(btn);
      await IRCTCExt.Wait.delay(500);
      return true;
    },

    async waitForNextStep(overlay, timeout = 60000) {
      if (IRCTCExt.NgetReviewFlow.hasReachedPayment()) return true;

      overlay.setStatus('Waiting for payment page...');
      const reached = await IRCTCExt.Wait.poll(
        () => {
          if (IRCTCExt.NgetReviewFlow.hasReachedPayment()) return true;
          const dialog = IRCTCExt.NgetReviewFlow.findConfirmationDialog();
          return dialog ? 'confirm' : null;
        },
        { timeout, interval: 500 }
      );

      if (reached === 'confirm') {
        await IRCTCExt.NgetReviewFlow.handleConfirmationIfNeeded(overlay);
        return IRCTCExt.NgetReviewFlow.waitForNextStep(overlay, timeout);
      }

      if (!reached) throw new Error('Did not reach payment page after review Continue');
      return true;
    },

    async run(overlay) {
      overlay.setStep('Review');
      overlay.setStatus('Loading passenger details...');

      await IRCTCExt.NgetReviewFlow.waitForPassengerDetails();
      await IRCTCExt.NgetReviewFlow.showPassengerReviewPopup();
      await IRCTCExt.Wait.delay(400);

      await IRCTCExt.NgetReviewFlow.clickContinue(overlay);
      await IRCTCExt.NgetReviewFlow.waitForNextStep(overlay);

      overlay.setStatus('Review complete — on payment page.');
      return true;
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
