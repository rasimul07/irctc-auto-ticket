// Deprecated: the active extension loads packages/core/dist/extension-bot.iife.js instead.
// Keep this file only as a reference when porting bot changes into packages/core.
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
      throw new Error('Booking site profile not loaded. Reload the extension.');
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
    if (!site) throw new Error('Booking site profile not loaded. Reload the extension.');
    return site;
  },

  isContentScriptReady() {
    const sites = IRCTCExt.SiteRegistry?.SITES || {};
    return !!(sites.eticket?.flows && sites.nget?.flows);
  },

  isExtensionInvalidated(err) {
    return (
      err?.code === 'EXTENSION_CONTEXT_INVALIDATED' || IRCTCExt.Storage?.isContextInvalidated?.(err)
    );
  },

  async handleExtensionInvalidated(overlay, err) {
    this.running = false;
    const message = err?.message || IRCTCExt.Storage.CONTEXT_INVALIDATED_MESSAGE;
    overlay?.setError(message);
    overlay?.setStatus('Extension disconnected — refresh this IRCTC tab');
    overlay?.setStep('Error');
  },

  async handleErrorPageIfNeeded(overlay) {
    let config;
    try {
      config = await IRCTCExt.Storage.get();
    } catch (err) {
      if (IRCTCExt.Bot.isExtensionInvalidated(err)) {
        await IRCTCExt.Bot.handleExtensionInvalidated(overlay, err);
        return true;
      }
      throw err;
    }
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
    try {
      const config = await IRCTCExt.Storage.get();
      return config.state.running && !config.state.paused;
    } catch (err) {
      if (IRCTCExt.Bot.isExtensionInvalidated(err)) return false;
      throw err;
    }
  },

  async isRunning() {
    try {
      const config = await IRCTCExt.Storage.get();
      return !!config.state.running;
    } catch (err) {
      if (IRCTCExt.Bot.isExtensionInvalidated(err)) return false;
      throw err;
    }
  },

  async checkControlState() {
    try {
      const config = await IRCTCExt.Storage.get();
      if (!config.state.running) return 'stopped';
      if (config.state.paused) return 'paused';
      return null;
    } catch (err) {
      if (IRCTCExt.Bot.isExtensionInvalidated(err)) return 'stopped';
      throw err;
    }
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

    try {
      await IRCTCExt.Storage.updateState({
        running: false,
        paused: false,
        status: 'stopped',
        currentStep: 'init'
      });
    } catch (err) {
      if (!IRCTCExt.Bot.isExtensionInvalidated(err)) throw err;
    }

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

    const result = await chrome.runtime
      .sendMessage({ type: 'CONSUME_TOKEN', usageKey })
      .catch(() => null);

    if (!result?.ok) {
      overlay?.setError(result?.message || 'No booking tokens remaining. Buy a coffee on Buy Me a Coffee and link your email.');
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

    if (!config.preferences?.autoPayEnabled) {
      overlay.setStatus('Auto pay disabled — complete payment manually.');
      await IRCTCExt.Storage.updateState({ paymentDone: true });
      await site.flows.BookingFlow.showPaymentReview(overlay);
      return 'done';
    }

    const method = config.preferences?.paymentMethod || 'cards';

    if (method === 'upi') {
      await IRCTCExt.BkgPayment.handleUpiPayment(config, overlay);
      overlay.setStatus('Payment provider selected. Complete payment on IRCTC.');
    } else if (method === 'cards') {
      const result = await IRCTCExt.BkgPayment.handleCardsPayment(config, overlay);
      if (result?.awaitingGateway) return 'wait';
      overlay.setStatus('Cards payment flow started. Complete payment on gateway.');
    } else {
      throw new Error(`Unsupported payment method: ${method}`);
    }

    await IRCTCExt.Storage.updateState({ paymentDone: true });
    await site.flows.BookingFlow.showPaymentReview(overlay);
    return 'done';
  },

  async runForCurrentPath(overlay) {
    const config = await IRCTCExt.Storage.get();
    const site = await IRCTCExt.Bot.getSite(config);
    const path = location.pathname;

    if (site.isErrorPage(path)) {
      await IRCTCExt.Bot.handleErrorPageIfNeeded(overlay);
      return 'wait';
    }

    const step = site.syncStepFromPath(path, config.state);
    await IRCTCExt.Storage.updateState({ currentStep: step });
    overlay.setStep(step);

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

  async start() {
    if (this.running) return;

    let config;
    try {
      config = await IRCTCExt.Storage.get();
    } catch (err) {
      if (IRCTCExt.Bot.isExtensionInvalidated(err)) {
        const overlay = await IRCTCExt.Overlay.show().catch(() => null);
        await IRCTCExt.Bot.handleExtensionInvalidated(overlay, err);
        return;
      }
      throw err;
    }

    await IRCTCExt.Bot.waitForSiteReady(config);


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

    await IRCTCExt.Storage.updateState({
      running: true,
      paused: false,
      status: 'running',
      lastRun: new Date().toISOString(),
      passengersDone: false,
      paymentDone: false,
      paymentPhase: null,
      paymentGateway: null,
      awaitingGateway: false,
      bookingSessionId: crypto.randomUUID(),
      tokenConsumed: false
    });

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
          if (result === 'done') break;
          if (result === 'wait') break;
          if (result === 'continue') continue;
        } catch (err) {
          if (IRCTCExt.Bot.isExtensionInvalidated(err)) {
            await IRCTCExt.Bot.handleExtensionInvalidated(overlay, err);
            break;
          }
          if (err.code === 'BOOKING_STOPPED' || err.message === 'Booking stopped') break;
          attempts += 1;
          console.error('[IRCTC-Bot]', err);
          overlay.setError(err.message || String(err));
          if (attempts >= maxRetries) throw err;
          overlay.setStatus(`Retry ${attempts}/${maxRetries}...`);
          await IRCTCExt.Wait.delay(1500);
        }
      }

      const finalConfig = await IRCTCExt.Storage.get();
      if (finalConfig.state.currentStep === 'done' || finalConfig.state.status === 'done') {
        overlay.setStatus('Automation sequence completed.');
        overlay.setStep('Done');
      } else if (finalConfig.state.running) {
        overlay.setStatus(`Waiting at step: ${finalConfig.state.currentStep}`);
        overlay.setStep(finalConfig.state.currentStep);
      }
    } catch (err) {
      console.error('[IRCTC-Bot] Fatal:', err);
      if (IRCTCExt.Bot.isExtensionInvalidated(err)) {
        await IRCTCExt.Bot.handleExtensionInvalidated(overlay, err);
      } else {
        overlay.setError(err.message || String(err));
        overlay.setStatus('Failed: ' + (err.message || err));
        overlay.setStep('Error');
        try {
          await IRCTCExt.Storage.updateState({ status: 'error', running: false, message: err.message });
        } catch (storageErr) {
          if (!IRCTCExt.Bot.isExtensionInvalidated(storageErr)) throw storageErr;
        }
      }
    } finally {
      this.running = false;
    }
  },

  async resumeIfNeeded() {
    const overlay = await IRCTCExt.Overlay.show().catch(() => null);
    if (await IRCTCExt.Bot.handleErrorPageIfNeeded(overlay)) return;

    let config;
    try {
      config = await IRCTCExt.Storage.get();
    } catch (err) {
      if (IRCTCExt.Bot.isExtensionInvalidated(err)) {
        await IRCTCExt.Bot.handleExtensionInvalidated(overlay, err);
        return;
      }
      throw err;
    }

    if (!config.state.running || config.state.paused || this.running) return;
    try {
      await IRCTCExt.Bot.start();
    } catch (err) {
      if (IRCTCExt.Bot.isExtensionInvalidated(err)) {
        await IRCTCExt.Bot.handleExtensionInvalidated(overlay, err);
        return;
      }
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
    IRCTCExt.PaymentReviewOverlay.init()
      .then(() => {
        IRCTCExt.PaymentReviewOverlay.watch();
      })
      .catch((err) => console.warn('[IRCTC-Bot] Payment review overlay init:', err));

    this.unwatchPath = IRCTCExt.Wait.watchPath(async () => {
      const overlay = await IRCTCExt.Overlay.show().catch(() => null);
      if (await IRCTCExt.Bot.handleErrorPageIfNeeded(overlay)) return;

      try {
        const config = await IRCTCExt.Storage.get();
        if (!config.state.running || config.state.paused) return;
        await IRCTCExt.Bot.resumeIfNeeded();
      } catch (err) {
        if (IRCTCExt.Bot.isExtensionInvalidated(err)) {
          await IRCTCExt.Bot.handleExtensionInvalidated(overlay, err);
        }
      }
    });

    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg.type === 'PING') {
        sendResponse({ ok: true, ready: IRCTCExt.Bot.isContentScriptReady() });
        return true;
      }

      if (msg.type === 'START_BOOKING') {
        (async () => {
          const config = await IRCTCExt.Storage.get();
          await IRCTCExt.Bot.waitForSiteReady(config);
          await IRCTCExt.Storage.updateState({
            currentStep: 'init',
            running: true,
            paused: false,
            status: 'running',
            passengersDone: false,
            paymentDone: false,
            autoRestartCount: 0,
            paymentPhase: null,
            paymentGateway: null,
            awaitingGateway: false
          });
          if (!IRCTCExt.Bot.running) {
            await IRCTCExt.Bot.start();
          }
        })().catch(async (err) => {
          if (IRCTCExt.Bot.isExtensionInvalidated(err)) {
            const overlay = await IRCTCExt.Overlay.show().catch(() => null);
            await IRCTCExt.Bot.handleExtensionInvalidated(overlay, err);
            return;
          }
          console.error('[IRCTC-Bot] Start failed:', err);
        });
        sendResponse({ ok: true });
        return true;
      }

      if (msg.type === 'GET_STATUS') {
        IRCTCExt.Storage.get()
          .then((c) => sendResponse({ state: c.state }))
          .catch((err) =>
            sendResponse({
              state: null,
              error: IRCTCExt.Bot.isExtensionInvalidated(err)
                ? err.message
                : String(err?.message || err)
            })
          );
        return true;
      }

      if (msg.type === 'STOP_BOOKING') {
        IRCTCExt.Bot.stop().catch((err) => console.error('[IRCTC-Bot] Stop failed:', err));
        sendResponse({ ok: true });
        return true;
      }

      return false;
    });

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
          if (IRCTCExt.Bot.isExtensionInvalidated(err)) {
            const overlay = await IRCTCExt.Overlay.show().catch(() => null);
            await IRCTCExt.Bot.handleExtensionInvalidated(overlay, err);
            return;
          }
          console.error('[IRCTC-Bot] Restart resume failed:', err);
        }
        return;
      }
      await IRCTCExt.Bot.resumeIfNeeded();
    });
  }
};

IRCTCExt.Bot.init();
