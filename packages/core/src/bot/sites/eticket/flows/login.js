window.IRCTCExt = window.IRCTCExt || {};

IRCTCExt.EticketLoginFlow = {
  headerLoginButton() {
    for (const selector of IRCTCExt.SELECTORS.loginHeaderBtn || ['button.btn-login']) {
      const elements = document.querySelectorAll(selector);
      for (const btn of elements) {
        if (!IRCTCExt.Wait.isVisible(btn)) continue;
        if (btn.closest('#newLogin, .login-dialog, .login-wrapper, .login-form, .login-slider, .login-slider-viewport')) continue;
        const text = (btn.textContent || '').trim().toUpperCase();
        if (btn.classList.contains('btn-login') || text === 'LOGIN' || text.includes('LOGIN')) {
          return btn;
        }
      }
    }

    const allButtons = Array.from(document.querySelectorAll('button.btn-login, .btn-login, header button, nav button, button, a.loginText'));
    return allButtons.find(
      (btn) =>
        IRCTCExt.Wait.isVisible(btn) &&
        !btn.closest('#newLogin, .login-dialog, .login-wrapper, .login-form, .login-slider, .login-slider-viewport') &&
        (btn.classList.contains('btn-login') || (btn.textContent || '').trim().toUpperCase() === 'LOGIN')
    );
  },

  isLoginModalOpen() {
    if (IRCTCExt.Wait.queryVisibleOne(IRCTCExt.SELECTORS.loginModal)) return true;
    const directForm = IRCTCExt.Wait.queryVisibleOne([
      '.login-wrapper',
      '.login-slider-viewport',
      '.login-slider',
      '.login-panel:not(.login-panel--inactive)',
      '.login-form:not(.agent-panel)',
      '#username',
      'input[formcontrolname="userid"]'
    ]);
    return !!directForm;
  },

  hasLoggedInMarker() {
    const profileEl = document.querySelector(
      '.profile-name, span.profile-name, .profile-logo, img[alt="profile logo"], img[alt*="profile logo" i], img[src*="verified-user"], .profile-menu-arrow-img'
    );
    if (profileEl && IRCTCExt.Wait.isVisible(profileEl)) return true;

    const marker = IRCTCExt.Wait.queryVisibleOne(IRCTCExt.SELECTORS.loggedInProfile);
    if (marker) return true;

    const navButtons = document.querySelectorAll('button.nav-link-1, button.nav-link--active, button');
    for (const b of navButtons) {
      if (b.querySelector('.profile-name, .profile-logo, img[alt*="profile" i], img[src*="verified-user"]') && IRCTCExt.Wait.isVisible(b)) {
        return true;
      }
    }

    return false;
  },

  getLoggedInUsername() {
    const el = document.querySelector('.profile-name, span.profile-name, .user-name');
    return el?.textContent?.trim() || '';
  },

  needsLogin() {
    if (IRCTCExt.EticketLoginFlow.isLoginModalOpen()) return true;
    if (IRCTCExt.EticketLoginFlow.hasLoggedInMarker()) return false;
    if (IRCTCExt.EticketLoginFlow.headerLoginButton()) return true;
    if (IRCTCExt.EticketPaths?.isTrainSearchPath?.(location.pathname)) {
      return !IRCTCExt.EticketLoginFlow.hasLoggedInMarker();
    }
    return false;
  },

  getActiveLoginPanel() {
    const panels = Array.from(document.querySelectorAll('.login-panel:not(.login-panel--inactive):not([inert])'));
    const visiblePanel = panels.find((p) => IRCTCExt.Wait.isVisible(p) && p.getAttribute('aria-hidden') !== 'true');
    return (
      visiblePanel ||
      document.querySelector('.login-form:not(.agent-panel):not(.login-panel--inactive)') ||
      document.querySelector('.login-wrapper') ||
      document
    );
  },

  ensureUserTabActive() {
    const tabs = Array.from(document.querySelectorAll('.login-tab'));
    const userTab = tabs.find((tab) => (tab.textContent || '').toUpperCase().includes('USER'));
    if (userTab && !userTab.classList.contains('active')) {
      try {
        IRCTCExt.Events?.click ? IRCTCExt.Events.click(userTab) : userTab.click();
      } catch (_) {
        userTab.click?.();
      }
    }
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
    if (IRCTCExt.EticketLoginFlow.isLoginModalOpen()) return false;
    if (IRCTCExt.EticketLoginFlow.hasLoggedInMarker()) return true;
    if (IRCTCExt.EticketLoginFlow.headerLoginButton()) return false;
    const oldLogin = document.querySelector('a.search_btn.loginText');
    if (oldLogin && oldLogin.textContent.toUpperCase().includes('LOGIN')) return false;
    return false;
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
      let loginBtn = IRCTCExt.EticketLoginFlow.headerLoginButton();
      if (!loginBtn) {
        loginBtn = await IRCTCExt.Wait.poll(
          () => IRCTCExt.EticketLoginFlow.headerLoginButton(),
          { timeout: 4000, interval: 200 }
        );
      }
      if (loginBtn) {
        IRCTCExt.Events.click(loginBtn);
        await IRCTCExt.Wait.delay(600);
      }
    }
    await IRCTCExt.Wait.waitFor(IRCTCExt.SELECTORS.loginModal, { timeout: 8000, visible: true });
    IRCTCExt.EticketLoginFlow.ensureUserTabActive();
  },

  async fillCredential(input, value) {
    if (!input || !value) return;
    input.focus();
    IRCTCExt.Events.setInputValue(input, value, { blur: false });
    await IRCTCExt.Wait.delay(50);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    IRCTCExt.Events.keyEvent?.(input, 'keyup', 'Enter');
    input.blur();
    input.dispatchEvent(new Event('blur', { bubbles: true }));
    await IRCTCExt.Wait.delay(50);
    if (!input.value) {
      await IRCTCExt.Events.typeSlowly(input, value, 40);
    }
  },

  getLoginSubmit(panel) {
    const active = panel || IRCTCExt.EticketLoginFlow.getActiveLoginPanel() || document;
    let submit = IRCTCExt.Wait.queryVisibleOne(IRCTCExt.SELECTORS.loginSubmit, active);
    if (!submit && active !== document) {
      submit = IRCTCExt.Wait.queryVisibleOne(IRCTCExt.SELECTORS.loginSubmit, document);
    }
    return submit;
  },

  async waitForEnabledSubmit(panel) {
    const root = panel || document;
    let submit = await IRCTCExt.Wait.poll(
      () => {
        const btn = IRCTCExt.EticketLoginFlow.getLoginSubmit(root);
        if (!btn) return null;
        const isDisabled =
          btn.classList.contains('disabled-state') ||
          btn.disabled ||
          btn.getAttribute('disabled') !== null;
        if (!isDisabled) return btn;
        return null;
      },
      { timeout: 3000, interval: 100 }
    );

    if (!submit) {
      const btn = IRCTCExt.EticketLoginFlow.getLoginSubmit(root);
      if (btn) {
        btn.classList.remove('disabled-state');
        btn.removeAttribute('disabled');
        submit = btn;
      }
    }
    return submit;
  },

  async waitForCaptchaContinue(overlay, panel) {
    overlay.setStatus('CAPTCHA or OTP required. Complete it, then click Continue.');
    await IRCTCExt.Storage.updateState({ currentStep: 'login-captcha', paused: true });
    await new Promise((resolve) => {
      overlay.showPause('Complete CAPTCHA or OTP in the login form, then click Continue.', async () => {
        const submit = IRCTCExt.EticketLoginFlow.getLoginSubmit(panel);
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

    const alreadyOpen = IRCTCExt.EticketLoginFlow.isLoginModalOpen();
    if (!alreadyOpen) {
      await IRCTCExt.Wait.poll(
        () =>
          IRCTCExt.EticketLoginFlow.isLoginModalOpen() ||
          IRCTCExt.EticketLoginFlow.headerLoginButton() ||
          IRCTCExt.EticketLoginFlow.hasLoggedInMarker() ||
          document.querySelector('a.search_btn.loginText') ||
          IRCTCExt.Wait.queryVisibleOne(IRCTCExt.SELECTORS.searchFrom),
        { timeout: 8000, interval: 150 }
      );
    }

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

    IRCTCExt.EticketLoginFlow.ensureUserTabActive();

    const activePanel = IRCTCExt.EticketLoginFlow.getActiveLoginPanel();
    const userInput =
      (await IRCTCExt.Wait.waitFor(IRCTCExt.SELECTORS.loginUsername, {
        timeout: 6000,
        visible: true,
        root: activePanel
      })) ||
      (await IRCTCExt.Wait.waitFor(IRCTCExt.SELECTORS.loginUsername, {
        timeout: 2000,
        visible: true
      }));

    const passInput =
      (await IRCTCExt.Wait.waitFor(IRCTCExt.SELECTORS.loginPassword, {
        timeout: 6000,
        visible: true,
        root: activePanel
      })) ||
      (await IRCTCExt.Wait.waitFor(IRCTCExt.SELECTORS.loginPassword, {
        timeout: 2000,
        visible: true
      }));

    if (!userInput || !passInput) throw new Error('Login form not found');

    const username = config?.credentials?.username || '';
    const password = config?.credentials?.password || '';
    if (!username || !password) {
      throw new Error('IRCTC credentials missing. Please save username and password in extension settings.');
    }

    overlay.setStatus('Filling username and password...');
    await IRCTCExt.EticketLoginFlow.fillCredential(userInput, username);
    await IRCTCExt.EticketLoginFlow.fillCredential(passInput, password);

    if (IRCTCExt.EticketLoginFlow.hasChallenge()) {
      await IRCTCExt.EticketLoginFlow.waitForCaptchaContinue(overlay, activePanel);
    } else {
      const submit = await IRCTCExt.EticketLoginFlow.waitForEnabledSubmit(activePanel);
      if (!submit) throw new Error('Login button stayed disabled');
      overlay.setStatus('Submitting login...');
      IRCTCExt.Events.click(submit);
      const form = submit.closest('form');
      if (form) {
        try {
          form.requestSubmit
            ? form.requestSubmit(submit)
            : form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        } catch (_) {}
      }
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
        const errMsg = activePanel.querySelector(
          '.ui-messages-error, .error-message, .alert-danger, .login-error, .ui-message-error'
        );
        if (errMsg && IRCTCExt.Wait.isVisible(errMsg)) return 'error';
        return null;
      },
      { timeout: 25000, interval: 400 }
    );

    if (loggedIn === 'error') {
      const errMsg = activePanel.querySelector(
        '.ui-messages-error, .error-message, .alert-danger, .login-error, .ui-message-error'
      );
      throw new Error(errMsg?.textContent?.trim() || 'Login failed with server error');
    }

    if (loggedIn === 'challenge') {
      await IRCTCExt.EticketLoginFlow.waitForCaptchaContinue(overlay, activePanel);
      await IRCTCExt.Wait.poll(() => IRCTCExt.EticketLoginFlow.isLoggedIn(), { timeout: 25000, interval: 400 });
    }

    if (!(await IRCTCExt.EticketLoginFlow.isLoggedIn())) {
      throw new Error('Login failed or timed out');
    }

    const loggedInUser = IRCTCExt.EticketLoginFlow.getLoggedInUsername();
    overlay.setStatus(loggedInUser ? `Login successful (${loggedInUser})` : 'Login successful');
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
