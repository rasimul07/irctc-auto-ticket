window.IRCTCExt = window.IRCTCExt || {};

// TODO: verify nget path segments when implementing classic flow automation.
IRCTCExt.NgetPaths = {
  syncStepFromPath(path, state = {}) {
    if (path.includes('payment')) return 'payment';
    if (path.includes('review')) return 'review';
    if (path.includes('psgninput')) return state.passengersDone ? 'review' : 'passengers';
    if (path.includes('train-list')) return 'train-list';
    if (path.includes('train-search')) return 'search';
    return 'init';
  },

  isErrorPage(path = location.pathname) {
    return path.includes(IRCTCExt.NgetConfig.errorPagePath);
  },

  isTrainListPath(path = location.pathname) {
    return path.includes('train-list');
  },

  isTrainSearchPath(path = location.pathname) {
    return path.includes('train-search');
  },

  isPaymentPath(path = location.pathname) {
    return path.includes('payment');
  },

  isReviewPath(path = location.pathname) {
    return path.includes('review');
  },

  isPassengerPath(path = location.pathname) {
    return path.includes('psgninput');
  }
};
