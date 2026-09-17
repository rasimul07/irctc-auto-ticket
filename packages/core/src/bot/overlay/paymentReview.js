window.IRCTCExt = window.IRCTCExt || {};

IRCTCExt.PaymentReviewOverlay = {
  el: null,
  contentEl: null,
  _refreshTimer: null,
  _observer: null,
  _unwatchPath: null,
  _initialized: false,

  isPaymentPage() {
    return location.pathname.includes('bkgPaymentOptions');
  },

  async ensureBody() {
    if (document.body) return;
    await IRCTCExt.Wait.poll(() => document.body, { timeout: 10000, interval: 50 });
  },

  async init() {
    if (this._initialized) return this;
    this._initialized = true;

    await this.ensureBody();
    if (!document.body) return this;

    if (document.getElementById('irctc-ext-payment-review')) {
      this.el = document.getElementById('irctc-ext-payment-review');
      this.contentEl = this.el.querySelector('.irctc-ext-payment-review__content');
      this.bindEvents();
      return this;
    }

    const root = document.createElement('div');
    root.id = 'irctc-ext-payment-review';
    root.className = 'irctc-ext-payment-review irctc-ext-payment-review--hidden';
    root.innerHTML = `
      <div class="irctc-ext-payment-review__header">
        <span>Booking Review</span>
        <button type="button" class="irctc-ext-payment-review__icon-btn" id="irctc-ext-payment-review-minimize" title="Minimize" aria-label="Minimize booking review">−</button>
      </div>
      <div class="irctc-ext-payment-review__content"></div>
    `;
    document.body.appendChild(root);
    this.el = root;
    this.contentEl = root.querySelector('.irctc-ext-payment-review__content');
    this.bindEvents();

    return this;
  },

  bindEvents() {
    const btn = document.getElementById('irctc-ext-payment-review-minimize');
    if (!btn || btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', () => this.toggleMinimize());
  },

  toggleMinimize() {
    if (!this.el) return;
    const minimized = this.el.classList.toggle('irctc-ext-payment-review--minimized');
    const btn = document.getElementById('irctc-ext-payment-review-minimize');
    if (btn) {
      btn.textContent = minimized ? '+' : '−';
      btn.title = minimized ? 'Expand' : 'Minimize';
      btn.setAttribute('aria-label', minimized ? 'Expand booking review' : 'Minimize booking review');
    }
  },

  sanitizeClone(clone) {
    const sel = IRCTCExt.SELECTORS.payment;
    for (const selector of sel.excludeFromClone) {
      clone.querySelectorAll(selector).forEach((el) => el.remove());
    }
    clone.querySelectorAll('[role="button"]').forEach((el) => el.remove());
    clone.querySelectorAll('button, a.cancellation-link').forEach((el) => el.remove());
  },

  async cloneReviewBlock() {
    const sel = IRCTCExt.SELECTORS.payment;
    const block = await IRCTCExt.Wait.waitFor(sel.bookingReviewBlock, {
      timeout: 15000,
      visible: true
    });
    if (!block || !this.contentEl) return false;

    const clone = block.cloneNode(true);
    this.sanitizeClone(clone);
    this.contentEl.innerHTML = '';
    this.contentEl.appendChild(clone);
    return true;
  },

  scheduleRefresh() {
    if (!this.isPaymentPage()) return;
    if (this._refreshTimer) return;
    this._refreshTimer = setTimeout(async () => {
      this._refreshTimer = null;
      if (!this.isPaymentPage() || this.el?.classList.contains('irctc-ext-payment-review--hidden')) return;
      await this.cloneReviewBlock();
    }, 300);
  },

  async refresh() {
    if (!this.isPaymentPage()) return false;
    return this.cloneReviewBlock();
  },

  async show() {
    await this.init();
    if (!this.el) return this;

    const cloned = await this.cloneReviewBlock();
    if (cloned) {
      this.el.classList.remove('irctc-ext-payment-review--hidden');
    }
    return this;
  },

  hide() {
    if (this.el) this.el.classList.add('irctc-ext-payment-review--hidden');
    if (this.contentEl) this.contentEl.innerHTML = '';
  },

  syncWithPage() {
    if (this.isPaymentPage()) {
      this.show().catch((err) => console.warn('[IRCTC-Bot] Payment review overlay:', err));
    } else {
      this.hide();
    }
  },

  watch() {
    this.syncWithPage();

    this._unwatchPath = IRCTCExt.Wait.watchPath(() => {
      this.syncWithPage();
    });

    if (this._observer) return;

    this._observer = new MutationObserver(() => {
      this.scheduleRefresh();
    });

    const startObserver = () => {
      if (!document.body) return;
      this._observer.observe(document.body, { childList: true, subtree: true });
    };

    if (document.body) {
      startObserver();
    } else {
      document.addEventListener('DOMContentLoaded', startObserver, { once: true });
    }
  }
};
