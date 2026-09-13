(function (root) {
  root.IRCTCExt = root.IRCTCExt || {};
  if (IRCTCExt.NgetTrainList) return;

  const trainListNotImplemented = 'Classic (nget) train list booking is not implemented yet.';

  IRCTCExt.NgetTrainList = {
    async bookTrain() {
      throw new Error(trainListNotImplemented);
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
