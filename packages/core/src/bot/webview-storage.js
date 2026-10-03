(function (root) {
  root.IRCTCExt = root.IRCTCExt || {};

  const STORAGE_KEY = 'irctcConfig';

  const DEFAULT_CONFIG = {
    credentials: { username: '', password: '' },
    journey: {
      from: '',
      fromCode: '',
      to: '',
      toCode: '',
      date: '',
      trainNo: '',
      trainName: '',
      travelClass: 'SL',
      quota: 'TATKAL'
    },
    passengers: [{ name: '', age: '', gender: '', berth: 'No Preference', food: '' }],
    schedule: { enabled: false, type: 'non-ac' },
    preferences: {
      bookingSite: 'eticket',
      loyaltyChoice: 'skip',
      paymentMethod: 'cards',
      cardsProvider: 'PhonePe',
      upiProvider: 'IRCTC iPay',
      debitCard: { name: '', number: '', expiry: '', cvv: '' },
      creditCard: { name: '', number: '', expiry: '', cvv: '' },
      autoPayEnabled: false,
      autoPayType: 'debit'
    },
    access: { deviceId: '', email: '', apiBase: '', status: null },
    state: {
      status: 'idle',
      lastRun: null,
      currentStep: 'init',
      running: false,
      paused: false,
      message: '',
      passengersDone: false,
      psgnPaymentContinueClicked: false,
      paymentDone: false,
      autoRestartCount: 0,
      paymentPhase: null,
      paymentGateway: null,
      awaitingGateway: false,
      bookingSessionId: null,
      tokenConsumed: false
    }
  };

  let cachedConfig = null;

  function mergeConfig(current, partial) {
    const next = { ...current, ...partial };
    if (partial.journey) next.journey = { ...current.journey, ...partial.journey };
    if (partial.credentials) next.credentials = { ...current.credentials, ...partial.credentials };
    if (partial.schedule) next.schedule = { ...current.schedule, ...partial.schedule };
    if (partial.preferences) next.preferences = { ...current.preferences, ...partial.preferences };
    if (partial.access) next.access = { ...current.access, ...partial.access };
    if (partial.state) next.state = { ...current.state, ...partial.state };
    if (partial.passengers) next.passengers = partial.passengers;
    return next;
  }

  function postToHost(msg) {
    const payload = { source: 'irctc-bot', ...msg };
    const json = JSON.stringify(payload);
    if (window.IrctcBotBridge?.postMessage) {
      window.IrctcBotBridge.postMessage(json);
      return;
    }
    if (window.webkit?.messageHandlers?.IrctcBotBridge) {
      window.webkit.messageHandlers.IrctcBotBridge.postMessage(json);
      return;
    }
    if (window.parent !== window) {
      window.parent.postMessage(payload, '*');
    }
  }

  function requestConfig() {
    return new Promise((resolve) => {
      const handler = (event) => {
        if (event.data?.source === 'irctc-host' && event.data.type === 'CONFIG_DATA') {
          window.removeEventListener('message', handler);
          resolve(event.data.config || null);
        }
      };
      window.addEventListener('message', handler);
      postToHost({ type: 'GET_CONFIG' });
      setTimeout(() => {
        window.removeEventListener('message', handler);
        resolve(cachedConfig);
      }, 3000);
    });
  }

  IRCTCExt.Storage = {
    _cachedConfig: null,

    async get() {
      if (cachedConfig) {
        IRCTCExt.Storage._cachedConfig = cachedConfig;
        return { ...JSON.parse(JSON.stringify(DEFAULT_CONFIG)), ...cachedConfig };
      }
      const remote = await requestConfig();
      if (remote) {
        cachedConfig = remote;
        IRCTCExt.Storage._cachedConfig = remote;
        return { ...JSON.parse(JSON.stringify(DEFAULT_CONFIG)), ...remote };
      }
      return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    },

    async set(config) {
      cachedConfig = config;
      IRCTCExt.Storage._cachedConfig = config;
      postToHost({ type: 'SET_CONFIG', config });
    },

    async update(partial) {
      const current = await IRCTCExt.Storage.get();
      const next = mergeConfig(current, partial);
      await IRCTCExt.Storage.set(next);
      return next;
    },

    async updateState(updates) {
      const current = await IRCTCExt.Storage.get();
      current.state = { ...current.state, ...updates };
      await IRCTCExt.Storage.set(current);
      return current;
    },

    async clear() {
      cachedConfig = null;
      IRCTCExt.Storage._cachedConfig = null;
    },

    setCachedConfig(config) {
      cachedConfig = config;
      IRCTCExt.Storage._cachedConfig = config;
    }
  };

  IRCTCExt.PlatformBridge = {
    async sendMessage(type, payload = {}) {
      return new Promise((resolve) => {
        const requestId = crypto.randomUUID();
        const handler = (event) => {
          const data = event.data;
          if (data?.source === 'irctc-host' && data.type === 'RESPONSE' && data.requestId === requestId) {
            window.removeEventListener('message', handler);
            resolve(data);
          }
        };
        window.addEventListener('message', handler);
        postToHost({ type, requestId, ...payload });
        setTimeout(() => {
          window.removeEventListener('message', handler);
          resolve(null);
        }, 15000);
      });
    },

    onMessage(handler) {
      window.addEventListener('message', (event) => {
        const data = event.data;
        if (!data || data.source !== 'irctc-host') return;
        if (data.type === 'CONFIG_DATA') {
          IRCTCExt.Storage.setCachedConfig(data.config);
          return;
        }
        handler(data, (response) => {
          postToHost({
            type: 'RESPONSE',
            requestType: data.type,
            requestId: data.requestId,
            ...response
          });
        });
      });
    }
  };

  IRCTCExt.PlatformBridge.onMessage(() => {});
})(typeof globalThis !== 'undefined' ? globalThis : window);
