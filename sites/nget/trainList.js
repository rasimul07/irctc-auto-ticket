window.IRCTCExt = window.IRCTCExt || {};

const NGET_NOT_IMPLEMENTED = 'Classic (nget) booking is not implemented yet.';

IRCTCExt.NgetTrainList = {
  async bookTrain() {
    throw new Error(NGET_NOT_IMPLEMENTED);
  }
};
