window.IRCTCExt = window.IRCTCExt || {};

IRCTCExt.Gateways = {
  isIrctcPaymentsHost() {
    return location.hostname.includes('irctcpayments.com');
  },

  isIrctcIpayHost() {
    return location.hostname.includes('irctcipay.com');
  },

  isPhonePeHost() {
    return IRCTCExt.PhonePeGateway?.isPhonePeHost?.() || location.hostname.includes('phonepe.com');
  },

  isPhonePeGateway(config) {
    const gateway = config.state?.paymentGateway;
    const provider = IRCTCExt.BkgPayment.getPaymentProvider(config);
    const normalizedGateway = IRCTCExt.BkgPayment.normalizeProviderName(gateway);
    const normalizedProvider = IRCTCExt.BkgPayment.normalizeProviderName(provider);
    return normalizedGateway === 'phonepe' || normalizedProvider === 'phonepe';
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
    const gateway = config.state?.paymentGateway;
    const provider = IRCTCExt.BkgPayment.getPaymentProvider(config);

    if (IRCTCExt.Gateways.isIrctcPaymentsHost()) {
      return IRCTCExt.IrctcPaymentsGateway.handle(config, overlay);
    }

    if (IRCTCExt.Gateways.isPhonePeHost() && IRCTCExt.Gateways.isPhonePeGateway(config)) {
      return IRCTCExt.PhonePeGateway.handle(config, overlay);
    }

    if (IRCTCExt.Gateways.isIrctcIpayHost()) {
      if (
        gateway === 'irctcIpay' ||
        IRCTCExt.BkgPayment.isIpayProvider(gateway) ||
        IRCTCExt.BkgPayment.isIpayProvider(provider)
      ) {
        return IRCTCExt.IrctcIpayGateway.handle(config, overlay);
      }

      return IRCTCExt.Gateways.finishUnsupported(overlay, gateway || provider);
    }

    throw new Error('Unknown payment gateway host');
  }
};
