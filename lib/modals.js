window.IRCTCExt = window.IRCTCExt || {};

IRCTCExt.Modals = {
  _pollTimer: null,
  _scanTimer: null,
  _initialized: false,

  forceHide(el) {
    if (!el) return false;
    el.style.setProperty('display', 'none', 'important');
    el.style.setProperty('visibility', 'hidden', 'important');
    el.style.setProperty('pointer-events', 'none', 'important');
    el.setAttribute('aria-hidden', 'true');
    return true;
  },

  isSessionRestoreRoot(el) {
    if (!el || el.nodeType !== 1) return false;

    const sel = IRCTCExt.SELECTORS?.modals;
    const titleSelectors = sel?.sessionRestoreTitle || ['.bc-title'];

    for (const selector of titleSelectors) {
      const titles = el.querySelectorAll(selector);
      for (const title of titles) {
        if (!IRCTCExt.Wait?.isVisible(title)) continue;
        if (/session\s*restore/i.test(title.textContent || '')) return true;
      }
    }

    return false;
  },

  collectSessionRestoreRoots(root = document) {
    const roots = new Set();
    const sel = IRCTCExt.SELECTORS?.modals;

    const overlaySelectors = sel?.sessionRestoreOverlay || ['.bc-overlay'];
    for (const selector of overlaySelectors) {
      root.querySelectorAll(selector).forEach((el) => {
        if (this.isSessionRestoreRoot(el)) roots.add(el);
      });
    }

    const hostSelectors = sel?.sessionRestoreHost || ['app-book-now-confirmation'];
    for (const selector of hostSelectors) {
      root.querySelectorAll(selector).forEach((el) => {
        if (this.isSessionRestoreRoot(el)) roots.add(el);
      });
    }

    return Array.from(roots);
  },

  dismissSessionRestore(root = document) {
    const sel = IRCTCExt.SELECTORS?.modals;
    let dismissed = 0;

    for (const sessionRoot of this.collectSessionRestoreRoots(root)) {
      const cardSelectors = sel?.sessionRestoreCard || ['.bc-card'];
      for (const selector of cardSelectors) {
        sessionRoot.querySelectorAll(selector).forEach((card) => {
          if (this.forceHide(card)) dismissed += 1;
        });
      }

      if (sessionRoot.matches?.('.bc-overlay, .bc-card')) {
        if (this.forceHide(sessionRoot)) dismissed += 1;
      }

      const host = sessionRoot.closest('app-book-now-confirmation');
      if (host && this.forceHide(host)) dismissed += 1;

      if (this.forceHide(sessionRoot)) dismissed += 1;
    }

    return dismissed;
  },

  collectBookNowHosts(root = document) {
    const hosts = new Set();
    if (root.nodeType === 1) {
      if (root.matches?.('app-book-now-confirmation')) hosts.add(root);
      root.querySelectorAll('app-book-now-confirmation').forEach((el) => hosts.add(el));
    }
    return Array.from(hosts);
  },

  isReviewPaymentConfirmation(host) {
    if (!host || !IRCTCExt.Wait?.isVisible(host)) return false;
    if (this.isSessionRestoreRoot(host)) return false;

    if (location.pathname.includes('reviewBooking')) return true;

    const sel = IRCTCExt.SELECTORS?.psgnPreferences;
    if (sel?.availabilityStatus) {
      const status = IRCTCExt.Wait.queryOne(sel.availabilityStatus, host);
      if (status && IRCTCExt.Wait.isVisible(status)) return true;
    }

    const text = (host.textContent || '').replace(/\s+/g, ' ').trim();
    if (/booking\s*review|continue\s*to\s*payment/i.test(text)) return true;
    if (/available-\d+/i.test(text)) return true;

    return false;
  },

  hideBookNowConfirmation(host) {
    return this.forceHide(host);
  },

  dismissBookNowConfirmation(root = document) {
    const hosts = this.collectBookNowHosts(root);
    let dismissed = 0;

    for (const host of hosts) {
      if (this.isReviewPaymentConfirmation(host)) continue;
      if (this.hideBookNowConfirmation(host)) dismissed += 1;
    }

    return dismissed;
  },

  dismissInterruptModals(root = document) {
    let dismissed = 0;
    dismissed += this.dismissSessionRestore(root);
    dismissed += this.dismissBookNowConfirmation(root);
    return dismissed;
  },

  scheduleScan() {
    if (this._scanTimer) return;
    this._scanTimer = setTimeout(() => {
      this._scanTimer = null;
      this.dismissInterruptModals();
    }, 50);
  },

  init() {
    if (this._initialized) return;
    this._initialized = true;

    this.dismissInterruptModals();

    const observer = new MutationObserver(() => {
      this.scheduleScan();
    });

    const startObserver = () => {
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true
      });
    };

    if (document.documentElement) {
      startObserver();
    } else {
      document.addEventListener('DOMContentLoaded', startObserver, { once: true });
    }

    this._pollTimer = setInterval(() => this.dismissInterruptModals(), 400);

    document.addEventListener('DOMContentLoaded', () => this.dismissInterruptModals(), { once: true });
    window.addEventListener('load', () => this.dismissInterruptModals(), { once: true });
  }
};

IRCTCExt.Modals.init();
