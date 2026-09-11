window.IRCTCExt = window.IRCTCExt || {};

IRCTCExt.EticketSite = {
  ...IRCTCExt.EticketConfig,
  selectors: IRCTCExt.EticketSelectors,
  syncStepFromPath: IRCTCExt.EticketPaths.syncStepFromPath.bind(IRCTCExt.EticketPaths),
  isErrorPage: IRCTCExt.EticketPaths.isErrorPage.bind(IRCTCExt.EticketPaths),
  isTrainListPath: IRCTCExt.EticketPaths.isTrainListPath.bind(IRCTCExt.EticketPaths),
  isTrainSearchPath: IRCTCExt.EticketPaths.isTrainSearchPath.bind(IRCTCExt.EticketPaths),
  isPaymentPath: IRCTCExt.EticketPaths.isPaymentPath.bind(IRCTCExt.EticketPaths),
  isReviewPath: IRCTCExt.EticketPaths.isReviewPath.bind(IRCTCExt.EticketPaths),
  isPassengerPath: IRCTCExt.EticketPaths.isPassengerPath.bind(IRCTCExt.EticketPaths),
  flows: {
    LoginFlow: IRCTCExt.EticketLoginFlow,
    SearchFlow: IRCTCExt.EticketSearchFlow,
    BookingFlow: IRCTCExt.EticketBookingFlow
  },
  TrainList: IRCTCExt.EticketTrainList
};

IRCTCExt.SiteRegistry?.register(IRCTCExt.EticketSite);
