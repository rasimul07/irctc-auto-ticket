window.IRCTCExt = window.IRCTCExt || {};

IRCTCExt.NgetSite = {
  ...IRCTCExt.NgetConfig,
  selectors: IRCTCExt.NgetSelectors,
  syncStepFromPath: IRCTCExt.NgetPaths.syncStepFromPath.bind(IRCTCExt.NgetPaths),
  isErrorPage: IRCTCExt.NgetPaths.isErrorPage.bind(IRCTCExt.NgetPaths),
  isTrainListPath: IRCTCExt.NgetPaths.isTrainListPath.bind(IRCTCExt.NgetPaths),
  isTrainSearchPath: IRCTCExt.NgetPaths.isTrainSearchPath.bind(IRCTCExt.NgetPaths),
  isPaymentPath: IRCTCExt.NgetPaths.isPaymentPath.bind(IRCTCExt.NgetPaths),
  isReviewPath: IRCTCExt.NgetPaths.isReviewPath.bind(IRCTCExt.NgetPaths),
  isPassengerPath: IRCTCExt.NgetPaths.isPassengerPath.bind(IRCTCExt.NgetPaths),
  flows: {
    LoginFlow: IRCTCExt.NgetLoginFlow,
    SearchFlow: IRCTCExt.NgetSearchFlow,
    BookingFlow: IRCTCExt.NgetBookingFlow
  },
  TrainList: IRCTCExt.NgetTrainList
};

IRCTCExt.SiteRegistry?.register(IRCTCExt.NgetSite);
