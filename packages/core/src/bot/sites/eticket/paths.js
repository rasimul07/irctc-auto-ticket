window.IRCTCExt = window.IRCTCExt || {};

IRCTCExt.EticketPaths = {
  syncStepFromPath(path, state = {}) {
    if (path.includes('bkgPaymentOptions')) return 'payment';
    if (path.includes('reviewBooking')) return 'review';
    if (path.includes('psgninput')) return state.passengersDone ? 'review' : 'passengers';
    // Redirect to /eticket/booking/train-list confirms search was submitted.
    if (IRCTCExt.EticketPaths.isTrainListPath(path)) {
      IRCTCExt.Modals?.dismissTour?.();
      return 'train-list';
    }
    // At /eticket/train-search (or home): check if not logged in.
    // If not logged in, login first (<button class="btn-login">LOGIN</button>).
    // Once login is successful (<span class="profile-name">, <img class="profile-logo">), then search.
    if (IRCTCExt.EticketPaths.isTrainSearchPath(path)) {
      const isModalOpen = !!IRCTCExt.EticketLoginFlow?.isLoginModalOpen?.();
      const hasProfile = !!IRCTCExt.EticketLoginFlow?.hasLoggedInMarker?.();
      const hasLoginBtn = !!IRCTCExt.EticketLoginFlow?.headerLoginButton?.();

      if (isModalOpen || hasLoginBtn || !hasProfile) {
        return 'login';
      }
      return 'search';
    }

    // If login form is already open or login is needed, step is login.
    if (IRCTCExt.EticketLoginFlow?.isLoginModalOpen?.() || IRCTCExt.EticketLoginFlow?.needsLogin?.()) {
      return 'login';
    }
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
    if (path.includes(IRCTCExt.EticketConfig.errorPagePath)) return true;
    if (IRCTCExt.Modals?.detectWafOrServerError?.()) return true;
    return false;
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
    return (
      path.includes(searchPath) ||
      path.includes('train-search') ||
      path === '/eticket' ||
      path === '/eticket/' ||
      path === '/eticket/home'
    );
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
