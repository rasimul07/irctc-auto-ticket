window.IRCTCExt = window.IRCTCExt || {};

const NGET_NOT_IMPLEMENTED = 'Classic (nget) booking is not implemented yet.';

IRCTCExt.NgetSearchFlow = {
  async submitSearchWithRedirect() {
    throw new Error(NGET_NOT_IMPLEMENTED);
  },

  async run() {
    throw new Error(NGET_NOT_IMPLEMENTED);
  }
};
