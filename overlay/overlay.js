window.IRCTCExt = window.IRCTCExt || {};

IRCTCExt.Overlay = {
  el: null,
  startTime: null,
  timerInterval: null,
  onContinue: null,
  onStop: null,
  _bound: false,

  async ensureBody() {
    if (document.body) return;
    await IRCTCExt.Wait.poll(() => document.body, { timeout: 10000, interval: 50 });
  },

  async init() {
    await IRCTCExt.Overlay.ensureBody();
    if (!document.body) return IRCTCExt.Overlay;

    if (document.getElementById('irctc-ext-overlay')) {
      IRCTCExt.Overlay.el = document.getElementById('irctc-ext-overlay');
      return IRCTCExt.Overlay;
    }

    const root = document.createElement('div');
    root.id = 'irctc-ext-overlay';
    root.className = 'irctc-ext-overlay irctc-ext-overlay--hidden';
    root.innerHTML = `
      <div class="irctc-ext-overlay__header">
        <span>IRCTC Tatkal Bot</span>
        <span id="irctc-ext-step">Idle</span>
      </div>
      <div class="irctc-ext-overlay__body">
        <div class="irctc-ext-overlay__status" id="irctc-ext-status">Ready</div>
        <div class="irctc-ext-overlay__timer" id="irctc-ext-timer">Elapsed: 0s</div>
        <div class="irctc-ext-overlay__actions">
          <button class="irctc-ext-overlay__btn" id="irctc-ext-pause" type="button">Pause</button>
          <button class="irctc-ext-overlay__btn irctc-ext-overlay__btn--danger" id="irctc-ext-stop" type="button">Stop</button>
        </div>
        <div class="irctc-ext-overlay__pause-panel" id="irctc-ext-pause-panel" style="display:none;">
          <div id="irctc-ext-pause-msg">Solve CAPTCHA, then click Continue.</div>
          <button class="irctc-ext-overlay__btn irctc-ext-overlay__btn--primary" id="irctc-ext-continue" type="button" style="margin-top:8px;width:100%;">Continue</button>
        </div>
        <div class="irctc-ext-overlay__error" id="irctc-ext-error"></div>
      </div>
    `;
    document.body.appendChild(root);
    IRCTCExt.Overlay.el = root;

    if (!IRCTCExt.Overlay._bound) {
      document.getElementById('irctc-ext-pause').addEventListener('click', () => IRCTCExt.Overlay.togglePause());
      document.getElementById('irctc-ext-stop').addEventListener('click', () => IRCTCExt.Overlay.stop());
      document.getElementById('irctc-ext-continue').addEventListener('click', () => {
        document.getElementById('irctc-ext-pause-panel').style.display = 'none';
        if (typeof IRCTCExt.Overlay.onContinue === 'function') IRCTCExt.Overlay.onContinue();
      });
      IRCTCExt.Overlay._bound = true;
    }

    return IRCTCExt.Overlay;
  },

  async show() {
    await IRCTCExt.Overlay.init();
    if (IRCTCExt.Overlay.el) {
      IRCTCExt.Overlay.el.classList.remove('irctc-ext-overlay--hidden');
    }
    return IRCTCExt.Overlay;
  },

  hide() {
    if (this.el) this.el.classList.add('irctc-ext-overlay--hidden');
    this.stopTimer();
  },

  startTimer() {
    this.startTime = Date.now();
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      const sec = Math.floor((Date.now() - this.startTime) / 1000);
      const timer = document.getElementById('irctc-ext-timer');
      if (timer) timer.textContent = `Elapsed: ${sec}s`;
    }, 1000);
  },

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  },

  setStep(step) {
    const el = document.getElementById('irctc-ext-step');
    if (el) el.textContent = step;
  },

  setStatus(msg) {
    const el = document.getElementById('irctc-ext-status');
    if (el) el.textContent = msg;
  },

  setError(msg) {
    const el = document.getElementById('irctc-ext-error');
    if (el) el.textContent = msg || '';
  },

  showPause(message, onContinue) {
    this.onContinue = onContinue;
    const panel = document.getElementById('irctc-ext-pause-panel');
    const msg = document.getElementById('irctc-ext-pause-msg');
    if (msg) msg.textContent = message;
    if (panel) panel.style.display = 'block';
  },

  async togglePause() {
    const config = await IRCTCExt.Storage.get();
    const paused = !config.state.paused;
    await IRCTCExt.Storage.updateState({ paused });
    this.setStatus(paused ? 'Paused' : 'Resumed');
  },

  async stop() {
    if (window.IRCTCExt?.Bot) IRCTCExt.Bot.running = false;
    await IRCTCExt.Storage.updateState({ running: false, paused: false, status: 'stopped', currentStep: 'init' });
    this.setStatus('Stopped');
    this.setStep('Stopped');
    this.stopTimer();
    if (typeof this.onStop === 'function') this.onStop();
  }
};
