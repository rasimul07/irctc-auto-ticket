(function (root) {
  root.IRCTCExt = root.IRCTCExt || {};
  if (IRCTCExt.NgetLoginFlow) return;

  IRCTCExt.NgetLoginFlow = {
    NARROW_LOGIN_BREAKPOINT: 1302,

    usesNarrowLoginLayout() {
      return window.innerWidth < IRCTCExt.NgetLoginFlow.NARROW_LOGIN_BREAKPOINT;
    },

    isSidebarOpen() {
      const sidebar = IRCTCExt.Wait.queryOne(IRCTCExt.SELECTORS.hamburgerSidebar);
      return !!(sidebar && IRCTCExt.Wait.isVisible(sidebar));
    },

    getLoginModalRoot() {
      const dialogs = document.querySelectorAll('.ui-dialog-content');
      for (const dialog of dialogs) {
        if (!IRCTCExt.Wait.isVisible(dialog)) continue;

        const modal = dialog.querySelector('.irmodal');
        if (!modal) continue;

        const title = modal.querySelector('.modal-title, #exampleModalLabel');
        const userInput = modal.querySelector('input[formcontrolname="userid"]');
        const isLoginTitle = title && /login/i.test(title.textContent || '');
        const hasLoginForm = !!(userInput && IRCTCExt.Wait.isVisible(userInput));

        if (isLoginTitle || hasLoginForm) return modal;
      }

      const modal = IRCTCExt.Wait.queryOne(IRCTCExt.SELECTORS.loginModal);
      if (!modal || !IRCTCExt.Wait.isVisible(modal)) return null;

      const title = modal.querySelector('.modal-title, #exampleModalLabel');
      if (title && !/login/i.test(title.textContent || '')) return null;
      return modal;
    },

    isLoginModalVisible() {
      const modal = IRCTCExt.NgetLoginFlow.getLoginModalRoot();
      if (!modal) return false;
      const userInput = IRCTCExt.Wait.queryOne(IRCTCExt.SELECTORS.loginUsername, modal);
      const passInput = IRCTCExt.Wait.queryOne(IRCTCExt.SELECTORS.loginPassword, modal);
      return !!(
        userInput &&
        passInput &&
        IRCTCExt.Wait.isVisible(userInput) &&
        IRCTCExt.Wait.isVisible(passInput)
      );
    },

    isLoginHeaderButton(btn, { visibleOnly = true, allowInSidebar = false } = {}) {
      if (!btn) return false;
      if (visibleOnly && !IRCTCExt.Wait.isVisible(btn)) return false;
      if (btn.closest('.irmodal, .ui-dialog-content .irmodal, .ui-dialog-content')) return false;
      if (!allowInSidebar && btn.closest('.ui-sidebar')) return false;
      if (btn.classList.contains('train_Search')) return false;

      const text = (btn.textContent || '').trim();
      const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
      return (
        /login\s*\/\s*register/i.test(text) ||
        (/\blogin\b/i.test(text) && aria.includes('login'))
      );
    },

    findDesktopLoginButton() {
      const selectors = IRCTCExt.SELECTORS.desktopLoginBtn || IRCTCExt.SELECTORS.loginHeaderBtn || [];
      for (const selector of selectors) {
        const candidates = document.querySelectorAll(selector);
        const match = [...candidates].find((btn) =>
          IRCTCExt.NgetLoginFlow.isLoginHeaderButton(btn, { visibleOnly: true, allowInSidebar: false })
        );
        if (match) return match;
      }
      return null;
    },

    findSidebarLoginButton() {
      if (!IRCTCExt.NgetLoginFlow.isSidebarOpen()) return null;

      const sidebar = IRCTCExt.Wait.queryOne(IRCTCExt.SELECTORS.hamburgerSidebar);
      if (!sidebar) return null;

      const selectors = IRCTCExt.SELECTORS.sidebarLoginBtn || [];
      for (const selector of selectors) {
        const candidates = sidebar.querySelectorAll(selector);
        const match = [...candidates].find((btn) =>
          IRCTCExt.NgetLoginFlow.isLoginHeaderButton(btn, { visibleOnly: true, allowInSidebar: true })
        );
        if (match) return match;
      }

      const buttons = sidebar.querySelectorAll('button.search_btn');
      return (
        [...buttons].find((btn) =>
          IRCTCExt.NgetLoginFlow.isLoginHeaderButton(btn, { visibleOnly: true, allowInSidebar: true })
        ) || null
      );
    },

    findLoginButton({ visibleOnly = true } = {}) {
      const desktop = IRCTCExt.NgetLoginFlow.findDesktopLoginButton();
      if (desktop) return desktop;

      const sidebar = IRCTCExt.NgetLoginFlow.findSidebarLoginButton();
      if (sidebar) return sidebar;

      return null;
    },

    headerLoginButton() {
      if (IRCTCExt.NgetLoginFlow.usesNarrowLoginLayout()) {
        return IRCTCExt.NgetLoginFlow.findSidebarLoginButton();
      }
      return IRCTCExt.NgetLoginFlow.findDesktopLoginButton();
    },

    hamburgerMenuTrigger() {
      const selectors = IRCTCExt.SELECTORS.hamburgerMenu || [];
      for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (!el) continue;
        const clickTarget = el.closest('a') || el.closest('.h_menu_drop_button') || el;
        const container = clickTarget.closest('.h_menu_drop_button') || clickTarget;
        if (IRCTCExt.Wait.isVisible(container) || IRCTCExt.Wait.isVisible(clickTarget)) {
          return clickTarget;
        }
      }
      return null;
    },

    async openSidebarMenu(overlay) {
      if (IRCTCExt.NgetLoginFlow.isSidebarOpen()) return true;

      const trigger = IRCTCExt.NgetLoginFlow.hamburgerMenuTrigger();
      if (!trigger) return false;

      overlay?.setStatus('Opening menu...');
      IRCTCExt.Events.click(trigger);

      const opened = await IRCTCExt.Wait.poll(
        () => (IRCTCExt.NgetLoginFlow.isSidebarOpen() ? true : null),
        { timeout: 8000, interval: 200 }
      );
      return !!opened;
    },

    async resolveLoginButton(overlay) {
      const narrow = IRCTCExt.NgetLoginFlow.usesNarrowLoginLayout();
      const desktopBtn = IRCTCExt.NgetLoginFlow.findDesktopLoginButton();

      if (!narrow && desktopBtn) return desktopBtn;

      if (narrow || !desktopBtn) {
        const sidebarBtn = IRCTCExt.NgetLoginFlow.findSidebarLoginButton();
        if (sidebarBtn) return sidebarBtn;

        const opened = await IRCTCExt.NgetLoginFlow.openSidebarMenu(overlay);
        if (!opened) {
          if (desktopBtn) return desktopBtn;
          return null;
        }

        overlay?.setStatus('Clicking LOGIN / REGISTER in menu...');
        const btn = await IRCTCExt.Wait.poll(
          () => IRCTCExt.NgetLoginFlow.findSidebarLoginButton(),
          { timeout: 8000, interval: 200 }
        );
        if (btn) return btn;
      }

      return desktopBtn || IRCTCExt.NgetLoginFlow.findLoginButton({ visibleOnly: true });
    },

    hasLoggedInMarker() {
      return !!IRCTCExt.Wait.queryOne(IRCTCExt.SELECTORS.loggedInProfile);
    },

    hasVisibleLoginAffordance() {
      if (IRCTCExt.NgetLoginFlow.findDesktopLoginButton()) return true;
      if (IRCTCExt.NgetLoginFlow.findSidebarLoginButton()) return true;
      if (
        IRCTCExt.NgetLoginFlow.usesNarrowLoginLayout() &&
        IRCTCExt.NgetLoginFlow.hamburgerMenuTrigger()
      ) {
        return true;
      }
      return false;
    },

    needsLogin() {
      if (IRCTCExt.NgetLoginFlow.isLoginModalVisible()) return true;
      if (IRCTCExt.NgetLoginFlow.hasLoggedInMarker()) return false;
      return IRCTCExt.NgetLoginFlow.hasVisibleLoginAffordance();
    },

    async waitForAuthUi(overlay) {
      overlay?.setStatus?.('Waiting for login or profile...');
      await IRCTCExt.Wait.poll(
        () => {
          if (IRCTCExt.NgetLoginFlow.hasLoggedInMarker()) return true;
          if (IRCTCExt.NgetLoginFlow.findDesktopLoginButton()) return true;
          if (IRCTCExt.NgetLoginFlow.findSidebarLoginButton()) return true;
          if (IRCTCExt.NgetLanguageFlow?.isLanguageModalVisible?.()) return true;
          if (IRCTCExt.NgetLoginFlow.isLoginModalVisible()) return true;
          if (
            IRCTCExt.NgetLoginFlow.usesNarrowLoginLayout() &&
            IRCTCExt.NgetLoginFlow.hamburgerMenuTrigger()
          ) {
            return true;
          }
          return null;
        },
        { timeout: 15000, interval: 200 }
      );
    },

    getLoginSubmit(modalRoot) {
      const root = modalRoot || IRCTCExt.NgetLoginFlow.getLoginModalRoot();
      if (!root) return null;

      const submit = IRCTCExt.Wait.queryOne(IRCTCExt.SELECTORS.loginSubmit, root);
      if (submit && IRCTCExt.Wait.isVisible(submit)) return submit;

      const buttons = root.querySelectorAll('button[type="submit"], button.train_Search');
      return (
        [...buttons].find(
          (btn) => /sign\s*in/i.test(btn.textContent || '') && IRCTCExt.Wait.isVisible(btn)
        ) || null
      );
    },

    hasChallenge() {
      const modal = IRCTCExt.NgetLoginFlow.getLoginModalRoot();
      if (!modal) return false;

      const captchaInput = modal.querySelector(
        'input[placeholder*="Captcha" i], input[placeholder*="CAPTCHA" i], input[formcontrolname="captcha"]'
      );
      if (
        captchaInput &&
        captchaInput.type !== 'checkbox' &&
        IRCTCExt.Wait.isVisible(captchaInput)
      ) {
        return true;
      }

      const otpInput = modal.querySelector(
        'input:not([type="checkbox"])[placeholder*="OTP" i], input:not([type="checkbox"])[formcontrolname="otp"]'
      );
      if (!otpInput || !IRCTCExt.Wait.isVisible(otpInput)) return false;

      // Accessibility option on nget login — not an OTP entry field.
      if (otpInput.id === 'otpLogin' || otpInput.name === 'otpLogin') return false;

      return true;
    },

    async isLoggedIn() {
      if (IRCTCExt.NgetLoginFlow.isLoginModalVisible()) return false;
      if (IRCTCExt.NgetLoginFlow.hasLoggedInMarker()) return true;
      if (IRCTCExt.NgetLoginFlow.hasVisibleLoginAffordance()) return false;
      return true;
    },

    async ensureLoginModal(overlay) {
      if (IRCTCExt.NgetLoginFlow.isLoginModalVisible()) {
        return IRCTCExt.NgetLoginFlow.getLoginModalRoot();
      }

      const shell = IRCTCExt.NgetLoginFlow.getLoginModalRoot();
      if (shell) {
        const ready = await IRCTCExt.Wait.poll(
          () =>
            IRCTCExt.NgetLoginFlow.isLoginModalVisible()
              ? IRCTCExt.NgetLoginFlow.getLoginModalRoot()
              : null,
          { timeout: 5000, interval: 200 }
        );
        if (ready) return ready;
      }

      overlay?.setStatus('Opening login...');
      const loginBtn = await IRCTCExt.NgetLoginFlow.resolveLoginButton(overlay);
      if (!loginBtn) throw new Error('LOGIN / REGISTER button not found');

      IRCTCExt.Events.click(loginBtn);
      await IRCTCExt.Wait.delay(600);

      const modal = await IRCTCExt.Wait.poll(
        () =>
          IRCTCExt.NgetLoginFlow.isLoginModalVisible()
            ? IRCTCExt.NgetLoginFlow.getLoginModalRoot()
            : null,
        { timeout: 10000, interval: 200 }
      );
      if (!modal) throw new Error('Login modal did not open');
      return modal;
    },

    async waitForEnabledSubmit(modalRoot) {
      return IRCTCExt.Wait.poll(
        () => {
          const submit = IRCTCExt.NgetLoginFlow.getLoginSubmit(modalRoot);
          if (!submit || !IRCTCExt.Wait.isVisible(submit)) return null;
          if (submit.disabled) return null;
          return submit;
        },
        { timeout: 8000, interval: 150 }
      );
    },

    async waitForCaptchaContinue(overlay, modalRoot) {
      overlay.setStatus('CAPTCHA or OTP required. Complete it, then click Continue.');
      await IRCTCExt.Storage.updateState({ currentStep: 'login-captcha', paused: true });
      await new Promise((resolve) => {
        overlay.showPause('Complete CAPTCHA or OTP in the login form, then click Continue.', async () => {
          const submit = IRCTCExt.NgetLoginFlow.getLoginSubmit(modalRoot);
          if (submit && !submit.disabled) {
            IRCTCExt.Events.click(submit);
          }
          await IRCTCExt.Storage.updateState({ paused: false });
          await IRCTCExt.Wait.delay(1500);
          resolve();
        });
      });
    },

    async run(config, overlay) {
      await IRCTCExt.NgetLoginFlow.waitForAuthUi(overlay);

      if (await IRCTCExt.NgetLoginFlow.isLoggedIn()) {
        overlay.setStatus('Already logged in');
        return true;
      }

      overlay.setStep('Login');

      const dialogAlreadyOpen = IRCTCExt.NgetLoginFlow.isLoginModalVisible();
      overlay.setStatus(
        dialogAlreadyOpen ? 'Login dialog open — filling credentials...' : 'Opening login...'
      );
      const modal = await IRCTCExt.NgetLoginFlow.ensureLoginModal(overlay);

      const userInput = await IRCTCExt.Wait.waitFor(IRCTCExt.SELECTORS.loginUsername, {
        timeout: 10000,
        visible: true,
        root: modal
      });
      const passInput = await IRCTCExt.Wait.waitFor(IRCTCExt.SELECTORS.loginPassword, {
        timeout: 10000,
        visible: true,
        root: modal
      });
      if (!userInput || !passInput) throw new Error('Login form not found');

      overlay.setStatus('Filling username and password...');
      IRCTCExt.Events.setInputValue(userInput, config.credentials.username);
      IRCTCExt.Events.setInputValue(passInput, config.credentials.password);

      if (IRCTCExt.NgetLoginFlow.hasChallenge()) {
        await IRCTCExt.NgetLoginFlow.waitForCaptchaContinue(overlay, modal);
      } else {
        const submit = await IRCTCExt.NgetLoginFlow.waitForEnabledSubmit(modal);
        if (!submit) throw new Error('SIGN IN button stayed disabled');
        overlay.setStatus('Submitting login...');
        IRCTCExt.Events.click(submit);
        await IRCTCExt.Wait.delay(800);

        if (IRCTCExt.NgetLoginFlow.hasChallenge()) {
          await IRCTCExt.NgetLoginFlow.waitForCaptchaContinue(overlay, modal);
        }
      }

      await IRCTCExt.Wait.poll(() => IRCTCExt.NgetLoginFlow.isLoggedIn(), { timeout: 20000, interval: 400 });
      if (!(await IRCTCExt.NgetLoginFlow.isLoggedIn())) {
        throw new Error('Login failed or timed out');
      }

      overlay.setStatus('Login successful');
      return true;
    },

    async runWithRetry(config, overlay, { maxAttempts = 3 } = {}) {
      await IRCTCExt.NgetLanguageFlow.dismissPreferredLanguage(overlay);
      await IRCTCExt.NgetLoginFlow.waitForAuthUi(overlay);

      if (await IRCTCExt.NgetLoginFlow.isLoggedIn()) {
        overlay.setStatus('Already logged in');
        return true;
      }

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          await IRCTCExt.NgetLoginFlow.run(config, overlay);
          if (await IRCTCExt.NgetLoginFlow.isLoggedIn()) return true;
        } catch (err) {
          if (attempt >= maxAttempts) throw err;
          console.warn(`[IRCTC-Bot] Nget login attempt ${attempt}/${maxAttempts}:`, err);
          overlay.setStatus(`Login failed, retry ${attempt}/${maxAttempts}...`);
          await IRCTCExt.Wait.delay(1500);
        }
      }

      throw new Error(`Login failed after ${maxAttempts} attempts`);
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
