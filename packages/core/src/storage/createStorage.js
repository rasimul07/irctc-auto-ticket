import { cloneDefaultConfig, mergeConfig } from '../config/schema.js';
import {
  createFreshStore,
  migrateToV2,
  resolveActiveConfig,
  persistActiveSet,
  listSets,
  setActiveSet,
  createSet,
  duplicateSet,
  renameSet,
  deleteSet,
  normalizeStore
} from '../config/sets.js';

/**
 * @param {{ getItem: () => Promise<object|null>, setItem: (config: object) => Promise<void>, removeItem?: () => Promise<void> }} adapter
 */
export function createStorage(adapter) {
  const storage = {
    _cachedStore: null,

    async _loadStore() {
      if (storage._cachedStore) {
        return normalizeStore(storage._cachedStore);
      }
      const data = await adapter.getItem();
      const store = migrateToV2(data);
      storage._cachedStore = store;
      return store;
    },

    async _saveStore(store) {
      const normalized = normalizeStore(store);
      storage._cachedStore = normalized;
      await adapter.setItem(normalized);
      return normalized;
    },

    async getStore() {
      return storage._loadStore();
    },

    async get() {
      const store = await storage._loadStore();
      return resolveActiveConfig(store);
    },

    async set(config) {
      const store = await storage._loadStore();
      const next = persistActiveSet(store, config);
      await storage._saveStore(next);
      return resolveActiveConfig(next);
    },

    async update(partial) {
      const current = await storage.get();
      const next = mergeConfig(current, partial);
      return storage.set(next);
    },

    async updateState(updates) {
      const store = await storage._loadStore();
      store.state = { ...store.state, ...updates };
      await storage._saveStore(store);
      return resolveActiveConfig(store);
    },

    async listSets() {
      const store = await storage._loadStore();
      return listSets(store);
    },

    async switchSet(id) {
      const store = await storage._loadStore();
      const next = setActiveSet(store, id);
      await storage._saveStore(next);
      return resolveActiveConfig(next);
    },

    async addSet(name) {
      const store = await storage._loadStore();
      const next = createSet(store, name);
      await storage._saveStore(next);
      return resolveActiveConfig(next);
    },

    async duplicateSet(id) {
      const store = await storage._loadStore();
      const next = duplicateSet(store, id);
      await storage._saveStore(next);
      return resolveActiveConfig(next);
    },

    async removeSet(id) {
      const store = await storage._loadStore();
      const next = deleteSet(store, id);
      await storage._saveStore(next);
      return resolveActiveConfig(next);
    },

    async renameSet(id, name) {
      const store = await storage._loadStore();
      const next = renameSet(store, id, name);
      await storage._saveStore(next);
      return resolveActiveConfig(next);
    },

    async clear() {
      if (adapter.removeItem) {
        await adapter.removeItem();
      } else {
        await adapter.setItem(null);
      }
      storage._cachedStore = null;
      const fresh = createFreshStore();
      await storage._saveStore(fresh);
      return resolveActiveConfig(fresh);
    }
  };

  return storage;
}
