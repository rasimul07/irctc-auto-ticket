window.IRCTCExt = window.IRCTCExt || {};



IRCTCExt.BkgPayment = {

  normalizeProviderName(name) {

    return String(name || '').trim().toLowerCase();

  },



  isIpayProvider(providerName) {

    const normalized = IRCTCExt.BkgPayment.normalizeProviderName(providerName);

    return normalized === 'irctc ipay' || normalized === 'ipay';

  },



  getPaymentProvider(config) {

    const method = config.preferences?.paymentMethod || 'cards';

    if (method === 'upi') {

      return config.preferences?.upiProvider || 'IRCTC iPay';

    }
    if (method === 'cards') {
      return config.preferences?.cardsProvider || 'PhonePe';
    }
    return 'IRCTC iPay';
  },



  clickTarget(el) {

    if (!el) return;

    el.scrollIntoView({ block: 'center', inline: 'nearest' });

    IRCTCExt.Events.click(el);

  },



  getBankCellLabel(cell) {

    const span = cell.querySelector('span');

    const logo = cell.querySelector('img.bank-logo');

    return (span?.textContent || logo?.getAttribute('alt') || '').trim();

  },



  isProviderSelected(cell) {

    if (!cell) return false;

    const sel = IRCTCExt.SELECTORS.payment;

    const card = cell.querySelector(sel.bankCard?.[0] || '.bank-card');

    if (card?.classList.contains('bank-selected')) return true;

    if (cell.classList.contains('bank-selected')) return true;

    return false;

  },



  getBankCellClickTargets(cell) {

    const sel = IRCTCExt.SELECTORS.payment;

    const targets = [cell];

    const card = cell.querySelector(sel.bankCard?.[0] || '.bank-card');

    const logo = cell.querySelector(sel.bankLogo?.[0] || 'img.bank-logo');

    const label = cell.querySelector('span');

    if (card) targets.push(card);

    if (logo) targets.push(logo);

    if (label) targets.push(label);

    return targets;

  },



  findBankCell(providerName) {

    const target = IRCTCExt.BkgPayment.normalizeProviderName(providerName);

    if (!target) return null;



    const sel = IRCTCExt.SELECTORS.payment;

    const cells = document.querySelectorAll(sel.bankCell?.[0] || '.bank-cell');



    for (const cell of cells) {

      if (!IRCTCExt.Wait.isVisible(cell)) continue;

      const label = IRCTCExt.BkgPayment.normalizeProviderName(

        IRCTCExt.BkgPayment.getBankCellLabel(cell)

      );

      if (label === target) return cell;

    }



    return null;

  },



  findIpayCard() {
    const sel = IRCTCExt.SELECTORS.payment;
    const card = IRCTCExt.Wait.queryOne(sel.ipayCard, document);
    if (card && IRCTCExt.Wait.isVisible(card)) return card;
    return null;
  },

  isIpayCardSelected() {
    const card = IRCTCExt.BkgPayment.findIpayCard();
    return !!card?.classList.contains('bank-selected');
  },

  async ensureIpayCardSelected(maxAttempts = 6) {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      if (IRCTCExt.BkgPayment.isIpayCardSelected()) return true;

      const card = IRCTCExt.BkgPayment.findIpayCard();
      if (!card) throw new Error('IRCTC iPay card not found');

      IRCTCExt.BkgPayment.clickTarget(card);
      await IRCTCExt.Wait.delay(350);
    }

    if (!IRCTCExt.BkgPayment.isIpayCardSelected()) {
      throw new Error('Could not select IRCTC iPay card');
    }

    return true;
  },

  findIpayClickToPayButton() {
    const sel = IRCTCExt.SELECTORS.payment;
    const buttons = document.querySelectorAll(sel.ipayClickToPay?.[0] || 'button.ipay-qr-button');

    for (const btn of buttons) {
      if (IRCTCExt.Wait.isVisible(btn) && /click\s*to\s*pay/i.test(btn.textContent || '')) {
        return btn;
      }
    }

    return null;
  },

  async clickIpay(overlay) {
    const sel = IRCTCExt.SELECTORS.payment;
    overlay?.setStatus('Selecting IRCTC iPay...');

    await IRCTCExt.Wait.waitFor(sel.paymentWrapper, { timeout: 15000, visible: true });

    await IRCTCExt.BkgPayment.ensureIpayCardSelected();

    const clickBtn = await IRCTCExt.Wait.poll(
      () => IRCTCExt.BkgPayment.findIpayClickToPayButton(),
      { timeout: 15000, interval: 200 }
    );

    if (!clickBtn) throw new Error('IRCTC iPay "Click to pay" button not found');

    for (let attempt = 0; attempt < 6; attempt += 1) {
      IRCTCExt.BkgPayment.clickTarget(clickBtn);
      await IRCTCExt.Wait.delay(350);
    }

    return true;
  },



  async clickBankProvider(providerName, overlay, maxAttempts = 6) {
    overlay?.setStatus(`Selecting ${providerName}...`);
    await IRCTCExt.Wait.waitFor(IRCTCExt.SELECTORS.payment.paymentWrapper, {

      timeout: 15000,

      visible: true

    });



    const cell = await IRCTCExt.Wait.poll(

      () => IRCTCExt.BkgPayment.findBankCell(providerName),

      { timeout: 15000, interval: 200 }

    );



    if (!cell) throw new Error(`Payment provider not found: ${providerName}`);



    const targets = IRCTCExt.BkgPayment.getBankCellClickTargets(cell);



    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {

      if (IRCTCExt.BkgPayment.isProviderSelected(cell)) return true;



      for (const target of targets) {

        IRCTCExt.BkgPayment.clickTarget(target);

        await IRCTCExt.Wait.delay(200);

        if (IRCTCExt.BkgPayment.isProviderSelected(cell)) return true;

      }



      await IRCTCExt.Wait.delay(350);

    }



    throw new Error(`Could not select payment provider: ${providerName}`);

  },



  isPayAndBookEnabled(btn) {

    if (!btn) return false;

    if (btn.disabled) return false;

    if (btn.classList.contains('disabled')) return false;

    if (btn.getAttribute('aria-disabled') === 'true') return false;

    return IRCTCExt.Wait.isVisible(btn);

  },



  findPayAndBookButton(root = document) {

    const sel = IRCTCExt.SELECTORS.payment;

    const roots = [

      root.querySelector(sel.paymentWrapper?.[0] || 'app-payment'),

      root.querySelector('.payment-wrapper'),

      root

    ].filter(Boolean);



    for (const searchRoot of roots) {

      const buttons = searchRoot.querySelectorAll(sel.payAndBookBtn?.[0] || 'button.btn-payment');

      for (const btn of buttons) {

        if (

          IRCTCExt.BkgPayment.isPayAndBookEnabled(btn) &&

          /pay\s*&\s*book/i.test(btn.textContent || '')

        ) {

          return btn;

        }

      }

    }



    const fallbackButtons = root.querySelectorAll('button.btn-payment, button.btn.btn-payment');

    for (const btn of fallbackButtons) {

      if (

        IRCTCExt.BkgPayment.isPayAndBookEnabled(btn) &&

        /pay\s*&\s*book/i.test(btn.textContent || '')

      ) {

        return btn;

      }

    }



    return null;

  },



  async clickPayAndBook(overlay) {

    overlay?.setStatus('Clicking Pay & Book...');



    const payBtn = await IRCTCExt.Wait.poll(

      () => IRCTCExt.BkgPayment.findPayAndBookButton(document),

      { timeout: 15000, interval: 200 }

    );



    if (!payBtn) throw new Error('Pay & Book button not found');



    IRCTCExt.BkgPayment.clickTarget(payBtn);

    await IRCTCExt.Wait.delay(600);

    return true;

  },



  async handleUpiPayment(config, overlay) {
    const provider = IRCTCExt.BkgPayment.getPaymentProvider(config);
    overlay?.setStatus(`Selecting UPI provider: ${provider}...`);

    if (IRCTCExt.BkgPayment.isIpayProvider(provider)) {
      return IRCTCExt.BkgPayment.clickIpay(overlay);
    }

    await IRCTCExt.BkgPayment.clickBankProvider(provider, overlay);
    await IRCTCExt.BkgPayment.clickPayAndBook(overlay);
    overlay?.setStatus('Pay & Book clicked. Complete payment on gateway.');
    return true;
  },

  async handleCardsPayment(config, overlay) {
    const provider = IRCTCExt.BkgPayment.getPaymentProvider(config);

    overlay?.setStatus(`Selecting cards provider: ${provider}...`);
    if (IRCTCExt.BkgPayment.isIpayProvider(provider)) {
      await IRCTCExt.BkgPayment.ensureIpayCardSelected();
    } else {
      await IRCTCExt.BkgPayment.clickBankProvider(provider, overlay);
    }

    await IRCTCExt.Storage.updateState({
      paymentPhase: 'gateway',
      paymentGateway: IRCTCExt.BkgPayment.isIpayProvider(provider) ? 'irctcIpay' : provider,
      awaitingGateway: true
    });

    overlay?.setStatus('Clicking Pay & Book...');
    await IRCTCExt.BkgPayment.clickPayAndBook(overlay);
    overlay?.setStatus('Redirecting to payment gateway...');
    return {
      awaitingGateway: true,
      gateway: IRCTCExt.BkgPayment.isIpayProvider(provider) ? 'irctcIpay' : provider
    };
  },

  getAutoPaySettings(config) {
    const prefs = config.preferences || {};
    const type = prefs.autoPayType || 'debit';
    return {
      enabled: !!prefs.autoPayEnabled,
      type,
      card:
        type === 'credit'
          ? prefs.creditCard
          : type === 'debit'
            ? prefs.debitCard
            : null
    };
  },

  async selectPaymentProvider(config, overlay) {
    const method = config.preferences?.paymentMethod || 'cards';
    if (method === 'upi') return IRCTCExt.BkgPayment.handleUpiPayment(config, overlay);
    return IRCTCExt.BkgPayment.handleCardsPayment(config, overlay);
  }

};

