import { createChromeExtensionCore } from './adapters/chrome.js';
import { DEFAULT_CONFIG } from './config/schema.js';

(function (root) {
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

  if (typeof root.document !== 'undefined') {
    root.IRCTCStorage = core.storage;
    root.IRCTC_DEFAULT_CONFIG = DEFAULT_CONFIG;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
