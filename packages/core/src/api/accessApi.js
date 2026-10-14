import { ACCESS_DEFAULTS, CLIENT_TYPES } from './accessConfig.js';

export function isMobileClient() {
  return false;
}

export function checkMobileBookingAllowed() {
  return true;
}

export function buildMobileBookingMessage() {
  return 'Free Unlimited Access active.';
}

export function createAccessApi({ storage, clientType, defaults = ACCESS_DEFAULTS } = {}) {
  const FREE_STATUS = {
    allowed: true,
    tier: 'pro',
    unlimited: true,
    tokensRemaining: 999999,
    expiresAt: null,
    status: 'active'
  };

  const api = {
    get apiBase() {
      return '';
    },

    get CLIENT_TYPE() {
      return clientType;
    },

    get BMC_URL() {
      return '';
    },

    headers(extra = {}) {
      return {
        'Content-Type': 'application/json',
        ...extra
      };
    },

    async getDeviceId() {
      return 'local-device';
    },

    async request() {
      return FREE_STATUS;
    },

    async registerAccess() {
      return FREE_STATUS;
    },

    async getAccessStatus() {
      return FREE_STATUS;
    },

    async linkEmail() {
      return FREE_STATUS;
    },

    async consumeToken() {
      return { ok: true, allowed: true, tier: 'pro', unlimited: true };
    },

    formatDisplayDate() {
      return 'Lifetime';
    },

    isStatusAllowed() {
      return true;
    },

    isMobileBookingAllowed() {
      return true;
    },

    formatMobileBookingMessage() {
      return 'Free Unlimited Access';
    },

    isStatusStale() {
      return false;
    },

    async ensureAccess() {
      return FREE_STATUS;
    },

    formatStatusMessage() {
      return 'Free Unlimited Access';
    },

    formatTier() {
      return 'Free Unlimited';
    },

    formatValidUntil() {
      return 'Lifetime';
    },

    formatActive() {
      return 'Active';
    }
  };

  return api;
}
