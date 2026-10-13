window.IRCTCExt = window.IRCTCExt || {};

IRCTCExt.Wait = {
  async delay(ms) {
    const step = 200;
    let elapsed = 0;

    while (elapsed < ms) {
      const control = await IRCTCExt.Bot?.checkControlState?.();
      if (control === 'stopped') {
        const err = new Error('Booking stopped');
        err.code = 'BOOKING_STOPPED';
        throw err;
      }
      if (control === 'paused') {
        await IRCTCExt.Bot.waitUntilResumedOrStopped();
        if (!(await IRCTCExt.Bot?.isRunning?.())) {
          const err = new Error('Booking stopped');
          err.code = 'BOOKING_STOPPED';
          throw err;
        }
      }

      const slice = Math.min(step, ms - elapsed);
      await new Promise((resolve) => setTimeout(resolve, slice));
      elapsed += slice;
    }
  },

  queryOne(selectors, root = document, { visible = false } = {}) {
    if (visible) return IRCTCExt.Wait.queryVisibleOne(selectors, root);
    const list = Array.isArray(selectors) ? selectors : [selectors];
    for (const selector of list) {
      const el = root.querySelector(selector);
      if (el) return el;
    }
    return null;
  },

  queryVisibleOne(selectors, root = document) {
    const list = Array.isArray(selectors) ? selectors : [selectors];
    for (const selector of list) {
      const nodes = root.querySelectorAll(selector);
      for (const node of nodes) {
        if (IRCTCExt.Wait.isVisible(node)) return node;
      }
    }
    return null;
  },

  queryAll(selectors, root = document, { visible = false } = {}) {
    const list = Array.isArray(selectors) ? selectors : [selectors];
    for (const selector of list) {
      const nodes = root.querySelectorAll(selector);
      if (nodes.length) {
        const arr = Array.from(nodes);
        if (visible) {
          const vis = arr.filter((n) => IRCTCExt.Wait.isVisible(n));
          if (vis.length) return vis;
        } else {
          return arr;
        }
      }
    }
    return [];
  },

  async waitFor(selectors, { timeout = 15000, root = document, visible = false } = {}) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const el = visible
        ? IRCTCExt.Wait.queryVisibleOne(selectors, root)
        : IRCTCExt.Wait.queryOne(selectors, root);
      if (el) return el;
      await IRCTCExt.Wait.delay(100);
    }
    return null;
  },

  isVisible(el) {
    if (!el) return false;
    if (el.closest?.('.login-panel--inactive, [inert], .login-panel[aria-hidden="true"]')) {
      return false;
    }
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) {
      return false;
    }
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  },

  watchPath(callback) {
    let last = location.pathname;
    const check = () => {
      if (location.pathname !== last) {
        const prev = last;
        last = location.pathname;
        callback(last, prev);
      }
    };
    window.addEventListener('popstate', check);
    const interval = setInterval(check, 300);
    return () => {
      window.removeEventListener('popstate', check);
      clearInterval(interval);
    };
  },

  async poll(fn, { interval = 100, timeout = 15000 } = {}) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const control = await IRCTCExt.Bot?.checkControlState?.();
      if (control === 'stopped') {
        const err = new Error('Booking stopped');
        err.code = 'BOOKING_STOPPED';
        throw err;
      }
      if (control === 'paused') {
        await IRCTCExt.Bot.waitUntilResumedOrStopped();
        if (!(await IRCTCExt.Bot?.isRunning?.())) {
          const err = new Error('Booking stopped');
          err.code = 'BOOKING_STOPPED';
          throw err;
        }
      }

      const result = await fn();
      if (result) return result;
      await IRCTCExt.Wait.delay(interval);
    }
    return null;
  },

  installIrctcNoiseFilter() {
    if (IRCTCExt.Wait._noiseFilterInstalled) return;
    IRCTCExt.Wait._noiseFilterInstalled = true;

    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      const message = reason?.message || reason?.name || String(reason || '');
      if (/pointer\s*lock|requestpointerlock|wrongdocumenterror/i.test(message)) {
        event.preventDefault();
      }
    });
  }
};

IRCTCExt.Wait.installIrctcNoiseFilter();
