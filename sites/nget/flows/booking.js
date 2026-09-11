window.IRCTCExt = window.IRCTCExt || {};

const NGET_NOT_IMPLEMENTED = 'Classic (nget) booking is not implemented yet.';

IRCTCExt.NgetBookingFlow = {
  async fillPassengers() {
    throw new Error(NGET_NOT_IMPLEMENTED);
  },

  async configurePsgninputOptions() {
    throw new Error(NGET_NOT_IMPLEMENTED);
  },

  async clickContinueToPayment() {
    throw new Error(NGET_NOT_IMPLEMENTED);
  },

  async showPaymentReview() {
    throw new Error(NGET_NOT_IMPLEMENTED);
  }
};
