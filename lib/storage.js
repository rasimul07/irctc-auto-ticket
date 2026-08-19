window.IRCTCExt = window.IRCTCExt || {};

IRCTCExt.DEFAULT_CONFIG = {
  credentials: { username: '', password: '' },
  journey: {
    from: '',
    fromCode: '',
    to: '',
    toCode: '',
    date: '',
    trainNo: '',
    travelClass: 'SL',
    quota: 'TATKAL'
  },
  passengers: [
    { name: '', age: '', gender: 'M', berth: 'No Preference', food: 'No Food' }
  ],
  schedule: { enabled: false, type: 'non-ac' },
  state: {
    status: 'idle',
    lastRun: null,
    currentStep: 'init',
    running: false,
    paused: false,
    message: ''
  }
};

IRCTCExt.Storage = {
  async get() {
    const data = await chrome.storage.local.get('irctcConfig');
    return { ...JSON.parse(JSON.stringify(IRCTCExt.DEFAULT_CONFIG)), ...(data.irctcConfig || {}) };
  },

  async set(config) {
    await chrome.storage.local.set({ irctcConfig: config });
  },

  async update(partial) {
    const current = await IRCTCExt.Storage.get();
    const next = { ...current, ...partial };
    if (partial.journey) next.journey = { ...current.journey, ...partial.journey };
    if (partial.credentials) next.credentials = { ...current.credentials, ...partial.credentials };
    if (partial.schedule) next.schedule = { ...current.schedule, ...partial.schedule };
    if (partial.state) next.state = { ...current.state, ...partial.state };
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
    await chrome.storage.local.remove('irctcConfig');
  }
};

// Popup-compatible global for scripts that don't use IRCTCExt namespace
if (typeof window !== 'undefined') {
  window.IRCTCStorage = IRCTCExt.Storage;
  window.IRCTC_DEFAULT_CONFIG = IRCTCExt.DEFAULT_CONFIG;
}
