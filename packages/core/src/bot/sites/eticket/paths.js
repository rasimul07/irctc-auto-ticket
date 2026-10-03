window.IRCTCExt = window.IRCTCExt || {};

IRCTCExt.EticketPaths = {
  syncStepFromPath(path, state = {}) {
    if (path.includes('bkgPaymentOptions')) return 'payment';
    if (path.includes('reviewBooking')) return 'review';
    if (path.includes('psgninput')) return state.passengersDone ? 'review' : 'passengers';
    // Redirect to /eticket/booking/train-list confirms search was submitted.
    if (IRCTCExt.EticketPaths.isTrainListPath(path)) return 'train-list';
    // Fill journey details on train-search, then click Search.
    if (IRCTCExt.EticketPaths.isTrainSearchPath(path)) return 'search';
    return 'init';
  },

  syncProgressFromPath(path = location.pathname) {
    const updates = {};

    if (IRCTCExt.EticketPaths.isReviewPath(path) || IRCTCExt.EticketPaths.isPaymentPath(path)) {
      updates.passengersDone = true;
    }

    return updates;
  },

  isErrorPage(path = location.pathname) {
    return path.includes(IRCTCExt.EticketConfig.errorPagePath);
  },

  isTrainListPath(path = location.pathname) {
    const listPath = IRCTCExt.EticketConfig.trainListPath;
    return path.includes(listPath) || path.includes('train-list');
  },

  /** True when IRCTC navigated to train-list after Search — search submitted successfully. */
  isSearchSubmittedPath(path = location.pathname) {
    return IRCTCExt.EticketPaths.isTrainListPath(path);
  },

  isTrainSearchPath(path = location.pathname) {
    if (IRCTCExt.EticketPaths.isTrainListPath(path)) return false;
    const searchPath = IRCTCExt.EticketConfig.trainSearchPath;
    return path.includes(searchPath) || path.includes('train-search');
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
