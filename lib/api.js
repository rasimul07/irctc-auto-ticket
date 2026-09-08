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

    async consumeToken(usageKey) {
      const deviceId = await this.getDeviceId();
      const data = await this.request('/access/consume-token', {
        method: 'POST',
        body: JSON.stringify({ deviceId, usageKey })
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

    isStatusAllowed(status) {
      return !!status?.allowed;
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
      if (status.tier === 'pro') return 'Pro access active — unlimited on extension and mobile apps.';
      if (status.tier === 'basic') return 'Basic access active — unlimited on Chrome extension.';
      if (status.tier === 'trial') {
        const expires = status.expiresAt ? new Date(status.expiresAt).toLocaleString() : 'soon';
        return `Free trial active until ${expires}.`;
      }
      if (status.tier === 'coffee') {
        const tokens = status.tokensRemaining ?? 0;
        const expires = status.expiresAt ? new Date(status.expiresAt).toLocaleString() : 'soon';
        return `${tokens} booking token${tokens === 1 ? '' : 's'} left until ${expires}.`;
      }
      if (status.tier === 'none') {
        return 'No access yet. Start a free trial or buy a coffee on Buy Me a Coffee, then link your email.';
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
      if (status.tier === 'none') return 'None';
      if (status.tier === 'expired') return 'Expired';
      return status.tier.charAt(0).toUpperCase() + status.tier.slice(1);
    },

    formatValidUntil(status) {
      if (!status) return '—';
      if (status.unlimited && !status.expiresAt) return 'No expiry';
      if (status.tier === 'coffee' && status.tokensRemaining != null) {
        const expiry = status.expiresAt ? new Date(status.expiresAt).toLocaleString() : '—';
        return `${status.tokensRemaining} tokens · until ${expiry}`;
      }
      if (!status.expiresAt) return '—';
      return new Date(status.expiresAt).toLocaleString();
    },

    formatActive(status) {
      if (!status) return '—';
      return status.allowed ? 'Active' : 'Not active';
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
