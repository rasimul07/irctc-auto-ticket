window.IRCTCExt = window.IRCTCExt || {};

IRCTCExt.Bot = {
  running: false,
  unwatchPath: null,
  ERROR_PAGE_PATH: '/eticket/error',
  MAX_AUTO_RESTARTS: 3,

  isErrorPage(path = location.pathname) {
    return path.includes(this.ERROR_PAGE_PATH);
  },

  async handleErrorPageIfNeeded(overlay) {
    if (!IRCTCExt.Bot.isErrorPage()) return false;

    const config = await IRCTCExt.Storage.get();
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

  syncStepFromPath(path, state = {}) {
    if (path.includes('bkgPaymentOptions')) return 'payment';
    if (path.includes('reviewBooking')) return 'review';
    if (path.includes('psgninput')) return state.passengersDone ? 'review' : 'passengers';
    if (path.includes('train-list')) return 'train-list';
    if (path.includes('train-search')) return 'search';
    return 'init';
  },

  async runLoginIfNeeded(config, overlay) {
    if (await IRCTCExt.LoginFlow.isLoggedIn()) return;
    try {
      await IRCTCExt.LoginFlow.run(config, overlay);
    } catch (err) {
      console.warn('[IRCTC-Bot] Login step:', err);
      overlay.setStatus('Continuing (login not completed)');
    }
  },

  async handlePaymentPage(overlay, config) {
    if (config.state.paymentDone) return 'done';

    overlay.setStep('Payment');

    if (!config.preferences?.autoPayEnabled) {
      overlay.setStatus('Auto pay disabled — complete payment manually.');
      await IRCTCExt.Storage.updateState({ paymentDone: true });
      await IRCTCExt.BookingFlow.showPaymentReview(overlay);
      return 'done';
    }

    const method = config.preferences?.paymentMethod || 'cards';

    if (method === 'upi') {
      await IRCTCExt.BkgPayment.handleUpiPayment(config, overlay);
      overlay.setStatus('Payment provider selected. Complete payment on IRCTC.');
    } else if (method === 'cards') {
      await IRCTCExt.BkgPayment.handleCardsPayment(config, overlay);
      overlay.setStatus('Cards payment flow started. Complete payment on gateway.');
    } else {
      throw new Error(`Unsupported payment method: ${method}`);
    }

    await IRCTCExt.Storage.updateState({ paymentDone: true });
    await IRCTCExt.BookingFlow.showPaymentReview(overlay);
    return 'done';
  },

  async runForCurrentPath(overlay) {
    const config = await IRCTCExt.Storage.get();
    const path = location.pathname;

    if (IRCTCExt.Bot.isErrorPage(path)) {
      await IRCTCExt.Bot.handleErrorPageIfNeeded(overlay);
      return 'wait';
    }

    const step = IRCTCExt.Bot.syncStepFromPath(path, config.state);

    await IRCTCExt.Storage.updateState({ currentStep: step });
    overlay.setStep(step);

    if (path.includes('bkgPaymentOptions')) {
      return IRCTCExt.Bot.handlePaymentPage(overlay, config);
    }

    if (path.includes('reviewBooking')) {
      await IRCTCExt.BookingFlow.clickContinueToPayment(overlay);
      if (location.pathname.includes('bkgPaymentOptions')) {
        return 'continue';
      }
      overlay.setStatus('Waiting for payment page...');
      return 'wait';
    }

    if (path.includes('psgninput')) {
      if (!config.state.passengersDone) {
        await IRCTCExt.BookingFlow.fillPassengers(config, overlay);
        await IRCTCExt.Storage.updateState({ passengersDone: true, currentStep: 'review' });
        return 'continue';
      }
      await IRCTCExt.BookingFlow.configurePsgninputOptions(config, overlay);
      if (location.pathname.includes('bkgPaymentOptions')) return 'continue';
      if (location.pathname.includes('reviewBooking')) return 'continue';
      overlay.setStatus('Waiting for review or payment page...');
      return 'wait';
    }

    if (path.includes('train-list')) {
      await IRCTCExt.TrainList.bookTrain(config, overlay);
      return 'continue';
    }

    if (path.includes('train-search')) {
      await IRCTCExt.Bot.runLoginIfNeeded(config, overlay);
      await IRCTCExt.SearchFlow.run(config, overlay);
      overlay.setStatus('Waiting for train list...');
      return 'wait';
    }

    await IRCTCExt.Bot.runLoginIfNeeded(config, overlay);
    overlay.setStatus('Waiting for next booking page...');
    return 'wait';
  },

  async start() {
    if (this.running) return;
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
      paymentDone: false
    });

    try {
      let attempts = 0;
      const maxRetries = 3;

      while (await IRCTCExt.Bot.shouldContinue()) {
        try {
          const result = await IRCTCExt.Bot.runForCurrentPath(overlay);
          if (result === 'done') break;
          if (result === 'wait') break;
          if (result === 'continue') continue;
        } catch (err) {
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
      overlay.setError(err.message || String(err));
      overlay.setStatus('Failed: ' + (err.message || err));
      overlay.setStep('Error');
      await IRCTCExt.Storage.updateState({ status: 'error', running: false, message: err.message });
    } finally {
      this.running = false;
    }
  },

  async resumeIfNeeded() {
    const overlay = await IRCTCExt.Overlay.show().catch(() => null);
    if (await IRCTCExt.Bot.handleErrorPageIfNeeded(overlay)) return;

    const config = await IRCTCExt.Storage.get();
    if (!config.state.running || config.state.paused || this.running) return;
    try {
      await IRCTCExt.Bot.start();
    } catch (err) {
      console.error('[IRCTC-Bot] Resume failed:', err);
    }
  },

  async restart() {
    const TRAIN_SEARCH_URL = 'https://www.irctc.co.in/eticket/train-search';
    const TRAIN_SEARCH_PATH = '/eticket/train-search';

    this.running = false;

    const overlay = await IRCTCExt.Overlay.show();
    const pausePanel = document.getElementById('irctc-ext-pause-panel');
    if (pausePanel) pausePanel.style.display = 'none';
    overlay.setError('');
    overlay.setStatus('Restarting from train search...');
    overlay.setStep('Restart');
    overlay.startTimer();

    await IRCTCExt.Storage.updateState({
      currentStep: 'init',
      running: true,
      paused: false,
      status: 'running',
      passengersDone: false,
      paymentDone: false
    });

    if (location.pathname.includes(TRAIN_SEARCH_PATH)) {
      this.running = false;
      await this.start();
    } else {
      location.assign(TRAIN_SEARCH_URL);
    }
  },

  init() {
    if (IRCTCExt.Bot._initialized) return;
    IRCTCExt.Bot._initialized = true;

    IRCTCExt.Wait.installIrctcNoiseFilter?.();

    IRCTCExt.Modals.init();
    IRCTCExt.Overlay.init().catch((err) => console.warn('[IRCTC-Bot] Overlay init:', err));
    IRCTCExt.PaymentReviewOverlay.init().then(() => {
      IRCTCExt.PaymentReviewOverlay.watch();
    }).catch((err) => console.warn('[IRCTC-Bot] Payment review overlay init:', err));

    this.unwatchPath = IRCTCExt.Wait.watchPath(async () => {
      const overlay = await IRCTCExt.Overlay.show().catch(() => null);
      if (await IRCTCExt.Bot.handleErrorPageIfNeeded(overlay)) return;

      const config = await IRCTCExt.Storage.get();
      if (!config.state.running || config.state.paused) return;

      await IRCTCExt.Bot.resumeIfNeeded();
    });

    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg.type === 'PING') {
        sendResponse({ ok: true });
        return true;
      }
      if (msg.type === 'START_BOOKING') {
        IRCTCExt.Storage.updateState({
          currentStep: 'init',
          running: true,
          paused: false,
          status: 'running',
          passengersDone: false,
          paymentDone: false,
          autoRestartCount: 0
        }).then(() => {
          IRCTCExt.Bot.running = false;
          IRCTCExt.Bot.start().catch((err) => console.error('[IRCTC-Bot] Start failed:', err));
        });
        sendResponse({ ok: true });
        return true;
      }
      if (msg.type === 'GET_STATUS') {
        IRCTCExt.Storage.get().then((c) => sendResponse({ state: c.state }));
      }
      if (msg.type === 'STOP_BOOKING') {
        IRCTCExt.Overlay.stop();
        sendResponse({ ok: true });
      }
      return true;
    });

    IRCTCExt.Wait.poll(() => document.body, { timeout: 10000, interval: 50 }).then(() => {
      IRCTCExt.Bot.resumeIfNeeded();
    });
  }
};

IRCTCExt.Bot.init();
