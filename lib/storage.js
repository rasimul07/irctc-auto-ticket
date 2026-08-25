(function (root) {
  root.IRCTCExt = root.IRCTCExt || {};

  IRCTCExt.DEFAULT_CONFIG = {
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
  passengers: [
    { name: '', age: '', gender: 'M', berth: 'No Preference', food: 'No Food' }
  ],
  schedule: { enabled: false, type: 'non-ac' },
  preferences: {
    loyaltyChoice: 'skip',
    paymentMethod: 'cards',
    cardsProvider: 'PhonePe',
    upiProvider: 'IRCTC iPay',
    debitCard: { name: '', number: '', expiry: '', cvv: '' },
    creditCard: { name: '', number: '', expiry: '', cvv: '' },
    autoPayEnabled: false,
    autoPayType: 'debit'
  },
  access: {
    deviceId: '',
    email: '',
    apiBase: '',
    status: null
  },
  state: {
    status: 'idle',
    lastRun: null,
    currentStep: 'init',
    running: false,
    paused: false,
    message: '',
    passengersDone: false,
    paymentDone: false,
    autoRestartCount: 0,
    paymentPhase: null,
    paymentGateway: null,
    awaitingGateway: false
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
    if (partial.preferences) next.preferences = { ...current.preferences, ...partial.preferences };
    if (partial.access) next.access = { ...current.access, ...partial.access };
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

  if (typeof root.document !== 'undefined') {
    root.IRCTCStorage = IRCTCExt.Storage;
    root.IRCTC_DEFAULT_CONFIG = IRCTCExt.DEFAULT_CONFIG;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
