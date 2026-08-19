window.IRCTCExt = window.IRCTCExt || {};

IRCTCExt.Bot = {
  running: false,
  unwatchPath: null,

  async shouldContinue() {
    const config = await IRCTCExt.Storage.get();
    return config.state.running && !config.state.paused;
  },

  async runCurrentStep(overlay) {
    const config = await IRCTCExt.Storage.get();
    const step = config.state.currentStep;
    const path = location.pathname;

    if (step === 'init' || step === 'login' || step === 'login-captcha') {
      try {
        await IRCTCExt.LoginFlow.run(config, overlay);
      } catch (err) {
        console.warn('[IRCTC-Bot] Login step:', err);
        overlay.setStatus('Continuing to search (login not completed)');
      }
      await IRCTCExt.Storage.updateState({ currentStep: 'search' });
      return 'continue';
    }

    if (step === 'search') {
      if (!path.includes('train-search')) {
        overlay.setStatus('Navigate to train search page...');
        return 'wait';
      }
      await IRCTCExt.SearchFlow.run(config, overlay);
      return 'continue';
    }

    if (step === 'train-list') {
      if (!path.includes('train-list')) {
        overlay.setStatus('Waiting for train list page...');
        return 'wait';
      }
      await IRCTCExt.TrainList.bookTrain(config, overlay);
      await IRCTCExt.Wait.poll(
        () => !location.pathname.includes('train-list'),
        { timeout: 25000, interval: 300 }
      );
      await IRCTCExt.Storage.updateState({ currentStep: 'passengers' });
      return 'continue';
    }

    if (step === 'passengers' || step === 'review' || step === 'payment') {
      await IRCTCExt.BookingFlow.run(config, overlay);
      return 'done';
    }

    return 'done';
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

    await IRCTCExt.Storage.updateState({
      running: true,
      paused: false,
      status: 'running',
      lastRun: new Date().toISOString()
    });

    try {
      let attempts = 0;
      const maxRetries = 3;

      while (await IRCTCExt.Bot.shouldContinue()) {
        try {
          const result = await IRCTCExt.Bot.runCurrentStep(overlay);
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
    const config = await IRCTCExt.Storage.get();
    if (!config.state.running || config.state.paused || this.running) return;
    try {
      await IRCTCExt.Bot.start();
    } catch (err) {
      console.error('[IRCTC-Bot] Resume failed:', err);
    }
  },

  init() {
    IRCTCExt.Overlay.init().catch((err) => console.warn('[IRCTC-Bot] Overlay init:', err));

    this.unwatchPath = IRCTCExt.Wait.watchPath(async (path) => {
      const config = await IRCTCExt.Storage.get();
      if (!config.state.running || config.state.paused) return;

      await IRCTCExt.Bot.resumeIfNeeded();
    });

    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg.type === 'START_BOOKING') {
        if (IRCTCExt.Bot.running) {
          sendResponse({ ok: true });
        } else {
          IRCTCExt.Storage.updateState({ currentStep: 'init', running: true, paused: false, status: 'running' }).then(() => {
            IRCTCExt.Bot.start().catch((err) => console.error('[IRCTC-Bot] Start failed:', err));
          });
          sendResponse({ ok: true });
        }
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
