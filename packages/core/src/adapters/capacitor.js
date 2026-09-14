import { STORAGE_KEY } from '../config/schema.js';
import { createStorage } from '../storage/createStorage.js';
import { createAccessApi } from '../api/accessApi.js';
import { CLIENT_TYPES } from '../api/accessConfig.js';
import { createWebViewBridge } from '../platform/bridge.js';
import { validateBookingConfig } from '../validation/bookingValidation.js';
import * as network from '../api/network.js';
import { ACCESS_DEFAULTS, getApiBase } from '../api/accessConfig.js';

/**
 * @param {{ preferences: { get: (opts: { key: string }) => Promise<{ value?: string }>, set: (opts: { key: string, value: string }) => Promise<void>, remove: (opts: { key: string }) => Promise<void> }, clientType: string }} options
 */
export function createCapacitorCore({ preferences, clientType }) {
  const storageAdapter = {
    async getItem() {
      const { value } = await preferences.get({ key: STORAGE_KEY });
      if (!value) return null;
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    },
    async setItem(config) {
      if (config === null) {
        await preferences.remove({ key: STORAGE_KEY });
        return;
      }
      await preferences.set({ key: STORAGE_KEY, value: JSON.stringify(config) });
    },
    async removeItem() {
      await preferences.remove({ key: STORAGE_KEY });
    }
  };

  const storage = createStorage(storageAdapter);
  const bridge = createWebViewBridge();
  const accessApi = createAccessApi({ storage, clientType });

  return {
    storage,
    bridge,
    accessApi,
    network,
    validateBookingConfig,
    AccessConfig: {
      ...ACCESS_DEFAULTS,
      CLIENT_TYPE: clientType,
      getApiBase: (config) => getApiBase(config, ACCESS_DEFAULTS)
    },
    BookingValidation: { validate: validateBookingConfig }
  };
}

export function resolveMobileClientType(platform) {
  if (platform === 'ios') return CLIENT_TYPES.IONIC_IOS;
  return CLIENT_TYPES.IONIC_ANDROID;
}
