window.IRCTCExt = window.IRCTCExt || {};

IRCTCExt.EticketLoginFlow = {
  headerLoginButton() {
    const buttons = IRCTCExt.Wait.queryAll(IRCTCExt.SELECTORS.loginHeaderBtn);
    return buttons.find(
      (btn) =>
        !btn.closest('#newLogin, .login-dialog, .login-wrapper, .login-form') &&
        (btn.textContent || '').toUpperCase().includes('LOGIN')
    );
  },

  hasChallenge() {
    const captcha = IRCTCExt.Wait.queryOne(IRCTCExt.SELECTORS.loginCaptcha);
    if (captcha && IRCTCExt.Wait.isVisible(captcha)) return true;
    const otp = document.querySelector(
      'input[placeholder*="OTP"], input[placeholder*="otp"], input[formcontrolname*="otp"]'
    );
    return !!(otp && IRCTCExt.Wait.isVisible(otp));
  },

  async isLoggedIn() {
    if (IRCTCExt.EticketLoginFlow.headerLoginButton()) return false;
    if (IRCTCExt.Wait.queryOne(IRCTCExt.SELECTORS.loggedInProfile)) return true;
    const oldLogin = document.querySelector('a.search_btn.loginText');
    if (oldLogin && oldLogin.textContent.toUpperCase().includes('LOGIN')) return false;
    if (IRCTCExt.Wait.queryOne(['#newLogin .login-form', '.login-dialog .login-form'])) return false;
    return !IRCTCExt.EticketLoginFlow.headerLoginButton();
  },

  async openLoginModal() {
    const loginBtn = IRCTCExt.EticketLoginFlow.headerLoginButton();
    if (loginBtn) {
      IRCTCExt.Events.click(loginBtn);
      await IRCTCExt.Wait.delay(600);
    }
    await IRCTCExt.Wait.waitFor(IRCTCExt.SELECTORS.loginModal, { timeout: 8000 });

    const tabs = Array.from(document.querySelectorAll('.login-tab'));
    const userTab = tabs.find((tab) => (tab.textContent || '').toUpperCase().includes('USER'));
    if (userTab && !userTab.classList.contains('active')) {
      IRCTCExt.Events.click(userTab);
      await IRCTCExt.Wait.delay(300);
    }
  },

  async waitForEnabledSubmit() {
    return IRCTCExt.Wait.poll(
      () => {
        const submit = IRCTCExt.Wait.queryOne(IRCTCExt.SELECTORS.loginSubmit);
        if (!submit) return null;
        if (submit.classList.contains('disabled-state') || submit.disabled) return null;
        return submit;
      },
      { timeout: 8000, interval: 150 }
    );
  },

  async waitForCaptchaContinue(overlay) {
    overlay.setStatus('CAPTCHA or OTP required. Complete it, then click Continue.');
    await IRCTCExt.Storage.updateState({ currentStep: 'login-captcha', paused: true });
    await new Promise((resolve) => {
      overlay.showPause('Complete CAPTCHA or OTP in the login form, then click Continue.', async () => {
        const submit = IRCTCExt.Wait.queryOne(IRCTCExt.SELECTORS.loginSubmit);
        if (submit && !submit.classList.contains('disabled-state')) {
          IRCTCExt.Events.click(submit);
        }
        await IRCTCExt.Storage.updateState({ paused: false });
        await IRCTCExt.Wait.delay(1500);
        resolve();
      });
    });
  },

  async run(config, overlay) {
    await IRCTCExt.Wait.poll(
      () =>
        IRCTCExt.EticketLoginFlow.headerLoginButton() ||
        IRCTCExt.Wait.queryOne(IRCTCExt.SELECTORS.loggedInProfile) ||
        document.querySelector('a.search_btn.loginText') ||
        IRCTCExt.Wait.queryOne(IRCTCExt.SELECTORS.searchFrom),
      { timeout: 12000, interval: 200 }
    );

    if (await IRCTCExt.EticketLoginFlow.isLoggedIn()) {
      overlay.setStatus('Already logged in');
      return true;
    }

    overlay.setStep('Login');
    overlay.setStatus('Opening login...');
    await IRCTCExt.EticketLoginFlow.openLoginModal();

    const userInput = await IRCTCExt.Wait.waitFor(IRCTCExt.SELECTORS.loginUsername, {
      timeout: 10000,
      visible: true
    });
    const passInput = await IRCTCExt.Wait.waitFor(IRCTCExt.SELECTORS.loginPassword, {
      timeout: 10000,
      visible: true
    });
    if (!userInput || !passInput) throw new Error('Login form not found');

    overlay.setStatus('Filling username and password...');
    IRCTCExt.Events.setInputValue(userInput, config.credentials.username);
    IRCTCExt.Events.setInputValue(passInput, config.credentials.password);

    if (IRCTCExt.EticketLoginFlow.hasChallenge()) {
      await IRCTCExt.EticketLoginFlow.waitForCaptchaContinue(overlay);
    } else {
      const submit = await IRCTCExt.EticketLoginFlow.waitForEnabledSubmit();
      if (!submit) throw new Error('Login button stayed disabled');
      overlay.setStatus('Submitting login...');
      IRCTCExt.Events.click(submit);
      await IRCTCExt.Wait.delay(800);

      if (IRCTCExt.EticketLoginFlow.hasChallenge()) {
        await IRCTCExt.EticketLoginFlow.waitForCaptchaContinue(overlay);
      }
    }

    await IRCTCExt.Wait.poll(() => IRCTCExt.EticketLoginFlow.isLoggedIn(), { timeout: 20000, interval: 400 });
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
