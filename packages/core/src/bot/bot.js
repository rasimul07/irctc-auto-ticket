(function (root) {
  root.IRCTCExt = root.IRCTCExt || {};
})(typeof globalThis !== 'undefined' ? globalThis : window);

IRCTCExt.Bot = {
  running: false,
  unwatchPath: null,
  MAX_AUTO_RESTARTS: 3,
  RESTART_FLAG: 'irctc-ext-restart-pending',
  STOP_FLAG: 'irctc-ext-stop-pending',

  async getSite(config) {
    const site = IRCTCExt.SiteRegistry.get(config);
    if (!site?.flows) {
      throw new Error('Booking site profile not loaded. Reload the app.');
    }
    if (site.selectors) IRCTCExt.SELECTORS = site.selectors;
    return site;
  },

  async waitForSiteReady(config, { timeout = 15000 } = {}) {
    const site = await IRCTCExt.Wait.poll(
      () => {
        const profile = IRCTCExt.SiteRegistry.get(config);
        return profile?.flows ? profile : null;
      },
      { timeout, interval: 100 }
    );
    if (!site) throw new Error('Booking site profile not loaded. Reload the app.');
    return site;
  },

  isContentScriptReady() {
    const sites = IRCTCExt.SiteRegistry?.SITES || {};
    const onNget = location.pathname.includes('/nget/');
    const onEticket = location.pathname.includes('/eticket/');
    if (onNget) return !!sites.nget?.flows;
    if (onEticket) return !!sites.eticket?.flows;
    return !!(sites.eticket?.flows || sites.nget?.flows);
  },

  isWebViewHost() {
    return typeof chrome === 'undefined' || !chrome.runtime?.sendMessage;
  },

  isAutoPayAvailable() {
    return !!IRCTCExt.BkgPayment?.handleCardsPayment;
  },

  async applyProgressFromPath() {
    const config = await IRCTCExt.Storage.get();
    const site = await IRCTCExt.Bot.getSite(config);
    const updates = site.syncProgressFromPath?.(location.pathname, config.state);
    if (updates && Object.keys(updates).length) {
      await IRCTCExt.Storage.updateState(updates);
      Object.assign(config.state, updates);
    }
    return config;
  },

  async kickRunLoop() {
    if (this.running) return;
    const config = await IRCTCExt.Storage.get();
    if (!config.state.running || config.state.status === 'stopped') return;
    try {
      await IRCTCExt.Bot.start({ resetSession: false });
    } catch (err) {
      console.error('[IRCTC-Bot] kickRunLoop failed:', err);
    }
  },

  async handleErrorPageIfNeeded(overlay) {
    const config = await IRCTCExt.Storage.get();
    const site = await IRCTCExt.Bot.getSite(config);
    if (!site.isErrorPage()) return false;

    if (!config.state.running || config.state.paused) return false;
    if (IRCTCExt.Bot._errorRestartInFlight) return true;

    const count = config.state.autoRestartCount || 0;
    if (count >= IRCTCExt.Bot.MAX_AUTO_RESTARTS) {
      overlay?.setError(`IRCTC error page appeared ${count} times. Auto-restart limit reached.`);
      overlay?.setStatus('Stopped after repeated IRCTC errors.');
      overlay?.setStep('Error');
      await IRCTCExt.Storage.updateState({ running: false, status: 'error' });
      IRCTCExt.Bot.running = false;
      return true;
    }

    IRCTCExt.Bot._errorRestartInFlight = true;
    try {
      overlay?.setError('');
      overlay?.setStatus(
        `IRCTC error page detected. Restarting (${count + 1}/${IRCTCExt.Bot.MAX_AUTO_RESTARTS})...`
      );
      overlay?.setStep('Restart');
      await IRCTCExt.Storage.updateState({ autoRestartCount: count + 1 });
      await IRCTCExt.Bot.restart();
    } finally {
      IRCTCExt.Bot._errorRestartInFlight = false;
    }
    return true;
  },

  async shouldContinue() {
    const config = await IRCTCExt.Storage.get();
    return config.state.running && !config.state.paused;
  },

  async isRunning() {
    const config = await IRCTCExt.Storage.get();
    return !!config.state.running && config.state.status !== 'stopped';
  },

  async wasStopped() {
    const config = await IRCTCExt.Storage.get();
    return !config.state.running || config.state.status === 'stopped';
  },

  async checkControlState() {
    const config = await IRCTCExt.Storage.get();
    if (!config.state.running) return 'stopped';
    if (config.state.paused) return 'paused';
    return null;
  },

  async waitUntilResumedOrStopped({ interval = 300 } = {}) {
    while (true) {
      const state = await IRCTCExt.Bot.checkControlState();
      if (state === 'stopped') return 'stopped';
      if (!state) return 'resumed';
      await IRCTCExt.Wait.delay(interval);
    }
  },

  async stop() {
    this.running = false;
    sessionStorage.removeItem(this.RESTART_FLAG);
    sessionStorage.setItem(this.STOP_FLAG, '1');

    await IRCTCExt.Storage.updateState({
      running: false,
      paused: false,
      status: 'stopped',
      currentStep: 'init'
    });

    IRCTCExt.PlatformBridge?.sendMessage('BOOKING_STOPPED', {});
    location.reload();
  },

  async runLoginIfNeeded(config, overlay, site) {
    if (await site.flows.LoginFlow.isLoggedIn()) return;
    try {
      await site.flows.LoginFlow.run(config, overlay);
    } catch (err) {
      console.warn('[IRCTC-Bot] Login step:', err);
      overlay.setStatus('Continuing (login not completed)');
    }
  },

  async ensureTokenForPayment(overlay, config) {
    if (config.state?.tokenConsumed) return true;

    const usageKey = config.state?.bookingSessionId || crypto.randomUUID();
    if (!config.state?.bookingSessionId) {
      await IRCTCExt.Storage.updateState({ bookingSessionId: usageKey });
      config.state.bookingSessionId = usageKey;
    }

    const result = await IRCTCExt.PlatformBridge
      .sendMessage('CONSUME_TOKEN', { usageKey })
      .catch(() => null);

    if (!result?.ok) {
      overlay?.setError(result?.message || 'No booking tokens remaining.');
      overlay?.setStatus('Booking blocked — no tokens left for payment step.');
      overlay?.setStep('Access');
      await IRCTCExt.Storage.updateState({ running: false, status: 'idle', currentStep: 'access' });
      return false;
    }

    await IRCTCExt.Storage.updateState({ tokenConsumed: true });
    config.state.tokenConsumed = true;
    return true;
  },

  async handlePaymentPage(overlay, config, site) {
    if (config.state.paymentDone) return 'done';

    overlay.setStep('Payment');

    const autoPayEnabled = !!config.preferences?.autoPayEnabled;
    const canAutoPay = IRCTCExt.Bot.isAutoPayAvailable();

    if (!autoPayEnabled || !canAutoPay) {
      const reason = !autoPayEnabled
        ? 'Auto pay disabled — complete payment manually.'
        : 'Auto pay is not available in this host — complete payment manually.';
      overlay.setStatus(reason);
      await IRCTCExt.Storage.updateState({ paymentDone: true });
      await site.flows.BookingFlow.showPaymentReview(overlay);
      IRCTCExt.PlatformBridge?.sendMessage('BOOKING_STATUS', { status: 'payment_manual' });
      return 'done';
    }

    const sitePayment = site.flows?.BookingFlow?.handlePayment;
    if (sitePayment) {
      const result = await sitePayment(config, overlay);
      if (result?.awaitingGateway) {
        await IRCTCExt.Storage.updateState({ currentStep: 'gateway' });
        overlay.setStep('Gateway');
        IRCTCExt.PlatformBridge?.sendMessage('BOOKING_STATUS', {
          status: 'awaiting_gateway',
          step: 'gateway',
          gateway: result.gateway
        });
        return 'wait';
      }
      overlay.setStatus('Payment flow started. Complete payment on gateway.');
    } else {
      const method = config.preferences?.paymentMethod || 'cards';

      if (method === 'upi') {
        await IRCTCExt.BkgPayment.handleUpiPayment(config, overlay);
        overlay.setStatus('Payment provider selected. Complete payment on IRCTC.');
      } else if (method === 'cards') {
        const result = await IRCTCExt.BkgPayment.handleCardsPayment(config, overlay);
        if (result?.awaitingGateway) {
          await IRCTCExt.Storage.updateState({ currentStep: 'gateway' });
          overlay.setStep('Gateway');
          IRCTCExt.PlatformBridge?.sendMessage('BOOKING_STATUS', {
            status: 'awaiting_gateway',
            step: 'gateway',
            gateway: result.gateway
          });
          return 'wait';
        }
        overlay.setStatus('Cards payment flow started. Complete payment on gateway.');
      } else {
        throw new Error(`Unsupported payment method: ${method}`);
      }
    }

    await IRCTCExt.Storage.updateState({ paymentDone: true });
    await site.flows.BookingFlow.showPaymentReview(overlay);
    IRCTCExt.PlatformBridge?.sendMessage('BOOKING_STATUS', { status: 'done' });
    return 'done';
  },

  async runForCurrentPath(overlay) {
    const config = await IRCTCExt.Bot.applyProgressFromPath();
    const site = await IRCTCExt.Bot.getSite(config);
    const path = location.pathname;

    if (site.isErrorPage(path)) {
      await IRCTCExt.Bot.handleErrorPageIfNeeded(overlay);
      return 'wait';
    }

    const step = site.syncStepFromPath(path, config.state);
    await IRCTCExt.Storage.updateState({ currentStep: step });
    overlay.setStep(step);
    IRCTCExt.PlatformBridge?.sendMessage('BOOKING_STATUS', { step, status: config.state.status });

    if (site.isPaymentPath(path)) {
      const canPay = await IRCTCExt.Bot.ensureTokenForPayment(overlay, config);
      if (!canPay) return 'done';
      return IRCTCExt.Bot.handlePaymentPage(overlay, config, site);
    }

    if (site.isReviewPath(path)) {
      await site.flows.BookingFlow.clickContinueToPayment(overlay);
      if (site.isPaymentPath(location.pathname)) return 'continue';
      overlay.setStatus('Waiting for payment page...');
      return 'wait';
    }

    if (site.isPassengerPath(path)) {
      if (!config.state.passengersDone) {
        await site.flows.BookingFlow.fillPassengers(config, overlay);
        await IRCTCExt.Storage.updateState({ passengersDone: true, currentStep: 'review' });
        return 'continue';
      }
      const psgnPrefs = IRCTCExt.NgetPsgnPreferencesFlow;
      const awaitingPsgnContinue =
        config.state.psgnPaymentContinueClicked ||
        (psgnPrefs?.isPageProcessing?.() && psgnPrefs?.findPaymentPanel?.());
      if (awaitingPsgnContinue && psgnPrefs?.waitAfterContinueClick) {
        await psgnPrefs.waitAfterContinueClick(overlay);
        if (site.isPaymentPath(location.pathname)) return 'continue';
        if (site.isReviewPath(location.pathname)) return 'continue';
        return 'wait';
      }
      await site.flows.BookingFlow.configurePsgninputOptions(config, overlay);
      if (site.isPaymentPath(location.pathname)) return 'continue';
      if (site.isReviewPath(location.pathname)) return 'continue';
      overlay.setStatus('Waiting for review or payment page...');
      return 'wait';
    }

    if (site.isTrainListPath(path)) {
      overlay.setStatus('Train list loaded — starting booking...');
      await site.TrainList.bookTrain(config, overlay);
      return 'continue';
    }

    if (site.isTrainSearchPath(path)) {
      await site.flows.LoginFlow.runWithRetry(config, overlay);
      await site.flows.SearchFlow.run(config, overlay);
      if (site.isTrainListPath(location.pathname)) return 'continue';
      overlay.setStatus('Waiting for train list...');
      return 'wait';
    }

    await IRCTCExt.Bot.runLoginIfNeeded(config, overlay, site);
    overlay.setStatus('Waiting for next booking page...');
    return 'wait';
  },

  async start({ resetSession = true } = {}) {
    if (this.running) return;

    const config = await IRCTCExt.Storage.get();
    if (await IRCTCExt.Bot.wasStopped()) return;

    await IRCTCExt.Bot.waitForSiteReady(config);
    if (await IRCTCExt.Bot.wasStopped()) return;

    if (!resetSession) {
      await IRCTCExt.Bot.applyProgressFromPath();
    }

    const access = await IRCTCExt.PlatformBridge
      .sendMessage('CHECK_ACCESS', { forceRefresh: false })
      .catch(() => null);

    if (!access?.allowed) {
      const overlay = await IRCTCExt.Overlay.show().catch(() => null);
      const message =
        access?.tier === 'none'
          ? 'No access yet. Link your Buy Me a Coffee email in the app.'
          : access?.message || 'Access expired. Link your Buy Me a Coffee email.';
      overlay?.setError(message);
      overlay?.setStatus('Booking blocked — access not active.');
      overlay?.setStep('Access');
      await IRCTCExt.Storage.updateState({ running: false, status: 'idle', currentStep: 'access' });
      return;
    }

    if (await IRCTCExt.Bot.wasStopped()) return;

    this.running = true;

    const overlay = await IRCTCExt.Overlay.show();
    if (!overlay || typeof overlay.startTimer !== 'function') {
      this.running = false;
      throw new Error('Overlay failed to initialize');
    }
    overlay.startTimer();
    overlay.setError('');
    overlay.setStep('Starting');

    IRCTCExt.Modals.dismissSessionRestore();

    if (await IRCTCExt.Bot.wasStopped()) {
      this.running = false;
      return;
    }

    const sessionReset = {
      running: true,
      paused: false,
      status: 'running',
      lastRun: new Date().toISOString()
    };

    if (resetSession) {
      Object.assign(sessionReset, {
        passengersDone: false,
        psgnPaymentContinueClicked: false,
        paymentDone: false,
        paymentPhase: null,
        paymentGateway: null,
        awaitingGateway: false,
        bookingSessionId: crypto.randomUUID(),
        tokenConsumed: false
      });
    }

    await IRCTCExt.Storage.updateState(sessionReset);

    try {
      let attempts = 0;
      const maxRetries = 3;

      while (await IRCTCExt.Bot.isRunning()) {
        if (!(await IRCTCExt.Bot.shouldContinue())) {
          overlay.setStatus('Paused');
          overlay.setStep('Paused');
          const resumed = await IRCTCExt.Bot.waitUntilResumedOrStopped();
          if (resumed === 'stopped') break;
          overlay.setStatus('Resumed');
          continue;
        }

        try {
          const result = await IRCTCExt.Bot.runForCurrentPath(overlay);
          attempts = 0;
          if (result === 'done') break;
          if (result === 'wait') break;
          if (result === 'continue') continue;
        } catch (err) {
          if (err.code === 'BOOKING_STOPPED' || err.message === 'Booking stopped') break;
          attempts += 1;
          console.error('[IRCTC-Bot]', err);
          overlay.setError(err.message || String(err));
          if (attempts >= maxRetries) {
            await IRCTCExt.Storage.updateState({
              paused: true,
              status: 'paused',
              running: true,
              message: err.message || String(err)
            });
            overlay.setStatus(
              'Paused — finish this step manually, then open the next page or click Resume.'
            );
            overlay.setStep('Paused');
            break;
          }
          overlay.setStatus(`Retry ${attempts}/${maxRetries}...`);
          await IRCTCExt.Wait.delay(1500);
        }
      }

      const finalConfig = await IRCTCExt.Storage.get();
      if (finalConfig.state.currentStep === 'done' || finalConfig.state.status === 'done') {
        overlay.setStatus('Automation sequence completed.');
        overlay.setStep('Done');
        IRCTCExt.PlatformBridge?.sendMessage('BOOKING_STATUS', { status: 'done' });
      } else if (finalConfig.state.paused && finalConfig.state.running) {
        overlay.setStep('Paused');
      } else if (finalConfig.state.running) {
        overlay.setStatus(`Waiting at step: ${finalConfig.state.currentStep}`);
        overlay.setStep(finalConfig.state.currentStep);
      }
    } catch (err) {
      console.error('[IRCTC-Bot] Fatal:', err);
      overlay.setError(err.message || String(err));
      overlay.setStatus('Failed: ' + (err.message || err));
      overlay.setStep('Error');
      await IRCTCExt.Storage.updateState({ status: 'error', running: false, message: err.message });
      IRCTCExt.PlatformBridge?.sendMessage('BOOKING_STATUS', { status: 'error', message: err.message });
    } finally {
      this.running = false;
    }
  },

  async resumeIfNeeded() {
    const overlay = await IRCTCExt.Overlay.show().catch(() => null);
    if (await IRCTCExt.Bot.handleErrorPageIfNeeded(overlay)) return;

    const config = await IRCTCExt.Storage.get();
    if (!config.state.running || config.state.paused || config.state.status === 'stopped' || this.running) return;
    try {
      await IRCTCExt.Bot.start({ resetSession: false });
    } catch (err) {
      console.error('[IRCTC-Bot] Resume failed:', err);
    }
  },

  async restart() {
    const config = await IRCTCExt.Storage.get();
    const site = IRCTCExt.SiteRegistry.get(config);

    this.running = false;

    const overlay = await IRCTCExt.Overlay.show();
    const pausePanel = document.getElementById('irctc-ext-pause-panel');
    if (pausePanel) pausePanel.style.display = 'none';
    overlay.setError('');
    overlay.setStatus('Restarting from train search...');
    overlay.setStep('Restart');
    overlay.startTimer();

    sessionStorage.setItem(IRCTCExt.Bot.RESTART_FLAG, '1');

    await IRCTCExt.Storage.updateState({
      currentStep: 'init',
      running: true,
      paused: false,
      status: 'running',
      passengersDone: false,
      psgnPaymentContinueClicked: false,
      paymentDone: false,
      paymentPhase: null,
      paymentGateway: null,
      awaitingGateway: false,
      autoRestartCount: 0,
      bookingSessionId: crypto.randomUUID(),
      tokenConsumed: false
    });

    if (site.isTrainSearchPath(location.pathname)) {
      location.reload();
    } else {
      location.assign(site.trainSearchUrl);
    }
  },

  init() {
    if (window.__irctcBotInitDone) return;
    window.__irctcBotInitDone = true;

    IRCTCExt.Wait.installIrctcNoiseFilter?.();

    IRCTCExt.Modals.init();
    IRCTCExt.Overlay.init().catch((err) => console.warn('[IRCTC-Bot] Overlay init:', err));

    this.unwatchPath = IRCTCExt.Wait.watchPath(async (newPath, prevPath) => {
      const overlay = await IRCTCExt.Overlay.show().catch(() => null);
      if (await IRCTCExt.Bot.handleErrorPageIfNeeded(overlay)) return;

      const config = await IRCTCExt.Storage.get();
      if (!config.state.running || config.state.status === 'stopped') return;

      if (config.state.paused && prevPath && newPath !== prevPath) {
        const site = await IRCTCExt.Bot.getSite(config).catch(() => null);
        const progress = site?.syncProgressFromPath?.(newPath, config.state) || {};
        await IRCTCExt.Storage.updateState({
          ...progress,
          paused: false,
          status: 'running'
        });
        overlay?.setError('');
        overlay?.setStatus('Resumed after page change — continuing...');
        await IRCTCExt.Bot.kickRunLoop();
        return;
      }

      if (config.state.paused) return;

      await IRCTCExt.Bot.resumeIfNeeded();
    });

    const handleMessage = (msg, sendResponse) => {
      if (msg.type === 'PING') {
        sendResponse({ ok: true, ready: IRCTCExt.Bot.isContentScriptReady() });
        return true;
      }

      if (msg.type === 'START_BOOKING') {
        (async () => {
          if (msg.config) {
            IRCTCExt.Storage.setCachedConfig(msg.config);
          }
          const config = await IRCTCExt.Storage.get();
          if (await IRCTCExt.Bot.wasStopped()) return;

          await IRCTCExt.Bot.waitForSiteReady(config);
          if (await IRCTCExt.Bot.wasStopped()) return;

          if (!IRCTCExt.Bot.running) {
            await IRCTCExt.Bot.start({ resetSession: false });
          } else {
            await IRCTCExt.Bot.kickRunLoop();
          }
        })().catch((err) => console.error('[IRCTC-Bot] Start failed:', err));
        sendResponse({ ok: true });
        return true;
      }

      if (msg.type === 'GET_STATUS') {
        IRCTCExt.Storage.get().then((c) => sendResponse({ state: c.state }));
        return true;
      }

      if (msg.type === 'STOP_BOOKING') {
        IRCTCExt.Bot.stop().catch((err) => console.error('[IRCTC-Bot] Stop failed:', err));
        sendResponse({ ok: true });
        return true;
      }

      if (msg.type === 'CONTINUE_BOOKING') {
        (async () => {
          await IRCTCExt.Storage.updateState({ paused: false, status: 'running' });
          await IRCTCExt.Bot.applyProgressFromPath();
          await IRCTCExt.Bot.kickRunLoop();
          sendResponse({ ok: true });
        })().catch((err) => {
          console.error('[IRCTC-Bot] Continue failed:', err);
          sendResponse({ ok: false, error: err.message });
        });
        return true;
      }

      if (msg.type === 'PAUSE_BOOKING') {
        IRCTCExt.Storage.updateState({ paused: true }).then(() => sendResponse({ ok: true }));
        return true;
      }

      return false;
    };

    if (IRCTCExt.PlatformBridge?.onMessage) {
      IRCTCExt.PlatformBridge.onMessage(handleMessage);
    }

    IRCTCExt.Wait.poll(() => document.body, { timeout: 10000, interval: 50 }).then(async () => {
      if (sessionStorage.getItem(IRCTCExt.Bot.STOP_FLAG) === '1') {
        sessionStorage.removeItem(IRCTCExt.Bot.STOP_FLAG);
        IRCTCExt.Bot.running = false;
        const overlay = await IRCTCExt.Overlay.show().catch(() => null);
        overlay?.setStatus('Stopped');
        overlay?.setStep('Idle');
        overlay?.setError('');
        overlay?.stopTimer();
        return;
      }

      if (sessionStorage.getItem(IRCTCExt.Bot.RESTART_FLAG) === '1') {
        sessionStorage.removeItem(IRCTCExt.Bot.RESTART_FLAG);
        IRCTCExt.Bot.running = false;
        try {
          await IRCTCExt.Bot.start();
        } catch (err) {
          console.error('[IRCTC-Bot] Restart resume failed:', err);
        }
        return;
      }
      await IRCTCExt.Bot.resumeIfNeeded();
    });
  }
};

IRCTCExt.Bot.init();
