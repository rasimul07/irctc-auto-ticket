(function (root) {
  root.IRCTCExt = root.IRCTCExt || {};

  IRCTCExt.AccessApi = {
    get apiBase() {
      return IRCTCExt.AccessConfig.getApiBase(IRCTCExt.Storage?._cachedConfig);
    },

    get CLIENT_TYPE() {
      return IRCTCExt.AccessConfig.CLIENT_TYPE;
    },

    get BMC_URL() {
      return IRCTCExt.AccessConfig.BMC_URL;
    },

    headers(extra = {}) {
      return {
        'Content-Type': 'application/json',
        'X-Client-Type': this.CLIENT_TYPE,
        ...extra
      };
    },

    async getDeviceId() {
      const config = await IRCTCExt.Storage.get();
      if (config.access?.deviceId) return config.access.deviceId;

      const deviceId = crypto.randomUUID();
      await IRCTCExt.Storage.update({
        access: { ...(config.access || {}), deviceId }
      });
      return deviceId;
    },

    async request(path, options = {}) {
      const config = await IRCTCExt.Storage.get();
      IRCTCExt.Storage._cachedConfig = config;
      const apiBase = IRCTCExt.AccessConfig.getApiBase(config);
      const response = await fetch(`${apiBase}${path}`, {
        ...options,
        headers: this.headers(options.headers)
      });

      let payload = null;
      try {
        payload = await response.json();
      } catch {
        throw new Error('Invalid API response');
      }

      if (!response.ok || !payload?.ok) {
        const message = payload?.error?.message || `API request failed (${response.status})`;
        const err = new Error(message);
        err.code = payload?.error?.code || 'API_ERROR';
        throw err;
      }

      return payload.data;
    },

    async registerAccess() {
      const deviceId = await this.getDeviceId();
      const data = await this.request('/access/register', {
        method: 'POST',
        body: JSON.stringify({ deviceId })
      });
      await IRCTCExt.Storage.update({
        access: {
          deviceId,
          email: data.email || '',
          status: data
        }
      });
      return data;
    },

    async getAccessStatus() {
      const deviceId = await this.getDeviceId();
      const data = await this.request(`/access/status?deviceId=${encodeURIComponent(deviceId)}`, {
        method: 'GET'
      });
      const config = await IRCTCExt.Storage.get();
      await IRCTCExt.Storage.update({
        access: {
          ...(config.access || {}),
          deviceId,
          status: data
        }
      });
      return data;
    },

    async linkEmail(email) {
      const deviceId = await this.getDeviceId();
      const data = await this.request('/access/link', {
        method: 'POST',
        body: JSON.stringify({ deviceId, email })
      });
      await IRCTCExt.Storage.update({
        access: {
          deviceId,
          email,
          status: data
        }
      });
      return data;
    },

    isStatusAllowed(status) {
      return !!status?.allowed;
    },

    isStatusStale(status) {
      if (!status) return true;
      if (status.tier === 'paid') return false;
      if (!status.expiresAt) return true;
      return new Date(status.expiresAt) <= new Date();
    },

    async ensureAccess({ forceRefresh = false } = {}) {
      const config = await IRCTCExt.Storage.get();
      IRCTCExt.Storage._cachedConfig = config;

      try {
        if (!config.access?.deviceId) {
          return this.registerAccess();
        }
        if (forceRefresh || this.isStatusStale(config.access?.status)) {
          return this.getAccessStatus();
        }
        return config.access.status;
      } catch (err) {
        if (err.code === 'DEVICE_NOT_FOUND') {
          return this.registerAccess();
        }
        throw err;
      }
    },

    formatStatusMessage(status) {
      if (!status) return 'Access status unavailable.';
      if (status.tier === 'paid') return 'Paid access active.';
      if (status.tier === 'trial') {
        const expires = status.expiresAt ? new Date(status.expiresAt).toLocaleString() : 'soon';
        return `Trial active until ${expires}.`;
      }
      return 'Trial expired. Pay via Buy Me a Coffee and link your email.';
    },

    formatTier(status) {
      if (!status?.tier) return '—';
      if (status.tier === 'paid') return 'Paid';
      if (status.tier === 'trial') return 'Trial';
      if (status.tier === 'expired') return 'Expired';
      return status.tier.charAt(0).toUpperCase() + status.tier.slice(1);
    },

    formatValidUntil(status) {
      if (!status) return '—';
      if (status.tier === 'paid' && !status.expiresAt) return 'No expiry';
      if (!status.expiresAt) return '—';
      return new Date(status.expiresAt).toLocaleString();
    },

    formatActive(status) {
      if (!status) return '—';
      return status.allowed ? 'Active' : 'Not active';
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
