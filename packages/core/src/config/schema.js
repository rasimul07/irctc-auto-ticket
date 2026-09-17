export const DEFAULT_CONFIG = {
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
    awaitingGateway: false,
    bookingSessionId: null,
    tokenConsumed: false
  }
};

export const CONFIG_VERSION = 2;
export const STORAGE_KEY = 'irctcConfig';

export {
  createEmptySet,
  createFreshStore,
  migrateToV2,
  normalizeStore,
  resolveActiveConfig,
  persistActiveSet,
  listSets,
  setActiveSet,
  createSet,
  duplicateSet,
  renameSet,
  deleteSet,
  getActiveSet,
  nextSetName
} from './sets.js';

export function cloneDefaultConfig() {
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}

export function mergeConfig(current, partial) {
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
