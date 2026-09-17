(function (root) {
  root.IRCTCExt = root.IRCTCExt || {};
})(typeof globalThis !== 'undefined' ? globalThis : window);

IRCTCExt.GatewayBot = {
  running: false,

  async resumeIfNeeded() {
    const config = await IRCTCExt.Storage.get();
    if (!config.state.running || config.state.paused || !config.state.awaitingGateway) return;
    if (this.running) return;

    if (IRCTCExt.EticketSelectors) {
      IRCTCExt.SELECTORS = IRCTCExt.EticketSelectors;
    }

    this.running = true;
    try {
      const overlay = await IRCTCExt.Overlay.show();
      overlay.startTimer();
      overlay.setStep('Payment');
      overlay.setError('');
      overlay.setStatus('Payment gateway loaded — continuing automation...');
      await IRCTCExt.Gateways.run(config, overlay);
    } catch (err) {
      console.error('[IRCTC-Gateway]', err);
      const overlay = await IRCTCExt.Overlay.show().catch(() => null);
      overlay?.setError(err.message || String(err));
      overlay?.setStatus('Gateway payment failed: ' + (err.message || err));
      overlay?.setStep('Error');
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
      this.running = false;
    }
  },

  init() {
    if (IRCTCExt.GatewayBot._initialized) return;
    IRCTCExt.GatewayBot._initialized = true;

    IRCTCExt.Wait.installIrctcNoiseFilter?.();
    IRCTCExt.Overlay.init().catch((err) => console.warn('[IRCTC-Gateway] Overlay init:', err));

    const handleMessage = (msg, sendResponse) => {
      if (msg.type === 'PING') {
        sendResponse({ ok: true });
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

    IRCTCExt.Wait.poll(() => document.body, { timeout: 10000, interval: 50 }).then(() => {
      IRCTCExt.GatewayBot.resumeIfNeeded();
    });
  }
};

IRCTCExt.GatewayBot.init();
