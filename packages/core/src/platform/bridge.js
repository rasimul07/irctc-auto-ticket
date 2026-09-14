/**
 * Platform message bridge for bot ↔ host (Chrome extension background or Ionic WebView).
 */
export function createPlatformBridge() {
  const handlers = new Set();

  const bridge = {
    async sendMessage(type, payload = {}) {
      throw new Error(`PlatformBridge.sendMessage not implemented for type: ${type}`);
    },

    onMessage(handler) {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },

    _dispatch(msg, sendResponse) {
      for (const handler of handlers) {
        const result = handler(msg, sendResponse);
        if (result === true) return true;
      }
      return false;
    }
  };

  return bridge;
}

export function createChromeBridge() {
  const bridge = createPlatformBridge();

  bridge.sendMessage = async (type, payload = {}) => {
    return chrome.runtime.sendMessage({ type, ...payload }).catch(() => null);
  };

  bridge.install = () => {
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      return bridge._dispatch(msg, sendResponse);
    });
  };

  return bridge;
}

export function createWebViewBridge() {
  const bridge = createPlatformBridge();
  let hostHandler = null;

  bridge.setHostHandler = (handler) => {
    hostHandler = handler;
  };

  bridge.sendMessage = async (type, payload = {}) => {
    const message = { type, ...payload };
    if (hostHandler) {
      return hostHandler(message);
    }
    if (typeof window !== 'undefined' && window.parent !== window) {
      window.parent.postMessage({ source: 'irctc-bot', ...message }, '*');
    }
    return null;
  };

  bridge.install = () => {
    if (typeof window === 'undefined') return;
    window.addEventListener('message', (event) => {
      const data = event.data;
      if (!data || data.source !== 'irctc-host') return;
      bridge._dispatch(data, (response) => {
        window.parent.postMessage({ source: 'irctc-bot', type: 'RESPONSE', requestType: data.type, ...response }, '*');
      });
    });
  };

  return bridge;
}
