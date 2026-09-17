import { cloneDefaultConfig, DEFAULT_CONFIG, mergeConfig } from './schema.js';

export const CONFIG_VERSION = 2;

function newSetId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `set-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptySet(name = 'Set 1') {
  const defaults = cloneDefaultConfig();
  return {
    id: newSetId(),
    name,
    credentials: defaults.credentials,
    journey: defaults.journey,
    passengers: defaults.passengers,
    preferences: defaults.preferences,
    schedule: defaults.schedule
  };
}

export function createFreshStore() {
  const set = createEmptySet('Set 1');
  const defaults = cloneDefaultConfig();
  return {
    version: CONFIG_VERSION,
    activeSetId: set.id,
    sets: [set],
    access: defaults.access,
    state: defaults.state
  };
}

export function isV2Store(raw) {
  return raw?.version === CONFIG_VERSION && Array.isArray(raw?.sets) && raw.sets.length > 0;
}

export function migrateToV2(raw) {
  if (!raw || typeof raw !== 'object') {
    return createFreshStore();
  }
  if (isV2Store(raw)) {
    return normalizeStore(raw);
  }

  const defaults = cloneDefaultConfig();
  const set = createEmptySet('Set 1');
  set.credentials = { ...defaults.credentials, ...(raw.credentials || {}) };
  set.journey = { ...defaults.journey, ...(raw.journey || {}) };
  set.passengers = raw.passengers?.length ? raw.passengers : defaults.passengers;
  set.preferences = { ...defaults.preferences, ...(raw.preferences || {}) };
  set.schedule = { ...defaults.schedule, ...(raw.schedule || {}) };

  return {
    version: CONFIG_VERSION,
    activeSetId: set.id,
    sets: [set],
    access: { ...defaults.access, ...(raw.access || {}) },
    state: { ...defaults.state, ...(raw.state || {}) }
  };
}

export function normalizeStore(store) {
  const next = {
    version: CONFIG_VERSION,
    activeSetId: store.activeSetId,
    sets: (store.sets || []).map((set) => ({
      ...createEmptySet(set.name || 'Set'),
      ...set,
      credentials: { ...DEFAULT_CONFIG.credentials, ...(set.credentials || {}) },
      journey: { ...DEFAULT_CONFIG.journey, ...(set.journey || {}) },
      passengers: set.passengers?.length ? set.passengers : DEFAULT_CONFIG.passengers,
      preferences: { ...DEFAULT_CONFIG.preferences, ...(set.preferences || {}) },
      schedule: { ...DEFAULT_CONFIG.schedule, ...(set.schedule || {}) }
    })),
    access: { ...DEFAULT_CONFIG.access, ...(store.access || {}) },
    state: { ...DEFAULT_CONFIG.state, ...(store.state || {}) }
  };

  if (!next.sets.length) {
    const set = createEmptySet('Set 1');
    next.sets = [set];
    next.activeSetId = set.id;
  }

  if (!next.sets.some((set) => set.id === next.activeSetId)) {
    next.activeSetId = next.sets[0].id;
  }

  return next;
}

export function getActiveSet(store) {
  const normalized = normalizeStore(store);
  return normalized.sets.find((set) => set.id === normalized.activeSetId) || normalized.sets[0];
}

export function resolveActiveConfig(store) {
  const normalized = normalizeStore(store);
  const active = getActiveSet(normalized);
  return {
    credentials: active.credentials,
    journey: active.journey,
    passengers: active.passengers,
    preferences: active.preferences,
    schedule: active.schedule,
    access: normalized.access,
    state: normalized.state,
    activeSetId: normalized.activeSetId,
    activeSetName: active.name
  };
}

export function persistActiveSet(store, flatConfig) {
  const normalized = normalizeStore(store);
  const activeIndex = normalized.sets.findIndex((set) => set.id === normalized.activeSetId);
  const index = activeIndex >= 0 ? activeIndex : 0;
  const current = normalized.sets[index];
  const merged = mergeConfig(resolveActiveConfig(normalized), flatConfig);

  normalized.sets[index] = {
    ...current,
    credentials: merged.credentials,
    journey: merged.journey,
    passengers: merged.passengers,
    preferences: merged.preferences,
    schedule: merged.schedule
  };

  if (flatConfig.access) {
    normalized.access = { ...normalized.access, ...flatConfig.access };
  }
  if (flatConfig.state) {
    normalized.state = { ...normalized.state, ...flatConfig.state };
  }

  return normalized;
}

export function listSets(store) {
  return normalizeStore(store).sets.map((set) => ({ id: set.id, name: set.name }));
}

export function nextSetName(store) {
  const count = normalizeStore(store).sets.length;
  return `Set ${count + 1}`;
}

export function setActiveSet(store, id) {
  const normalized = normalizeStore(store);
  if (!normalized.sets.some((set) => set.id === id)) {
    throw new Error('Booking set not found.');
  }
  normalized.activeSetId = id;
  return normalized;
}

export function createSet(store, name) {
  const normalized = normalizeStore(store);
  const set = createEmptySet(name || nextSetName(normalized));
  normalized.sets.push(set);
  normalized.activeSetId = set.id;
  return normalized;
}

export function duplicateSet(store, id) {
  const normalized = normalizeStore(store);
  const source = normalized.sets.find((set) => set.id === id);
  if (!source) throw new Error('Booking set not found.');

  const copy = {
    ...JSON.parse(JSON.stringify(source)),
    id: newSetId(),
    name: `${source.name} copy`
  };
  normalized.sets.push(copy);
  normalized.activeSetId = copy.id;
  return normalized;
}

export function renameSet(store, id, name) {
  const normalized = normalizeStore(store);
  const trimmed = String(name || '').trim();
  if (!trimmed) throw new Error('Set name cannot be empty.');

  const set = normalized.sets.find((item) => item.id === id);
  if (!set) throw new Error('Booking set not found.');
  set.name = trimmed;
  return normalized;
}

export function deleteSet(store, id) {
  const normalized = normalizeStore(store);
  if (normalized.sets.length <= 1) {
    throw new Error('Cannot delete the only booking set.');
  }

  normalized.sets = normalized.sets.filter((set) => set.id !== id);
  if (normalized.activeSetId === id) {
    normalized.activeSetId = normalized.sets[0].id;
  }
  return normalized;
}
