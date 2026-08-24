window.IRCTCExt = window.IRCTCExt || {};

IRCTCExt.Gateways = {
  isIrctcIpayHost() {
    return location.hostname.includes('irctcipay.com');
  },

  async finishUnsupported(overlay, provider) {
    await IRCTCExt.Storage.updateState({
      paymentDone: true,
      paymentPhase: null,
      awaitingGateway: false,
      paymentGateway: null,
      status: 'done',
      running: false,
      currentStep: 'done'
    });
    const message = `Gateway automation not implemented for ${provider || 'this provider'}. Complete payment manually.`;
    overlay?.setStep('Payment');
    overlay?.setStatus(message);
    overlay?.showPause(message);
    return true;
  },

  async run(config, overlay) {
    if (!IRCTCExt.Gateways.isIrctcIpayHost()) {
      throw new Error('Unknown payment gateway host');
    }

    const gateway = config.state?.paymentGateway;
    const provider = IRCTCExt.BkgPayment.getPaymentProvider(config);

    if (
      gateway === 'irctcIpay' ||
      IRCTCExt.BkgPayment.isIpayProvider(gateway) ||
      IRCTCExt.BkgPayment.isIpayProvider(provider)
    ) {
      return IRCTCExt.IrctcIpayGateway.handle(config, overlay);
    }

    return IRCTCExt.Gateways.finishUnsupported(overlay, gateway || provider);
  }
};
