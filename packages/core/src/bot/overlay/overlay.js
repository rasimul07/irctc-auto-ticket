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
      IRCTCExt.Overlay.ensureMinimizeButton();
      IRCTCExt.Overlay.ensureRestartButton();
      IRCTCExt.Overlay.bindEvents();
      return IRCTCExt.Overlay;
    }

    const root = document.createElement('div');
    root.id = 'irctc-ext-overlay';
    root.className = 'irctc-ext-overlay irctc-ext-overlay--hidden';
    root.innerHTML = `
      <div class="irctc-ext-overlay__header">
        <span>IRCTC Tatkal Assistant</span>
        <div class="irctc-ext-overlay__header-right">
          <span id="irctc-ext-step">Idle</span>
          <button type="button" class="irctc-ext-overlay__icon-btn" id="irctc-ext-minimize" title="Minimize" aria-label="Minimize overlay">−</button>
        </div>
      </div>
      <div class="irctc-ext-overlay__body">
        <div class="irctc-ext-overlay__status" id="irctc-ext-status">Ready</div>
        <div class="irctc-ext-overlay__timer" id="irctc-ext-timer">Elapsed: 0s</div>
        <div class="irctc-ext-overlay__actions">
          <button class="irctc-ext-overlay__btn" id="irctc-ext-pause" type="button">Pause</button>
          <button class="irctc-ext-overlay__btn irctc-ext-overlay__btn--accent" id="irctc-ext-restart" type="button">Restart</button>
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

    IRCTCExt.Overlay.bindEvents();

    return IRCTCExt.Overlay;
  },

  ensureMinimizeButton() {
    const header = this.el?.querySelector('.irctc-ext-overlay__header');
    if (!header || document.getElementById('irctc-ext-minimize')) return;

    let right = header.querySelector('.irctc-ext-overlay__header-right');
    if (!right) {
      right = document.createElement('div');
      right.className = 'irctc-ext-overlay__header-right';
      const step = document.getElementById('irctc-ext-step');
      if (step) right.appendChild(step);
      header.appendChild(right);
    }

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'irctc-ext-minimize';
    btn.className = 'irctc-ext-overlay__icon-btn';
    btn.title = 'Minimize';
    btn.setAttribute('aria-label', 'Minimize overlay');
    btn.textContent = '−';
    right.appendChild(btn);
  },

  ensureRestartButton() {
    const actions = this.el?.querySelector('.irctc-ext-overlay__actions');
    if (!actions || document.getElementById('irctc-ext-restart')) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'irctc-ext-restart';
    btn.className = 'irctc-ext-overlay__btn irctc-ext-overlay__btn--accent';
    btn.textContent = 'Restart';
    const stopBtn = document.getElementById('irctc-ext-stop');
    if (stopBtn) {
      actions.insertBefore(btn, stopBtn);
    } else {
      actions.appendChild(btn);
    }
  },

  bindEvents() {
    const minimizeBtn = document.getElementById('irctc-ext-minimize');
    if (minimizeBtn && minimizeBtn.dataset.bound !== '1') {
      minimizeBtn.dataset.bound = '1';
      minimizeBtn.addEventListener('click', () => IRCTCExt.Overlay.toggleMinimize());
    }

    const restartBtn = document.getElementById('irctc-ext-restart');
    if (restartBtn && restartBtn.dataset.bound !== '1') {
      restartBtn.dataset.bound = '1';
      restartBtn.addEventListener('click', () => IRCTCExt.Overlay.restart());
    }

    if (this._bound) return;

    document.getElementById('irctc-ext-pause')?.addEventListener('click', () => IRCTCExt.Overlay.togglePause());
    document.getElementById('irctc-ext-stop')?.addEventListener('click', () => IRCTCExt.Overlay.stop());
    document.getElementById('irctc-ext-continue')?.addEventListener('click', () => {
      document.getElementById('irctc-ext-pause-panel').style.display = 'none';
      if (typeof IRCTCExt.Overlay.onContinue === 'function') IRCTCExt.Overlay.onContinue();
    });
    this._bound = true;
  },

  setMinimized(minimized) {
    if (!this.el) return;
    this.el.classList.toggle('irctc-ext-overlay--minimized', minimized);
    const btn = document.getElementById('irctc-ext-minimize');
    if (btn) {
      btn.textContent = minimized ? '+' : '−';
      btn.title = minimized ? 'Expand' : 'Minimize';
      btn.setAttribute('aria-label', minimized ? 'Expand overlay' : 'Minimize overlay');
    }
  },

  toggleMinimize() {
    this.setMinimized(!this.el?.classList.contains('irctc-ext-overlay--minimized'));
  },

  async show() {
    await IRCTCExt.Overlay.init();
    if (IRCTCExt.Overlay.el) {
      IRCTCExt.Overlay.el.classList.remove('irctc-ext-overlay--hidden');
    }
    if (window.innerWidth <= 600) {
      IRCTCExt.Overlay.setMinimized(true);
    }
    const config = await IRCTCExt.Storage.get().catch(() => null);
    if (config) IRCTCExt.Overlay.updatePauseButton(config.state?.paused);
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

  updatePauseButton(paused) {
    const btn = document.getElementById('irctc-ext-pause');
    if (btn) btn.textContent = paused ? 'Resume' : 'Pause';
  },

  async togglePause() {
    const config = await IRCTCExt.Storage.get();
    if (!config.state.running) {
      this.setStatus('Not running');
      return;
    }

    const paused = !config.state.paused;
    await IRCTCExt.Storage.updateState({ paused });
    this.updatePauseButton(paused);
    this.setStatus(paused ? 'Paused' : 'Resumed');
    this.setStep(paused ? 'Paused' : config.state.currentStep || 'Running');

    if (!paused && window.IRCTCExt?.Bot) {
      await IRCTCExt.Bot.resumeIfNeeded();
    }
  },

  async restart() {
    if (!window.IRCTCExt?.Bot) return;
    try {
      this.setError('');
      this.setStatus('Refreshing page to restart...');
      await IRCTCExt.Bot.restart();
    } catch (err) {
      console.error('[IRCTC-Bot] Restart failed:', err);
      this.setError(err.message || String(err));
      this.setStatus('Restart failed');
      this.setStep('Error');
    }
  },

  async stop() {
    this.setStatus('Stopping...');
    this.setStep('Stopped');
    this.stopTimer();

    if (window.IRCTCExt?.Bot?.stop) {
      await IRCTCExt.Bot.stop();
      return;
    }

    await IRCTCExt.Storage.updateState({ running: false, paused: false, status: 'stopped', currentStep: 'init' });
    this.setStatus('Stopped');
    if (typeof this.onStop === 'function') this.onStop();
    location.reload();
  }
};
