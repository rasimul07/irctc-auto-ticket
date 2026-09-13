(function (root) {
  root.IRCTCExt = root.IRCTCExt || {};
  if (IRCTCExt.NgetLoginFlow) return;

  const loginNotImplemented = 'Classic (nget) login is not implemented yet.';

  IRCTCExt.NgetLoginFlow = {
    async isLoggedIn() {
      return false;
    },

    async run() {
      throw new Error(loginNotImplemented);
    },

    async runWithRetry(config, overlay, { maxAttempts = 3 } = {}) {
      await IRCTCExt.NgetLanguageFlow.dismissPreferredLanguage(overlay);

      if (await IRCTCExt.NgetLoginFlow.isLoggedIn()) {
        overlay?.setStatus?.('Already logged in');
        return true;
      }

      overlay?.setStatus?.('Language selected — login step pending for nget.');
      return true;
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
