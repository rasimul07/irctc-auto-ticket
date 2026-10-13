import { getApiBase, ACCESS_DEFAULTS, CLIENT_TYPES } from './accessConfig.js';
import { isBrowserOnline, isNetworkError, OFFLINE_MESSAGE, toUserNetworkMessage } from './network.js';

const MOBILE_CLIENTS = new Set([CLIENT_TYPES.IONIC_ANDROID, CLIENT_TYPES.IONIC_IOS]);

export function isMobileClient(clientType) {
  return MOBILE_CLIENTS.has(clientType);
}

export function checkMobileBookingAllowed(status, clientType) {
  if (!isMobileClient(clientType)) return !!status?.allowed;
  return status?.tier === 'pro' && !!status?.allowed;
}

export function buildMobileBookingMessage(status, clientType) {
  if (!status) return 'Access status unavailable.';
  if (checkMobileBookingAllowed(status, clientType)) {
    return 'Pro access active — mobile auto-booking is enabled.';
  }
  if (!isMobileClient(clientType)) {
    return status.allowed ? 'Access active.' : 'Access not active.';
  }
  if (status.tier === 'trial') {
    const expires = status.expiresAt
      ? new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Asia/Kolkata',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }).format(new Date(status.expiresAt))
      : 'soon';
    return `Trial is active until ${expires}, but mobile booking requires a Pro plan. Trial, Coffee, and Basic work on the Chrome extension only.`;
  }
  if (status.tier === 'coffee' || status.tier === 'basic') {
    return 'Mobile booking requires a Pro plan. Your current plan works on the Chrome extension only.';
  }
  if (status.tier === 'none' || status.tier === 'expired') {
    return 'Mobile booking requires a Pro plan on Buy Me a Coffee. Link your email on the Access tab after subscribing.';
  }
  return 'Mobile booking requires a Pro plan. Trial, Coffee, and Basic work on the Chrome extension only.';
}

export function createAccessApi({ storage, clientType, defaults = ACCESS_DEFAULTS }) {
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
        'Content-Type': 'application/json',
        'X-Client-Type': clientType,
        ...extra
      };
    },

    async getDeviceId() {
      const config = await storage.get();
      if (config.access?.deviceId) return config.access.deviceId;

      const deviceId = crypto.randomUUID();
      await storage.update({
        access: { ...(config.access || {}), deviceId }
      });
      return deviceId;
    },

    async request(path, options = {}) {
      if (!isBrowserOnline()) {
        const err = new Error(OFFLINE_MESSAGE);
        err.code = 'NETWORK_OFFLINE';
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
        err.code = 'NETWORK_OFFLINE';
        throw err;
      }

      let payload = null;
      try {
        payload = await response.json();
      } catch {
        throw new Error('Invalid API response');
      }

      if (!response.ok || !payload?.ok) {
        const rawMessage = payload?.error?.message || `API request failed (${response.status})`;
        const err = new Error(rawMessage);
        err.code = payload?.error?.code || 'API_ERROR';
        if (isNetworkError(err)) {
          err.message = OFFLINE_MESSAGE;
          err.code = 'NETWORK_OFFLINE';
        }
        throw err;
      }

      return payload.data;
    },

    async registerAccess() {
      const deviceId = await api.getDeviceId();
      const data = await api.request('/access/register', {
        method: 'POST',
        body: JSON.stringify({ deviceId })
      });
      await storage.update({
        access: { deviceId, email: data.email || '', status: data }
      });
      return data;
    },

    async getAccessStatus() {
      const deviceId = await api.getDeviceId();
      const data = await api.request(`/access/status?deviceId=${encodeURIComponent(deviceId)}`, {
        method: 'GET'
      });
      const config = await storage.get();
      await storage.update({
        access: { ...(config.access || {}), deviceId, status: data }
      });
      return data;
    },

    async linkEmail(email) {
      const deviceId = await api.getDeviceId();
      const data = await api.request('/access/link', {
        method: 'POST',
        body: JSON.stringify({ deviceId, email })
      });
      await storage.update({
        access: { deviceId, email, status: data }
      });
      return data;
    },

    async consumeToken(usageKey) {
      const deviceId = await api.getDeviceId();
      const data = await api.request('/access/consume-token', {
        method: 'POST',
        body: JSON.stringify({ deviceId, usageKey })
      });
      const config = await storage.get();
      await storage.update({
        access: { ...(config.access || {}), deviceId, status: data }
      });
      return data;
    },

    formatDisplayDate(value) {
      if (!value) return '';
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return String(value);
      return new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
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
      if (status.tier === 'coffee' && status.tokensRemaining > 0) {
        if (!status.expiresAt) return true;
        return new Date(status.expiresAt) <= new Date();
      }
      if (!status.expiresAt) return status.tier === 'none';
      return new Date(status.expiresAt) <= new Date();
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
        if (err.code === 'DEVICE_NOT_FOUND') {
          return api.registerAccess();
        }
        const message = toUserNetworkMessage(err);
        const wrapped = new Error(message);
        wrapped.code = isNetworkError(err) ? 'NETWORK_OFFLINE' : err.code;
        throw wrapped;
      }
    },

    formatStatusMessage(status) {
      if (!status) return 'Access status unavailable.';
      if (status.tier === 'pro') return 'Pro access active — unlimited on extension and mobile apps.';
      if (status.tier === 'basic') return 'Basic access active — unlimited on Chrome extension.';
      if (status.tier === 'trial') {
        const expires = status.expiresAt ? api.formatDisplayDate(status.expiresAt) : 'soon';
        return `Free trial active until ${expires}.`;
      }
      if (status.tier === 'coffee') {
        const tokens = status.tokensRemaining ?? 0;
        const expires = status.expiresAt ? api.formatDisplayDate(status.expiresAt) : 'soon';
        return `${tokens} booking token${tokens === 1 ? '' : 's'} left until ${expires}.`;
      }
      if (status.tier === 'none') {
        return 'Free mode active: All booking steps up to payment are 100% free. Link Buy Me a Coffee email only for Auto Pay automation.';
      }
      if (status.tier === 'expired') {
        return 'Access expired. Renew on Buy Me a Coffee and link your email.';
      }
      return status.allowed ? 'Access active.' : 'Access not active.';
    },

    formatTier(status) {
      if (!status?.tier) return '—';
      if (status.tier === 'pro') return 'Pro';
      if (status.tier === 'basic') return 'Basic';
      if (status.tier === 'trial') return 'Trial';
      if (status.tier === 'coffee') return 'Coffee';
      if (status.tier === 'none') return 'Free';
      if (status.tier === 'expired') return 'Expired';
      return status.tier.charAt(0).toUpperCase() + status.tier.slice(1);
    },

    formatValidUntil(status) {
      if (!status) return '—';
      if (status.unlimited && !status.expiresAt) return 'No expiry';
      if (status.tier === 'coffee' && status.tokensRemaining != null) {
        const expiry = status.expiresAt ? api.formatDisplayDate(status.expiresAt) : '—';
        return `${status.tokensRemaining} tokens · until ${expiry}`;
      }
      if (!status.expiresAt) return '—';
      return api.formatDisplayDate(status.expiresAt);
    },

    formatActive(status) {
      if (!status) return '—';
      return status.allowed ? 'Active' : 'Not active';
    }
  };

  return api;
}
