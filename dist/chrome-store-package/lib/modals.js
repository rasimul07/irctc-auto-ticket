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

  dismissTour(root = document) {
    if (!root) return 0;
    let dismissed = 0;

    const skipBtn = root.querySelector(
      '.home-tour-actions .home-tour-skip, button.home-tour-skip, .home-tour-skip'
    );
    if (skipBtn && !skipBtn.dataset?.tourDismissed) {
      skipBtn.dataset.tourDismissed = '1';
      try {
        if (IRCTCExt.Events?.click) {
          IRCTCExt.Events.click(skipBtn);
        } else {
          skipBtn.click();
        }
      } catch (_) {
        skipBtn.click?.();
      }
      dismissed += 1;
    }

    if (!dismissed) {
      const actionContainers = root.querySelectorAll('.home-tour-actions, .home-tour');
      for (const container of actionContainers) {
        const buttons = container.querySelectorAll('button');
        for (const btn of buttons) {
          if (/skip\s*tour/i.test(btn.textContent || '') && !btn.dataset?.tourDismissed) {
            btn.dataset.tourDismissed = '1';
            try {
              if (IRCTCExt.Events?.click) {
                IRCTCExt.Events.click(btn);
              } else {
                btn.click();
              }
            } catch (_) {
              btn.click?.();
            }
            dismissed += 1;
            break;
          }
        }
        if (dismissed) break;
      }
    }

    // Forcefully hide tour elements and backdrop so they never block form controls
    const tourElements = root.querySelectorAll(
      '.home-tour-actions, .home-tour, .home-tour-overlay, app-home-tour'
    );
    for (const el of tourElements) {
      if (this.forceHide(el)) dismissed += 1;
    }

    return dismissed;
  },

  dismissInterruptModals(root = document) {
    let dismissed = 0;
    dismissed += this.dismissTour(root);
    dismissed += this.dismissSessionRestore(root);
    dismissed += this.dismissBookNowConfirmation(root);
    return dismissed;
  },

  detectWafOrServerError(root = document) {
    if (!root) return null;

    // 1. Direct page content (e.g. Akamai HTML error page replacement)
    const bodyText = (root.body ? root.body.textContent : root.textContent) || '';
    if (/unable\s*to\s*process\s*request/i.test(bodyText)) {
      const refMatch = bodyText.match(/\b(0\.[0-9a-fA-F]{6,12}\.\d{8,12}\.[0-9a-fA-F]{4,12})\b/);
      const ipMatch = bodyText.match(/Client\s*IP:\s*([0-9a-fA-F:.]+)/i);
      return {
        type: 'akamai_waf',
        reference: refMatch ? refMatch[1] : null,
        clientIp: ipMatch ? ipMatch[1].trim() : null,
        message: 'Unable to Process Request !! (Akamai WAF blocked request)'
      };
    }

    // 2. IRCTC modal/toast dialogs (PrimeNG / UI dialogs)
    const candidates = root.querySelectorAll?.(
      '.ui-dialog, .p-dialog, [role="dialog"], .ui-toast-message, .p-toast-message, .alert-danger, .toast'
    ) || [];
    for (const dialog of candidates) {
      if (!IRCTCExt.Wait?.isVisible?.(dialog)) continue;
      const text = (dialog.textContent || '').replace(/\s+/g, ' ');
      if (/unable\s*to\s*process\s*request/i.test(text)) {
        const refMatch = text.match(/\b(0\.[0-9a-fA-F]{6,12}\.\d{8,12}\.[0-9a-fA-F]{4,12})\b/);
        const ipMatch = text.match(/Client\s*IP:\s*([0-9a-fA-F:.]+)/i);
        return {
          type: 'akamai_waf',
          reference: refMatch ? refMatch[1] : null,
          clientIp: ipMatch ? ipMatch[1].trim() : null,
          message: 'Unable to Process Request !! (Akamai WAF blocked request)'
        };
      }
    }

    return null;
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
