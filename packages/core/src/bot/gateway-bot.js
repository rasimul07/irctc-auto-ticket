(function (root) {
  root.IRCTCExt = root.IRCTCExt || {};
})(typeof globalThis !== 'undefined' ? globalThis : window);

IRCTCExt.GatewayBot = {
  running: false,
  _lastUrl: '',
  _resumeTimer: null,
  _overlayShown: false,

  isGatewayPage() {
    return !!(
      IRCTCExt.Gateways?.isIrctcPaymentsHost?.() ||
      IRCTCExt.Gateways?.isIrctcIpayHost?.() ||
      IRCTCExt.Gateways?.isPhonePeHost?.() ||
      IRCTCExt.NgetPaths?.isGatewayPath?.()
    );
  },

  isBookingActiveOnGateway(config) {
    const state = config?.state || {};
    if (!state.running) return false;
    if (state.paymentDone) return false;
    if (state.status === 'stopped' || state.status === 'done') return false;
    return true;
  },

  isActiveGatewaySession(config) {
    if (!IRCTCExt.GatewayBot.isBookingActiveOnGateway(config)) return false;
    const state = config?.state || {};
    if (state.awaitingGateway || state.paymentPhase === 'gateway' || state.currentStep === 'gateway') {
      return true;
    }
    // Third-party gateway page during an active booking — adopt gateway step.
    return IRCTCExt.GatewayBot.isGatewayPage();
  },

  async ensureGatewayBookingState(config) {
    if (!IRCTCExt.GatewayBot.isActiveGatewaySession(config)) return config;
    const state = config?.state || {};
    if (state.awaitingGateway && state.paymentPhase === 'gateway') return config;

    return IRCTCExt.Storage.updateState({
      awaitingGateway: true,
      paymentPhase: 'gateway',
      currentStep: 'gateway',
      status: state.status === 'error' ? 'running' : state.status || 'running'
    });
  },

  getGatewayStatusMessage() {
    if (IRCTCExt.NgetPaths?.isGatewayAuthRedirectPath?.()) {
      return 'Payment gateway loading — please wait...';
    }
    if (location.pathname.includes('authRedirect')) {
      return 'Payment gateway loading — please wait...';
    }
    return 'Payment gateway loaded — continuing automation...';
  },

  async showGatewayOverlay(config) {
    if (!IRCTCExt.GatewayBot.isGatewayPage()) return null;
    if (!IRCTCExt.GatewayBot.isActiveGatewaySession(config)) return null;

    if (IRCTCExt.EticketSelectors) {
      IRCTCExt.SELECTORS = IRCTCExt.EticketSelectors;
    }

    const overlay = await IRCTCExt.Overlay.show();
    if (!IRCTCExt.GatewayBot._overlayShown) {
      overlay.startTimer();
    }
    IRCTCExt.GatewayBot._overlayShown = true;
    overlay.setStep('Gateway');
    overlay.setError('');
    overlay.setStatus(IRCTCExt.GatewayBot.getGatewayStatusMessage());
    IRCTCExt.PlatformBridge?.sendMessage('BOOKING_STATUS', {
      status: 'gateway',
      step: 'gateway'
    });
    return overlay;
  },

  scheduleResumeRetries() {
    if (IRCTCExt.GatewayBot._resumeTimer) return;
    let attempts = 0;
    const maxAttempts = 30;

    IRCTCExt.GatewayBot._resumeTimer = setInterval(() => {
      attempts += 1;
      if (attempts > maxAttempts) {
        clearInterval(IRCTCExt.GatewayBot._resumeTimer);
        IRCTCExt.GatewayBot._resumeTimer = null;
        return;
      }
      IRCTCExt.GatewayBot.resumeIfNeeded().catch((err) =>
        console.warn('[IRCTC-Gateway] Retry resume failed:', err)
      );
    }, 1000);
  },

  async resumeIfNeeded() {
    if (!IRCTCExt.GatewayBot.isGatewayPage()) return;

    let config = await IRCTCExt.Storage.get();
    if (!IRCTCExt.GatewayBot.isActiveGatewaySession(config)) return;

    config = await IRCTCExt.GatewayBot.ensureGatewayBookingState(config);

    const overlay = await IRCTCExt.GatewayBot.showGatewayOverlay(config);
    if (!overlay) return;

    if (config.state.paused) return;
    if (IRCTCExt.GatewayBot.running) return;

    IRCTCExt.GatewayBot.running = true;
    try {
      await IRCTCExt.Gateways.run(config, overlay);
    } catch (err) {
      console.error('[IRCTC-Gateway]', err);
      overlay.setError(err.message || String(err));
      overlay.setStatus('Gateway payment failed: ' + (err.message || err));
      overlay.setStep('Error');
      await IRCTCExt.Storage.updateState({
        status: 'error',
        running: false,
        awaitingGateway: false,
        message: err.message
      });
      IRCTCExt.PlatformBridge?.sendMessage('BOOKING_STATUS', {
        status: 'error',
        message: err.message
      });
    } finally {
      IRCTCExt.GatewayBot.running = false;
    }
  },

  onLocationMaybeChanged() {
    const href = location.href;
    if (href === IRCTCExt.GatewayBot._lastUrl) return;
    IRCTCExt.GatewayBot._lastUrl = href;
    IRCTCExt.GatewayBot.resumeIfNeeded().catch((err) =>
      console.error('[IRCTC-Gateway] Resume failed:', err)
    );
  },

  watchGatewayNavigation() {
    IRCTCExt.GatewayBot._lastUrl = location.href;
    window.addEventListener('popstate', () => IRCTCExt.GatewayBot.onLocationMaybeChanged());

    // Must bind to history — detached calls (common in SPAs) otherwise throw "Illegal invocation".
    const nativePushState = history.pushState.bind(history);
    const nativeReplaceState = history.replaceState.bind(history);
    history.pushState = function (...args) {
      const result = nativePushState(...args);
      IRCTCExt.GatewayBot.onLocationMaybeChanged();
      return result;
    };
    history.replaceState = function (...args) {
      const result = nativeReplaceState(...args);
      IRCTCExt.GatewayBot.onLocationMaybeChanged();
      return result;
    };

    setInterval(() => IRCTCExt.GatewayBot.onLocationMaybeChanged(), 750);
  },

  init() {
    if (IRCTCExt.GatewayBot._initialized) return;
    IRCTCExt.GatewayBot._initialized = true;

    IRCTCExt.Wait.installIrctcNoiseFilter?.();
    IRCTCExt.Overlay.init().catch((err) => console.warn('[IRCTC-Gateway] Overlay init:', err));

    const handleMessage = (msg, sendResponse) => {
      if (msg.type === 'PING') {
        sendResponse({ ok: true, ready: true });
        return true;
      }
      if (msg.type === 'RESUME_GATEWAY' || msg.type === 'START_GATEWAY') {
        IRCTCExt.GatewayBot.resumeIfNeeded().catch((err) =>
          console.error('[IRCTC-Gateway] Resume failed:', err)
        );
        sendResponse({ ok: true });
        return true;
      }
      if (msg.type === 'STOP_BOOKING') {
        IRCTCExt.Overlay.stop?.();
        sendResponse({ ok: true });
        return true;
      }
      return false;
    };

    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => handleMessage(msg, sendResponse));
    } else if (IRCTCExt.PlatformBridge?.onMessage) {
      IRCTCExt.PlatformBridge.onMessage(handleMessage);
    }

    IRCTCExt.GatewayBot.watchGatewayNavigation();
    IRCTCExt.GatewayBot.scheduleResumeRetries();

    const bootstrap = () => {
      IRCTCExt.GatewayBot.resumeIfNeeded().catch((err) =>
        console.error('[IRCTC-Gateway] Bootstrap resume failed:', err)
      );
    };

    if (document.body || document.documentElement) {
      bootstrap();
    } else {
      IRCTCExt.Wait.poll(() => document.body || document.documentElement, {
        timeout: 30000,
        interval: 50
      }).then(bootstrap);
    }
  }
};

IRCTCExt.GatewayBot.init();
