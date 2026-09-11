window.IRCTCExt = window.IRCTCExt || {};

const NGET_NOT_IMPLEMENTED = 'Classic (nget) booking is not implemented yet.';

IRCTCExt.NgetLoginFlow = {
  async isLoggedIn() {
    return false;
  },

  async run() {
    throw new Error(NGET_NOT_IMPLEMENTED);
  },

  async runWithRetry() {
    throw new Error(NGET_NOT_IMPLEMENTED);
  }
};
