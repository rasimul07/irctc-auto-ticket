window.IRCTCExt = window.IRCTCExt || {};

// TODO: verify nget path segments when implementing classic flow automation.
IRCTCExt.NgetPaths = {
  isGatewayHost(hostname = location.hostname) {
    const host = IRCTCExt.NgetConfig?.gatewayHost || 'pg.irctcpayments.com';
    return hostname.includes(host) || hostname.includes('irctcpayments.com');
  },

  isGatewayPath(path = location.pathname, hostname = location.hostname) {
    return IRCTCExt.NgetPaths.isGatewayHost(hostname);
  },

  isGatewayAuthRedirectPath(path = location.pathname, hostname = location.hostname) {
    if (!IRCTCExt.NgetPaths.isGatewayHost(hostname)) return false;
    const authPath = IRCTCExt.NgetConfig?.gatewayAuthRedirectPath || '/pg/api/v2/authRedirect';
    return path.includes(authPath) || path.includes('/authRedirect');
  },

  isPaymentPath(path = location.pathname) {
    return path.includes('bkgPaymentOptions') || /\/payment(?:\/|$)/i.test(path);
  },

  isReviewPath(path = location.pathname) {
    return path.includes('reviewBooking') || /\/review(?:\/|$)/i.test(path);
  },

  syncStepFromPath(path, state = {}) {
    if (IRCTCExt.NgetPaths.isGatewayPath(path)) return 'gateway';
    if (state.awaitingGateway && state.paymentPhase === 'gateway') return 'gateway';
    if (IRCTCExt.NgetPaths.isPaymentPath(path)) return 'payment';
    if (IRCTCExt.NgetPaths.isReviewPath(path)) return 'review';
    if (path.includes('psgninput')) return state.passengersDone ? 'review' : 'passengers';
    if (path.includes('train-list')) return 'train-list';
    if (path.includes('train-search')) {
      if (IRCTCExt.NgetLanguageFlow?.isLanguageModalVisible?.()) return 'language';
      if (IRCTCExt.NgetLoginFlow?.needsLogin?.()) return 'login';
      return 'search';
    }
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

  isPassengerPath(path = location.pathname) {
    return path.includes('psgninput');
  }
};
