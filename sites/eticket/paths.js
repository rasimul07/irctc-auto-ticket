window.IRCTCExt = window.IRCTCExt || {};

IRCTCExt.EticketPaths = {
  syncStepFromPath(path, state = {}) {
    if (path.includes('bkgPaymentOptions')) return 'payment';
    if (path.includes('reviewBooking')) return 'review';
    if (path.includes('psgninput')) return state.passengersDone ? 'review' : 'passengers';
    if (path.includes('train-list')) return 'train-list';
    if (path.includes('train-search')) return 'search';
    return 'init';
  },

  isErrorPage(path = location.pathname) {
    return path.includes(IRCTCExt.EticketConfig.errorPagePath);
  },

  isTrainListPath(path = location.pathname) {
    return path.includes('train-list');
  },

  isTrainSearchPath(path = location.pathname) {
    return path.includes('train-search');
  },

  isPaymentPath(path = location.pathname) {
    return path.includes('bkgPaymentOptions');
  },

  isReviewPath(path = location.pathname) {
    return path.includes('reviewBooking');
  },

  isPassengerPath(path = location.pathname) {
    return path.includes('psgninput');
  }
};
