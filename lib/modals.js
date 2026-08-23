window.IRCTCExt = window.IRCTCExt || {};

IRCTCExt.Modals = {
  _pollTimer: null,
  _scanTimer: null,
  _initialized: false,

  collectBookNowHosts(root = document) {
    const hosts = new Set();
    if (root.nodeType === 1) {
      if (root.matches?.('app-book-now-confirmation')) hosts.add(root);
      root.querySelectorAll('app-book-now-confirmation').forEach((el) => hosts.add(el));
    }
    return Array.from(hosts);
  },

  hideBookNowConfirmation(host) {
    if (!host) return false;
    host.style.setProperty('display', 'none', 'important');
    return true;
  },

  dismissBookNowConfirmation(root = document) {
    const hosts = this.collectBookNowHosts(root);
    let dismissed = 0;

    for (const host of hosts) {
      if (this.hideBookNowConfirmation(host)) dismissed += 1;
    }

    return dismissed;
  },

  scheduleScan() {
    if (this._scanTimer) return;
    this._scanTimer = setTimeout(() => {
      this._scanTimer = null;
      this.dismissBookNowConfirmation();
    }, 50);
  },

  init() {
    if (this._initialized) return;
    this._initialized = true;

    this.dismissBookNowConfirmation();

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

    this._pollTimer = setInterval(() => this.dismissBookNowConfirmation(), 400);

    document.addEventListener('DOMContentLoaded', () => this.dismissBookNowConfirmation(), { once: true });
    window.addEventListener('load', () => this.dismissBookNowConfirmation(), { once: true });
  }
};

IRCTCExt.Modals.init();
