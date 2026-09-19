"use strict";
var IRCTCCoreInit = (() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // src/config/sets.js
  var CONFIG_VERSION = 2;
  function newSetId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `set-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
  function createEmptySet(name = "Set 1") {
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
  function createFreshStore() {
    const set = createEmptySet("Set 1");
    const defaults = cloneDefaultConfig();
    return {
      version: CONFIG_VERSION,
      activeSetId: set.id,
      sets: [set],
      access: defaults.access,
      state: defaults.state
    };
  }
  function isV2Store(raw) {
    return raw?.version === CONFIG_VERSION && Array.isArray(raw?.sets) && raw.sets.length > 0;
  }
  function migrateToV2(raw) {
    if (!raw || typeof raw !== "object") {
      return createFreshStore();
    }
    if (isV2Store(raw)) {
      return normalizeStore(raw);
    }
    const defaults = cloneDefaultConfig();
    const set = createEmptySet("Set 1");
    set.credentials = { ...defaults.credentials, ...raw.credentials || {} };
    set.journey = { ...defaults.journey, ...raw.journey || {} };
    set.passengers = raw.passengers?.length ? raw.passengers : defaults.passengers;
    set.preferences = { ...defaults.preferences, ...raw.preferences || {} };
    set.schedule = { ...defaults.schedule, ...raw.schedule || {} };
    return {
      version: CONFIG_VERSION,
      activeSetId: set.id,
      sets: [set],
      access: { ...defaults.access, ...raw.access || {} },
      state: { ...defaults.state, ...raw.state || {} }
    };
  }
  function normalizeStore(store) {
    const next = {
      version: CONFIG_VERSION,
      activeSetId: store.activeSetId,
      sets: (store.sets || []).map((set) => ({
        ...createEmptySet(set.name || "Set"),
        ...set,
        credentials: { ...DEFAULT_CONFIG.credentials, ...set.credentials || {} },
        journey: { ...DEFAULT_CONFIG.journey, ...set.journey || {} },
        passengers: set.passengers?.length ? set.passengers : DEFAULT_CONFIG.passengers,
        preferences: { ...DEFAULT_CONFIG.preferences, ...set.preferences || {} },
        schedule: { ...DEFAULT_CONFIG.schedule, ...set.schedule || {} }
      })),
      access: { ...DEFAULT_CONFIG.access, ...store.access || {} },
      state: { ...DEFAULT_CONFIG.state, ...store.state || {} }
    };
    if (!next.sets.length) {
      const set = createEmptySet("Set 1");
      next.sets = [set];
      next.activeSetId = set.id;
    }
    if (!next.sets.some((set) => set.id === next.activeSetId)) {
      next.activeSetId = next.sets[0].id;
    }
    return next;
  }
  function getActiveSet(store) {
    const normalized = normalizeStore(store);
    return normalized.sets.find((set) => set.id === normalized.activeSetId) || normalized.sets[0];
  }
  function resolveActiveConfig(store) {
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
  function persistActiveSet(store, flatConfig) {
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
  function listSets(store) {
    return normalizeStore(store).sets.map((set) => ({ id: set.id, name: set.name }));
  }
  function nextSetName(store) {
    const count = normalizeStore(store).sets.length;
    return `Set ${count + 1}`;
  }
  function setActiveSet(store, id) {
    const normalized = normalizeStore(store);
    if (!normalized.sets.some((set) => set.id === id)) {
      throw new Error("Booking set not found.");
    }
    normalized.activeSetId = id;
    return normalized;
  }
  function createSet(store, name) {
    const normalized = normalizeStore(store);
    const set = createEmptySet(name || nextSetName(normalized));
    normalized.sets.push(set);
    normalized.activeSetId = set.id;
    return normalized;
  }
  function duplicateSet(store, id) {
    const normalized = normalizeStore(store);
    const source = normalized.sets.find((set) => set.id === id);
    if (!source) throw new Error("Booking set not found.");
    const copy = {
      ...JSON.parse(JSON.stringify(source)),
      id: newSetId(),
      name: `${source.name} copy`
    };
    normalized.sets.push(copy);
    normalized.activeSetId = copy.id;
    return normalized;
  }
  function renameSet(store, id, name) {
    const normalized = normalizeStore(store);
    const trimmed = String(name || "").trim();
    if (!trimmed) throw new Error("Set name cannot be empty.");
    const set = normalized.sets.find((item) => item.id === id);
    if (!set) throw new Error("Booking set not found.");
    set.name = trimmed;
    return normalized;
  }
  function deleteSet(store, id) {
    const normalized = normalizeStore(store);
    if (normalized.sets.length <= 1) {
      throw new Error("Cannot delete the only booking set.");
    }
    normalized.sets = normalized.sets.filter((set) => set.id !== id);
    if (normalized.activeSetId === id) {
      normalized.activeSetId = normalized.sets[0].id;
    }
    return normalized;
  }

  // src/config/schema.js
  var DEFAULT_CONFIG = {
    credentials: { username: "", password: "" },
    journey: {
      from: "",
      fromCode: "",
      to: "",
      toCode: "",
      date: "",
      trainNo: "",
      trainName: "",
      travelClass: "SL",
      quota: "TATKAL"
    },
    passengers: [{ name: "", age: "", gender: "", berth: "No Preference", food: "" }],
    schedule: { enabled: false, type: "non-ac" },
    preferences: {
      bookingSite: "eticket",
      loyaltyChoice: "skip",
      paymentMethod: "cards",
      cardsProvider: "PhonePe",
      upiProvider: "IRCTC iPay",
      debitCard: { name: "", number: "", expiry: "", cvv: "" },
      creditCard: { name: "", number: "", expiry: "", cvv: "" },
      autoPayEnabled: false,
      autoPayType: "debit"
    },
    access: {
      deviceId: "",
      email: "",
      apiBase: "",
      status: null
    },
    state: {
      status: "idle",
      lastRun: null,
      currentStep: "init",
      running: false,
      paused: false,
      message: "",
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
  var STORAGE_KEY = "irctcConfig";
  function cloneDefaultConfig() {
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  }
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

  // src/storage/createStorage.js
  function createStorage(adapter) {
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

  // src/api/accessConfig.js
  var ACCESS_DEFAULTS = {
    API_BASE_DEV: "http://localhost:3000/api/v1",
    API_BASE_PROD: "https://api.railticket.tool.mridev.in/api/v1",
    BMC_URL: "https://buymeacoffee.com/mritools",
    USE_PROD_API: false
  };
  var CLIENT_TYPES = {
    CHROME_EXTENSION: "chrome_extension",
    IONIC_ANDROID: "ionic_android",
    IONIC_IOS: "ionic_ios"
  };
  function getApiBase(config, defaults = ACCESS_DEFAULTS) {
    if (config?.access?.apiBase) return config.access.apiBase;
    return defaults.USE_PROD_API ? defaults.API_BASE_PROD : defaults.API_BASE_DEV;
  }

  // src/api/network.js
  var network_exports = {};
  __export(network_exports, {
    OFFLINE_MESSAGE: () => OFFLINE_MESSAGE,
    isBrowserOnline: () => isBrowserOnline,
    isNetworkError: () => isNetworkError,
    toUserNetworkMessage: () => toUserNetworkMessage,
    watchOnlineStatus: () => watchOnlineStatus
  });
  var OFFLINE_MESSAGE = "You are offline. Connect to the internet and try again.";
  var NETWORK_ERROR_PATTERN = /ENOTFOUND|ECONNREFUSED|ETIMEDOUT|ECONNRESET|getaddrinfo|network error|failed to fetch/i;
  var NETWORK_ERROR_CODES = /* @__PURE__ */ new Set(["NETWORK_OFFLINE", "SERVICE_UNAVAILABLE", "DB_UNAVAILABLE"]);
  function isBrowserOnline() {
    return typeof navigator === "undefined" || navigator.onLine;
  }
  function isNetworkError(err) {
    if (!err) return false;
    if (err.code && NETWORK_ERROR_CODES.has(err.code)) return true;
    const message = String(err.message || err);
    return NETWORK_ERROR_PATTERN.test(message);
  }
  function toUserNetworkMessage(err, fallback = "Could not reach access API.") {
    if (!isBrowserOnline() || isNetworkError(err)) {
      return OFFLINE_MESSAGE;
    }
    return err?.message || fallback;
  }
  function watchOnlineStatus(onOnline, onOffline) {
    const target = typeof window !== "undefined" ? window : typeof self !== "undefined" ? self : null;
    if (!target?.addEventListener) return () => {
    };
    const handleOnline = () => onOnline?.();
    const handleOffline = () => onOffline?.();
    target.addEventListener("online", handleOnline);
    target.addEventListener("offline", handleOffline);
    return () => {
      target.removeEventListener("online", handleOnline);
      target.removeEventListener("offline", handleOffline);
    };
  }

  // src/api/accessApi.js
  var MOBILE_CLIENTS = /* @__PURE__ */ new Set([CLIENT_TYPES.IONIC_ANDROID, CLIENT_TYPES.IONIC_IOS]);
  function isMobileClient(clientType) {
    return MOBILE_CLIENTS.has(clientType);
  }
  function checkMobileBookingAllowed(status, clientType) {
    if (!isMobileClient(clientType)) return !!status?.allowed;
    return status?.tier === "pro" && !!status?.allowed;
  }
  function buildMobileBookingMessage(status, clientType) {
    if (!status) return "Access status unavailable.";
    if (checkMobileBookingAllowed(status, clientType)) {
      return "Pro access active \u2014 mobile auto-booking is enabled.";
    }
    if (!isMobileClient(clientType)) {
      return status.allowed ? "Access active." : "Access not active.";
    }
    if (status.tier === "trial") {
      const expires = status.expiresAt ? new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      }).format(new Date(status.expiresAt)) : "soon";
      return `Trial is active until ${expires}, but mobile booking requires a Pro plan. Trial, Coffee, and Basic work on the Chrome extension only.`;
    }
    if (status.tier === "coffee" || status.tier === "basic") {
      return "Mobile booking requires a Pro plan. Your current plan works on the Chrome extension only.";
    }
    if (status.tier === "none" || status.tier === "expired") {
      return "Mobile booking requires a Pro plan on Buy Me a Coffee. Link your email on the Access tab after subscribing.";
    }
    return "Mobile booking requires a Pro plan. Trial, Coffee, and Basic work on the Chrome extension only.";
  }
  function createAccessApi({ storage, clientType, defaults = ACCESS_DEFAULTS }) {
    const api = {
      get apiBase() {
        return getApiBase(storage._cachedConfig, defaults);
      },
      get CLIENT_TYPE() {
        return clientType;
      },
      get BMC_URL() {
        return defaults.BMC_URL;
      },
      headers(extra = {}) {
        return {
          "Content-Type": "application/json",
          "X-Client-Type": clientType,
          ...extra
        };
      },
      async getDeviceId() {
        const config = await storage.get();
        if (config.access?.deviceId) return config.access.deviceId;
        const deviceId = crypto.randomUUID();
        await storage.update({
          access: { ...config.access || {}, deviceId }
        });
        return deviceId;
      },
      async request(path, options = {}) {
        if (!isBrowserOnline()) {
          const err = new Error(OFFLINE_MESSAGE);
          err.code = "NETWORK_OFFLINE";
          throw err;
        }
        const config = await storage.get();
        storage._cachedConfig = config;
        const apiBase = getApiBase(config, defaults);
        let response;
        try {
          response = await fetch(`${apiBase}${path}`, {
            ...options,
            headers: api.headers(options.headers)
          });
        } catch {
          const err = new Error(OFFLINE_MESSAGE);
          err.code = "NETWORK_OFFLINE";
          throw err;
        }
        let payload = null;
        try {
          payload = await response.json();
        } catch {
          throw new Error("Invalid API response");
        }
        if (!response.ok || !payload?.ok) {
          const rawMessage = payload?.error?.message || `API request failed (${response.status})`;
          const err = new Error(rawMessage);
          err.code = payload?.error?.code || "API_ERROR";
          if (isNetworkError(err)) {
            err.message = OFFLINE_MESSAGE;
            err.code = "NETWORK_OFFLINE";
          }
          throw err;
        }
        return payload.data;
      },
      async registerAccess() {
        const deviceId = await api.getDeviceId();
        const data = await api.request("/access/register", {
          method: "POST",
          body: JSON.stringify({ deviceId })
        });
        await storage.update({
          access: { deviceId, email: data.email || "", status: data }
        });
        return data;
      },
      async getAccessStatus() {
        const deviceId = await api.getDeviceId();
        const data = await api.request(`/access/status?deviceId=${encodeURIComponent(deviceId)}`, {
          method: "GET"
        });
        const config = await storage.get();
        await storage.update({
          access: { ...config.access || {}, deviceId, status: data }
        });
        return data;
      },
      async linkEmail(email) {
        const deviceId = await api.getDeviceId();
        const data = await api.request("/access/link", {
          method: "POST",
          body: JSON.stringify({ deviceId, email })
        });
        await storage.update({
          access: { deviceId, email, status: data }
        });
        return data;
      },
      async consumeToken(usageKey) {
        const deviceId = await api.getDeviceId();
        const data = await api.request("/access/consume-token", {
          method: "POST",
          body: JSON.stringify({ deviceId, usageKey })
        });
        const config = await storage.get();
        await storage.update({
          access: { ...config.access || {}, deviceId, status: data }
        });
        return data;
      },
      formatDisplayDate(value) {
        if (!value) return "";
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return String(value);
        return new Intl.DateTimeFormat("en-GB", {
          timeZone: "Asia/Kolkata",
          day: "2-digit",
          month: "2-digit",
          year: "numeric"
        }).format(d);
      },
      isStatusAllowed(status) {
        if (isMobileClient(clientType)) return checkMobileBookingAllowed(status, clientType);
        return !!status?.allowed;
      },
      isMobileBookingAllowed(status) {
        return checkMobileBookingAllowed(status, clientType);
      },
      formatMobileBookingMessage(status) {
        return buildMobileBookingMessage(status, clientType);
      },
      isStatusStale(status) {
        if (!status) return true;
        if (status.unlimited) return false;
        if (status.tier === "coffee" && status.tokensRemaining > 0) {
          if (!status.expiresAt) return true;
          return new Date(status.expiresAt) <= /* @__PURE__ */ new Date();
        }
        if (!status.expiresAt) return status.tier === "none";
        return new Date(status.expiresAt) <= /* @__PURE__ */ new Date();
      },
      async ensureAccess({ forceRefresh = false } = {}) {
        const config = await storage.get();
        storage._cachedConfig = config;
        try {
          if (!config.access?.deviceId) {
            return api.registerAccess();
          }
          if (forceRefresh || api.isStatusStale(config.access?.status)) {
            return api.getAccessStatus();
          }
          return config.access.status;
        } catch (err) {
          if (err.code === "DEVICE_NOT_FOUND") {
            return api.registerAccess();
          }
          const message = toUserNetworkMessage(err);
          const wrapped = new Error(message);
          wrapped.code = isNetworkError(err) ? "NETWORK_OFFLINE" : err.code;
          throw wrapped;
        }
      },
      formatStatusMessage(status) {
        if (!status) return "Access status unavailable.";
        if (status.tier === "pro") return "Pro access active \u2014 unlimited on extension and mobile apps.";
        if (status.tier === "basic") return "Basic access active \u2014 unlimited on Chrome extension.";
        if (status.tier === "trial") {
          const expires = status.expiresAt ? api.formatDisplayDate(status.expiresAt) : "soon";
          return `Free trial active until ${expires}.`;
        }
        if (status.tier === "coffee") {
          const tokens = status.tokensRemaining ?? 0;
          const expires = status.expiresAt ? api.formatDisplayDate(status.expiresAt) : "soon";
          return `${tokens} booking token${tokens === 1 ? "" : "s"} left until ${expires}.`;
        }
        if (status.tier === "none") {
          return "No access yet. Start a free trial or buy a coffee on Buy Me a Coffee, then link your email.";
        }
        if (status.tier === "expired") {
          return "Access expired. Renew on Buy Me a Coffee and link your email.";
        }
        return status.allowed ? "Access active." : "Access not active.";
      },
      formatTier(status) {
        if (!status?.tier) return "\u2014";
        if (status.tier === "pro") return "Pro";
        if (status.tier === "basic") return "Basic";
        if (status.tier === "trial") return "Trial";
        if (status.tier === "coffee") return "Coffee";
        if (status.tier === "none") return "None";
        if (status.tier === "expired") return "Expired";
        return status.tier.charAt(0).toUpperCase() + status.tier.slice(1);
      },
      formatValidUntil(status) {
        if (!status) return "\u2014";
        if (status.unlimited && !status.expiresAt) return "No expiry";
        if (status.tier === "coffee" && status.tokensRemaining != null) {
          const expiry = status.expiresAt ? api.formatDisplayDate(status.expiresAt) : "\u2014";
          return `${status.tokensRemaining} tokens \xB7 until ${expiry}`;
        }
        if (!status.expiresAt) return "\u2014";
        return api.formatDisplayDate(status.expiresAt);
      },
      formatActive(status) {
        if (!status) return "\u2014";
        return status.allowed ? "Active" : "Not active";
      }
    };
    return api;
  }

  // src/platform/bridge.js
  function createPlatformBridge() {
    const handlers = /* @__PURE__ */ new Set();
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
  function createChromeBridge() {
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

  // src/validation/bookingValidation.js
  function isCardComplete(card) {
    return !!(card?.name && card?.number && card?.expiry && card?.cvv);
  }
  function validateBookingConfig(config) {
    const credentials = config?.credentials || {};
    const journey = config?.journey || {};
    const passengers = config?.passengers || [];
    const preferences = config?.preferences || {};
    if (!credentials.username?.trim()) {
      return { tab: "credentials", focusId: "username", message: "Please enter your IRCTC username." };
    }
    if (!credentials.password) {
      return { tab: "credentials", focusId: "password", message: "Please enter your IRCTC password." };
    }
    if (!journey.from?.trim()) {
      return { tab: "journey", focusId: "fromStation", message: "Please enter the From station." };
    }
    if (!journey.to?.trim()) {
      return { tab: "journey", focusId: "toStation", message: "Please enter the To station." };
    }
    if (!journey.date) {
      return { tab: "journey", focusId: "journeyDate", message: "Please select the journey date." };
    }
    if (!journey.trainNo?.trim() && !journey.trainName?.trim()) {
      return {
        tab: "journey",
        focusId: "trainNo",
        message: "Enter a train number or train name."
      };
    }
    const hasNamedPassenger = passengers.some((p) => (p.name || "").trim());
    if (!hasNamedPassenger) {
      return {
        tab: "passengers",
        focusSelector: ".passenger-card .p-name",
        message: "Add at least one passenger with a name matching your IRCTC profile."
      };
    }
    if (preferences.autoPayEnabled && preferences.paymentMethod === "cards") {
      const type = preferences.autoPayType || "debit";
      if (type === "debit" || type === "credit") {
        const card = type === "credit" ? preferences.creditCard : preferences.debitCard;
        const prefix = type === "credit" ? "credit" : "debit";
        const label = type === "credit" ? "credit" : "debit";
        if (!card?.name) {
          return { tab: "payment", focusId: `${prefix}CardName`, message: `Enter ${label} card name for auto pay.` };
        }
        if (!card?.number) {
          return { tab: "payment", focusId: `${prefix}CardNumber`, message: `Enter ${label} card number for auto pay.` };
        }
        if (!card?.expiry) {
          return { tab: "payment", focusId: `${prefix}CardExpiry`, message: `Enter ${label} card expiry for auto pay.` };
        }
        if (!card?.cvv) {
          return { tab: "payment", focusId: `${prefix}CardCvv`, message: `Enter ${label} card CVV for auto pay.` };
        }
        if (!isCardComplete(card)) {
          return { tab: "payment", focusId: `${prefix}CardName`, message: `Complete all ${label} card fields for auto pay.` };
        }
      }
    }
    return null;
  }

  // src/adapters/chrome.js
  function createChromeExtensionCore({ clientType = CLIENT_TYPES.CHROME_EXTENSION } = {}) {
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
      network: network_exports,
      validateBookingConfig,
      AccessConfig: {
        ...ACCESS_DEFAULTS,
        CLIENT_TYPE: clientType,
        getApiBase: (config) => getApiBase(config, ACCESS_DEFAULTS)
      },
      BookingValidation: { validate: validateBookingConfig }
    };
  }

  // src/validation/setupProgress.ts
  function isCardComplete2(card) {
    return !!(card?.name && card?.number && card?.expiry && card?.cvv);
  }
  function getSetupSteps(config) {
    const credentials = config.credentials || {};
    const journey = config.journey || {};
    const passengers = config.passengers || [];
    const preferences = config.preferences || {};
    const loginDone = !!(credentials.username?.trim() && credentials.password);
    const journeyDone = !!(journey.from?.trim() && journey.to?.trim() && journey.date && (journey.trainNo?.trim() || journey.trainName?.trim()));
    const passengersDone = passengers.some((p) => (p.name || "").trim() && (p.age || "").trim() && p.gender);
    const paymentDone = !preferences.autoPayEnabled || preferences.paymentMethod !== "cards" || (preferences.autoPayType === "credit" ? isCardComplete2(preferences.creditCard) : isCardComplete2(preferences.debitCard));
    return [
      {
        id: "login",
        label: "Login",
        done: loginDone,
        hint: loginDone ? "IRCTC credentials saved" : "Add username and password"
      },
      {
        id: "journey",
        label: "Journey",
        done: journeyDone,
        hint: journeyDone ? `${journey.from} \u2192 ${journey.to}` : "Stations, date, and train"
      },
      {
        id: "passengers",
        label: "Passengers",
        done: passengersDone,
        hint: passengersDone ? `${passengers.filter((p) => p.name?.trim()).length} passenger(s)` : "At least one complete passenger"
      },
      {
        id: "payment",
        label: "Payment",
        done: paymentDone,
        hint: preferences.autoPayEnabled ? "Auto-pay configured" : "Manual payment (optional)"
      }
    ];
  }
  function getSetupCompletion(config) {
    const steps = getSetupSteps(config);
    const done = steps.filter((step) => step.done).length;
    const ready = steps.filter((step) => step.id !== "payment").every((step) => step.done);
    return { done, total: steps.length, ready, steps };
  }

  // src/chrome-init.js
  (function(root) {
    root.IRCTCExt = root.IRCTCExt || {};
    const core = createChromeExtensionCore();
    core.bridge.install();
    root.IRCTCExt.Storage = core.storage;
    root.IRCTCExt.AccessApi = core.accessApi;
    root.IRCTCExt.Network = core.network;
    root.IRCTCExt.BookingValidation = core.BookingValidation;
    root.IRCTCExt.AccessConfig = core.AccessConfig;
    root.IRCTCExt.PlatformBridge = core.bridge;
    root.IRCTCExt.DEFAULT_CONFIG = DEFAULT_CONFIG;
    root.IRCTCExt.ConfigSets = {
      migrateToV2,
      resolveActiveConfig,
      persistActiveSet,
      normalizeStore,
      listSets,
      setActiveSet,
      createSet,
      duplicateSet,
      renameSet,
      deleteSet
    };
    root.IRCTCExt.SetupProgress = { getSetupSteps, getSetupCompletion };
    if (typeof root.document !== "undefined") {
      root.IRCTCStorage = core.storage;
      root.IRCTC_DEFAULT_CONFIG = DEFAULT_CONFIG;
    }
  })(typeof globalThis !== "undefined" ? globalThis : window);
})();
