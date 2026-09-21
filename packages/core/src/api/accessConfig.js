export const ACCESS_DEFAULTS = {
  API_BASE_DEV: 'http://localhost:3000/api/v1',
  API_BASE_PROD: 'https://api.railticket.tool.mridev.in/api/v1',
  BMC_URL: 'https://buymeacoffee.com/mritools',
  USE_PROD_API: true,
};

export const CLIENT_TYPES = {
  CHROME_EXTENSION: 'chrome_extension',
  IONIC_ANDROID: 'ionic_android',
  IONIC_IOS: 'ionic_ios'
};

export function getApiBase(config, defaults = ACCESS_DEFAULTS) {
  if (config?.access?.apiBase) return config.access.apiBase;
  return defaults.USE_PROD_API ? defaults.API_BASE_PROD : defaults.API_BASE_DEV;
}
