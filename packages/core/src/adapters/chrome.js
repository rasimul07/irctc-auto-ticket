import { STORAGE_KEY } from '../config/schema.js';
import { createStorage } from '../storage/createStorage.js';
import { createAccessApi } from '../api/accessApi.js';
import { CLIENT_TYPES } from '../api/accessConfig.js';
import { createChromeBridge } from '../platform/bridge.js';
import {
  validateBookingConfig,
  getTatkalJourneyDateWarning,
  getClassBerthWarnings
} from '../validation/bookingValidation.js';
import * as network from '../api/network.js';
import { ACCESS_DEFAULTS, getApiBase } from '../api/accessConfig.js';

export function createChromeExtensionCore({ clientType = CLIENT_TYPES.CHROME_EXTENSION } = {}) {
  const storageAdapter = {
    async getItem() {
      const data = await chrome.storage.local.get(STORAGE_KEY);
      return data[STORAGE_KEY] || null;
    },
    async setItem(config) {
      if (config === null) {
        await chrome.storage.local.remove(STORAGE_KEY);
        return;
      }
      await chrome.storage.local.set({ [STORAGE_KEY]: config });
    },
    async removeItem() {
      await chrome.storage.local.remove(STORAGE_KEY);
    }
  };

  const storage = createStorage(storageAdapter);
  const bridge = createChromeBridge();
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
    BookingValidation: {
      validate: validateBookingConfig,
      getTatkalJourneyDateWarning,
      getClassBerthWarnings
    }
  };
}
