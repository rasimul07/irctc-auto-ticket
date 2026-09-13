(function (root) {
  root.IRCTCExt = root.IRCTCExt || {};
  if (IRCTCExt.NgetBookingFlow) return;

  const bookingNotImplemented = 'Classic (nget) booking is not implemented yet.';

  IRCTCExt.NgetBookingFlow = {
    async fillPassengers() {
      throw new Error(bookingNotImplemented);
    },

    async configurePsgninputOptions() {
      throw new Error(bookingNotImplemented);
    },

    async clickContinueToPayment() {
      throw new Error(bookingNotImplemented);
    },

    async showPaymentReview() {
      throw new Error(bookingNotImplemented);
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
