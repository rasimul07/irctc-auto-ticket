window.IRCTCExt = window.IRCTCExt || {};

IRCTCExt.EticketLoginFlow = {
  headerLoginButton() {
    const buttons = IRCTCExt.Wait.queryAll(IRCTCExt.SELECTORS.loginHeaderBtn);
    return buttons.find(
      (btn) =>
        !btn.closest('#newLogin, .login-dialog, .login-wrapper, .login-form, .login-slider, .login-slider-viewport') &&
        (btn.textContent || '').toUpperCase().includes('LOGIN')
    );
  },

  isLoginModalOpen() {
    const modal = IRCTCExt.Wait.queryVisibleOne(IRCTCExt.SELECTORS.loginModal);
    return !!modal;
  },

  getActiveLoginPanel() {
    const panels = Array.from(document.querySelectorAll('.login-panel'));
    const visiblePanel = panels.find((p) => IRCTCExt.Wait.isVisible(p));
    return visiblePanel || document.querySelector('.login-wrapper') || document;
  },

  hasChallenge() {
    const captcha = IRCTCExt.Wait.queryVisibleOne(IRCTCExt.SELECTORS.loginCaptcha);
    if (captcha) return true;
    const otp = IRCTCExt.Wait.queryVisibleOne([
      'input[placeholder*="OTP" i]',
      'input[formcontrolname*="otp" i]',
      'input[name*="otp" i]'
    ]);
    return !!otp;
  },

  async isLoggedIn() {
    if (IRCTCExt.Wait.queryVisibleOne(IRCTCExt.SELECTORS.loggedInProfile)) return true;
    if (IRCTCExt.EticketLoginFlow.isLoginModalOpen()) return false;
    const openForm = IRCTCExt.Wait.queryVisibleOne([
      '#newLogin .login-form',
      '.login-dialog .login-form',
      '.login-wrapper .login-form',
      '.login-slider'
    ]);
    if (openForm) return false;
    if (IRCTCExt.EticketLoginFlow.headerLoginButton()) return false;
    const oldLogin = document.querySelector('a.search_btn.loginText');
    if (oldLogin && oldLogin.textContent.toUpperCase().includes('LOGIN')) return false;
    return !IRCTCExt.EticketLoginFlow.headerLoginButton();
  },

  async dismissTour() {
    IRCTCExt.Modals?.dismissTour?.();
    const skipBtn = document.querySelector('.home-tour-actions .home-tour-skip, button.home-tour-skip, .home-tour-skip');
    if (skipBtn && !skipBtn.dataset?.tourDismissed) {
      skipBtn.dataset.tourDismissed = '1';
      try {
        IRCTCExt.Events?.click ? IRCTCExt.Events.click(skipBtn) : skipBtn.click();
      } catch (_) {
        skipBtn.click?.();
      }
      await IRCTCExt.Wait.delay(300);
      return true;
    }
    const buttons = Array.from(document.querySelectorAll('.home-tour-actions button, .home-tour button'));
    const textSkip = buttons.find((btn) => /skip\s*tour/i.test(btn.textContent || '') && !btn.dataset?.tourDismissed);
    if (textSkip) {
      textSkip.dataset.tourDismissed = '1';
      try {
        IRCTCExt.Events?.click ? IRCTCExt.Events.click(textSkip) : textSkip.click();
      } catch (_) {
        textSkip.click?.();
      }
      await IRCTCExt.Wait.delay(300);
      return true;
    }
    return false;
  },

  async openLoginModal() {
    await IRCTCExt.EticketLoginFlow.dismissTour();

    if (!IRCTCExt.EticketLoginFlow.isLoginModalOpen()) {
      const loginBtn = IRCTCExt.EticketLoginFlow.headerLoginButton();
      if (loginBtn) {
        IRCTCExt.Events.click(loginBtn);
        await IRCTCExt.Wait.delay(600);
      }
    }
    await IRCTCExt.Wait.waitFor(IRCTCExt.SELECTORS.loginModal, { timeout: 8000, visible: true });

    const tabs = Array.from(document.querySelectorAll('.login-tab'));
    const userTab = tabs.find((tab) => (tab.textContent || '').toUpperCase().includes('USER'));
    if (userTab && !userTab.classList.contains('active')) {
      IRCTCExt.Events.click(userTab);
      await IRCTCExt.Wait.delay(300);
    }
  },

  async fillCredential(input, value) {
    if (!input || !value) return;
    input.focus();
    IRCTCExt.Events.setInputValue(input, value, { blur: true });
    await IRCTCExt.Wait.delay(100);
    if (!input.value) {
      await IRCTCExt.Events.typeSlowly(input, value, 40);
    }
  },

  async waitForEnabledSubmit(panel) {
    const root = panel || document;
    return IRCTCExt.Wait.poll(
      () => {
        const submit = IRCTCExt.Wait.queryVisibleOne(IRCTCExt.SELECTORS.loginSubmit, root);
        if (!submit) return null;
        if (submit.classList.contains('disabled-state') || submit.disabled || submit.getAttribute('disabled') !== null) {
          return null;
        }
        return submit;
      },
      { timeout: 8000, interval: 150 }
    );
  },

  async waitForCaptchaContinue(overlay, panel) {
    overlay.setStatus('CAPTCHA or OTP required. Complete it, then click Continue.');
    await IRCTCExt.Storage.updateState({ currentStep: 'login-captcha', paused: true });
    await new Promise((resolve) => {
      overlay.showPause('Complete CAPTCHA or OTP in the login form, then click Continue.', async () => {
        const submit = IRCTCExt.Wait.queryVisibleOne(IRCTCExt.SELECTORS.loginSubmit, panel || document);
        if (submit && !submit.classList.contains('disabled-state') && !submit.disabled) {
          IRCTCExt.Events.click(submit);
        }
        await IRCTCExt.Storage.updateState({ paused: false });
        await IRCTCExt.Wait.delay(1500);
        resolve();
      });
    });
  },

  async run(config, overlay) {
    await IRCTCExt.EticketLoginFlow.dismissTour();

    await IRCTCExt.Wait.poll(
      () =>
        IRCTCExt.EticketLoginFlow.isLoginModalOpen() ||
        IRCTCExt.EticketLoginFlow.headerLoginButton() ||
        IRCTCExt.Wait.queryVisibleOne(IRCTCExt.SELECTORS.loggedInProfile) ||
        document.querySelector('a.search_btn.loginText') ||
        IRCTCExt.Wait.queryVisibleOne(IRCTCExt.SELECTORS.searchFrom),
      { timeout: 12000, interval: 200 }
    );

    if (await IRCTCExt.EticketLoginFlow.isLoggedIn()) {
      overlay.setStatus('Already logged in');
      return true;
    }

    overlay.setStep('Login');
    if (IRCTCExt.EticketLoginFlow.isLoginModalOpen()) {
      overlay.setStatus('Login dialog open — filling credentials...');
    } else {
      overlay.setStatus('Opening login...');
      await IRCTCExt.EticketLoginFlow.openLoginModal();
    }

    const activePanel = IRCTCExt.EticketLoginFlow.getActiveLoginPanel();
    const userInput =
      (await IRCTCExt.Wait.waitFor(IRCTCExt.SELECTORS.loginUsername, {
        timeout: 10000,
        visible: true,
        root: activePanel
      })) ||
      (await IRCTCExt.Wait.waitFor(IRCTCExt.SELECTORS.loginUsername, {
        timeout: 4000,
        visible: true
      }));

    const passInput =
      (await IRCTCExt.Wait.waitFor(IRCTCExt.SELECTORS.loginPassword, {
        timeout: 10000,
        visible: true,
        root: activePanel
      })) ||
      (await IRCTCExt.Wait.waitFor(IRCTCExt.SELECTORS.loginPassword, {
        timeout: 4000,
        visible: true
      }));

    if (!userInput || !passInput) throw new Error('Login form not found');

    overlay.setStatus('Filling username and password...');
    await IRCTCExt.EticketLoginFlow.fillCredential(userInput, config.credentials.username);
    await IRCTCExt.EticketLoginFlow.fillCredential(passInput, config.credentials.password);

    if (IRCTCExt.EticketLoginFlow.hasChallenge()) {
      await IRCTCExt.EticketLoginFlow.waitForCaptchaContinue(overlay, activePanel);
    } else {
      const submit = await IRCTCExt.EticketLoginFlow.waitForEnabledSubmit(activePanel);
      if (!submit) throw new Error('Login button stayed disabled');
      overlay.setStatus('Submitting login...');
      IRCTCExt.Events.click(submit);
      await IRCTCExt.Wait.delay(1000);

      if (IRCTCExt.EticketLoginFlow.hasChallenge()) {
        await IRCTCExt.EticketLoginFlow.waitForCaptchaContinue(overlay, activePanel);
      }
    }

    overlay.setStatus('Verifying login...');
    const loggedIn = await IRCTCExt.Wait.poll(
      async () => {
        if (await IRCTCExt.EticketLoginFlow.isLoggedIn()) return true;
        if (IRCTCExt.EticketLoginFlow.hasChallenge()) return 'challenge';
        return null;
      },
      { timeout: 25000, interval: 400 }
    );

    if (loggedIn === 'challenge') {
      await IRCTCExt.EticketLoginFlow.waitForCaptchaContinue(overlay, activePanel);
      await IRCTCExt.Wait.poll(() => IRCTCExt.EticketLoginFlow.isLoggedIn(), { timeout: 25000, interval: 400 });
    }

    if (!(await IRCTCExt.EticketLoginFlow.isLoggedIn())) {
      throw new Error('Login failed or timed out');
    }

    overlay.setStatus('Login successful');
    return true;
  },

  async runWithRetry(config, overlay, { maxAttempts = 3 } = {}) {
    if (await IRCTCExt.EticketLoginFlow.isLoggedIn()) {
      overlay.setStatus('Already logged in');
      return true;
    }

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await IRCTCExt.EticketLoginFlow.run(config, overlay);
        if (await IRCTCExt.EticketLoginFlow.isLoggedIn()) return true;
      } catch (err) {
        if (attempt >= maxAttempts) throw err;
        console.warn(`[IRCTC-Bot] Login attempt ${attempt}/${maxAttempts}:`, err);
        overlay.setStatus(`Login failed, retry ${attempt}/${maxAttempts}...`);
        await IRCTCExt.Wait.delay(1500);
      }
    }

    throw new Error(`Login failed after ${maxAttempts} attempts`);
  }
};
