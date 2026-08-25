(function (root) {
  root.IRCTCExt = root.IRCTCExt || {};

  IRCTCExt.AccessConfig = {
    API_BASE_DEV: 'http://localhost:3000/api/v1',
    API_BASE_PROD: 'https://api.yourdomain.com/api/v1',
    CLIENT_TYPE: 'chrome_extension',
    BMC_URL: 'https://buymeacoffee.com/',
    USE_PROD_API: false,

    getApiBase(config) {
      if (config?.access?.apiBase) return config.access.apiBase;
      return this.USE_PROD_API ? this.API_BASE_PROD : this.API_BASE_DEV;
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
