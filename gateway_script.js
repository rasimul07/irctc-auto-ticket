window.IRCTCExt = window.IRCTCExt || {};

IRCTCExt.GatewayBot = {
  running: false,

  async resumeIfNeeded() {
    const config = await IRCTCExt.Storage.get();
    if (!config.state.running || config.state.paused || !config.state.awaitingGateway) return;
    if (this.running) return;

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
    } finally {
      this.running = false;
    }
  },

  init() {
    if (IRCTCExt.GatewayBot._initialized) return;
    IRCTCExt.GatewayBot._initialized = true;

    IRCTCExt.Wait.installIrctcNoiseFilter?.();
    IRCTCExt.Overlay.init().catch((err) => console.warn('[IRCTC-Gateway] Overlay init:', err));

    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg.type === 'PING') {
        sendResponse({ ok: true });
        return true;
      }
      if (msg.type === 'RESUME_GATEWAY') {
        IRCTCExt.GatewayBot.resumeIfNeeded().catch((err) =>
          console.error('[IRCTC-Gateway] Resume failed:', err)
        );
        sendResponse({ ok: true });
        return true;
      }
      if (msg.type === 'STOP_BOOKING') {
        IRCTCExt.Overlay.stop();
        sendResponse({ ok: true });
        return true;
      }
      return true;
    });

    IRCTCExt.Wait.poll(() => document.body, { timeout: 10000, interval: 50 }).then(() => {
      IRCTCExt.GatewayBot.resumeIfNeeded();
    });
  }
};

IRCTCExt.GatewayBot.init();
