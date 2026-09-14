import { cloneDefaultConfig, mergeConfig } from '../config/schema.js';

/**
 * @param {{ getItem: () => Promise<object|null>, setItem: (config: object) => Promise<void>, removeItem?: () => Promise<void> }} adapter
 */
export function createStorage(adapter) {
  const storage = {
    _cachedConfig: null,

    async get() {
      const data = await adapter.getItem();
      return { ...cloneDefaultConfig(), ...(data || {}) };
    },

    async set(config) {
      await adapter.setItem(config);
      storage._cachedConfig = config;
    },

    async update(partial) {
      const current = await storage.get();
      const next = mergeConfig(current, partial);
      await storage.set(next);
      return next;
    },

    async updateState(updates) {
      const current = await storage.get();
      current.state = { ...current.state, ...updates };
      await storage.set(current);
      return current;
    },

    async clear() {
      if (adapter.removeItem) {
        await adapter.removeItem();
      } else {
        await adapter.setItem(null);
      }
      storage._cachedConfig = null;
    }
  };

  return storage;
}
