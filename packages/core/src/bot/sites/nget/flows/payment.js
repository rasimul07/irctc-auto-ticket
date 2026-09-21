(function (root) {
  root.IRCTCExt = root.IRCTCExt || {};
  if (IRCTCExt.NgetPaymentFlow) return;

  const sharedPrefs = () => IRCTCExt.PsgnPreferences;

  // Must not use /upi/i alone — "IRCTC iPay (Credit Card/Debit Card/UPI)" also matches.
  const BHIM_UPI_USSD_SIDEBAR = /bhim\s*\/\s*upi/i;

  const CARDS_PROVIDER_MAP = {
    'irctc ipay': {
      sideMenuPattern: /irctc\s*ipay\s*\(credit/i,
      subOptionPattern: /irctc\s*ipay\s*new/i,
      sideMenuLabel: 'IRCTC iPay (credit) sidebar',
      tileLabel: 'IRCTC iPay New tile',
      gateway: 'irctcIpay'
    },
    ipay: {
      sideMenuPattern: /irctc\s*ipay\s*\(credit/i,
      subOptionPattern: /irctc\s*ipay\s*new/i,
      sideMenuLabel: 'IRCTC iPay (credit) sidebar',
      tileLabel: 'IRCTC iPay New tile',
      gateway: 'irctcIpay'
    },
    phonepe: {
      sideMenuPattern: /multiple\s*payment\s*service/i,
      subOptionPattern: /phonepe/i,
      sideMenuLabel: 'Multiple Payment Service sidebar',
      tileLabel: 'PhonePe tile',
      gateway: 'phonepe'
    }
  };

  const UPI_PROVIDER_MAP = {
    'irctc ipay': {
      sideMenuPattern: BHIM_UPI_USSD_SIDEBAR,
      subOptionPattern: /irctc\s*ipay\s*new/i,
      sideMenuLabel: 'BHIM/UPI/USSD sidebar',
      tileLabel: 'IRCTC iPay New tile',
      gateway: 'irctcIpay'
    },
    ipay: {
      sideMenuPattern: BHIM_UPI_USSD_SIDEBAR,
      subOptionPattern: /irctc\s*ipay\s*new/i,
      sideMenuLabel: 'BHIM/UPI/USSD sidebar',
      tileLabel: 'IRCTC iPay New tile',
      gateway: 'irctcIpay'
    },
    phonepe: {
      sideMenuPattern: /multiple\s*payment\s*service/i,
      subOptionPattern: /phonepe/i,
      sideMenuLabel: 'Multiple Payment Service sidebar',
      tileLabel: 'PhonePe tile',
      gateway: 'phonepe'
    },
    razorpay: {
      sideMenuPattern: /multiple\s*payment\s*service/i,
      subOptionPattern: /razorpay/i,
      sideMenuLabel: 'Multiple Payment Service sidebar',
      tileLabel: 'Razorpay tile',
      gateway: 'razorpay',
      manualGateway: true
    },
    payu: {
      sideMenuPattern: /multiple\s*payment\s*service/i,
      subOptionPattern: /payu/i,
      sideMenuLabel: 'Multiple Payment Service sidebar',
      tileLabel: 'PayU tile',
      gateway: 'payu',
      manualGateway: true
    },
    'amazon pay': {
      sideMenuPattern: BHIM_UPI_USSD_SIDEBAR,
      subOptionPattern: /amazon\s*pay/i,
      sideMenuLabel: 'BHIM/UPI/USSD sidebar',
      tileLabel: 'Amazon Pay tile',
      gateway: 'amazonpay',
      manualGateway: true
    }
  };

  IRCTCExt.NgetPaymentFlow = {
    getSelectors() {
      return IRCTCExt.SELECTORS?.payment || IRCTCExt.NgetSelectors.payment;
    },

    normalizeProviderName(name) {
      return String(name || '').trim().toLowerCase();
    },

    getProviderConfig(method, providerName) {
      const normalized = IRCTCExt.NgetPaymentFlow.normalizeProviderName(providerName);
      const map = method === 'upi' ? UPI_PROVIDER_MAP : CARDS_PROVIDER_MAP;
      const config = map[normalized];
      if (!config) {
        throw new Error(`Unsupported NGET payment provider: ${providerName || '(empty)'}`);
      }
      return config;
    },

    getPaymentProvider(config, method) {
      const prefs = config.preferences || {};
      if (method === 'upi') {
        return prefs.upiProvider || 'IRCTC iPay';
      }
      return prefs.cardsProvider || 'PhonePe';
    },

    clickTarget(el) {
      if (!el) return;
      el.scrollIntoView({ block: 'center', inline: 'nearest' });
      if (sharedPrefs()?.clickTarget) {
        sharedPrefs().clickTarget(el);
      } else {
        IRCTCExt.Events.click(el);
      }
    },

    getBankTypeLabel(item) {
      const colPad = item.querySelector('.col-pad');
      if (colPad) return (colPad.textContent || '').replace(/\s+/g, ' ').trim();
      return (item.textContent || '').replace(/\s+/g, ' ').trim();
    },

    isBankTypeActive(item) {
      return !!(item && item.classList.contains('bank-type-active'));
    },

    getPayTypeMenuRoot() {
      const sel = IRCTCExt.NgetPaymentFlow.getSelectors();
      const menu = IRCTCExt.Wait.queryOne(sel.payTypeMenu);
      return menu && IRCTCExt.Wait.isVisible(menu) ? menu : null;
    },

    findBankTypeItem(pattern) {
      const sel = IRCTCExt.NgetPaymentFlow.getSelectors();
      const root = IRCTCExt.NgetPaymentFlow.getPayTypeMenuRoot() || document;
      const items = IRCTCExt.Wait.queryAll(sel.bankTypeItem, root);
      let fallback = null;

      for (const item of items) {
        if (!IRCTCExt.Wait.isVisible(item)) continue;
        const label = IRCTCExt.NgetPaymentFlow.getBankTypeLabel(item);
        if (!pattern.test(label)) continue;
        // Prefer the BHIM/UPI/USSD row over any accidental partial match.
        if (/bhim\s*\/\s*upi/i.test(label)) return item;
        if (!fallback) fallback = item;
      }

      return fallback;
    },

    formatStepStatus(providerName, message) {
      const who = String(providerName || '').trim();
      return who ? `${who}: ${message}` : message;
    },

    async selectBankType(pattern, overlay, options = {}) {
      const { providerName, menuLabel, maxAttempts = 6 } = options;
      overlay?.setStatus(
        IRCTCExt.NgetPaymentFlow.formatStepStatus(
          providerName,
          `selecting ${menuLabel || 'payment category'}...`
        )
      );

      const item = await IRCTCExt.Wait.poll(
        () => IRCTCExt.NgetPaymentFlow.findBankTypeItem(pattern),
        { timeout: 15000, interval: 250 }
      );
      if (!item) throw new Error('Payment category not found on NGET payment page');

      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        if (IRCTCExt.NgetPaymentFlow.isBankTypeActive(item)) return true;
        IRCTCExt.NgetPaymentFlow.clickTarget(item);
        await IRCTCExt.Wait.delay(500);
        if (IRCTCExt.NgetPaymentFlow.isBankTypeActive(item)) return true;
      }

      const label = IRCTCExt.NgetPaymentFlow.getBankTypeLabel(item);
      throw new Error(`Could not select payment category on NGET payment page: ${label}`);
    },

    getBankOptionLabel(row) {
      const span = row.querySelector('span.col-pad') || row.querySelector('span');
      return (span?.textContent || row.textContent || '').replace(/\s+/g, ' ').trim();
    },

    findBankOptionClickable(row) {
      return (
        row.closest('.border-all.link') ||
        row.closest('.border-all') ||
        row.closest('td') ||
        row.parentElement
      );
    },

    findBankOption(pattern) {
      const sel = IRCTCExt.NgetPaymentFlow.getSelectors();
      const rows = IRCTCExt.Wait.queryAll(sel.bankOptionRow);
      for (const row of rows) {
        if (!IRCTCExt.Wait.isVisible(row)) continue;
        const label = IRCTCExt.NgetPaymentFlow.getBankOptionLabel(row);
        if (pattern.test(label)) {
          const clickable = IRCTCExt.NgetPaymentFlow.findBankOptionClickable(row);
          if (clickable && IRCTCExt.Wait.isVisible(clickable)) return clickable;
        }
      }

      const clickables = IRCTCExt.Wait.queryAll(sel.bankOptionClickable);
      for (const el of clickables) {
        if (!IRCTCExt.Wait.isVisible(el)) continue;
        const label = (el.textContent || '').replace(/\s+/g, ' ').trim();
        if (pattern.test(label)) return el;
      }

      return null;
    },

    async selectBankOption(pattern, overlay, options = {}) {
      const { providerName, tileLabel, maxAttempts = 6 } = options;
      overlay?.setStatus(
        IRCTCExt.NgetPaymentFlow.formatStepStatus(
          providerName,
          `selecting ${tileLabel || 'payment option'}...`
        )
      );

      const option = await IRCTCExt.Wait.poll(
        () => IRCTCExt.NgetPaymentFlow.findBankOption(pattern),
        { timeout: 15000, interval: 250 }
      );
      if (!option) {
        throw new Error(
          `Payment option not found on NGET payment page${tileLabel ? `: ${tileLabel}` : ''}`
        );
      }

      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        IRCTCExt.NgetPaymentFlow.clickTarget(option);
        await IRCTCExt.Wait.delay(350);
        return true;
      }

      throw new Error('Could not select payment option on NGET payment page');
    },

    isPayAndBookEnabled(btn) {
      if (!btn || !IRCTCExt.Wait.isVisible(btn)) return false;
      if (btn.disabled) return false;
      if (btn.classList.contains('disabled')) return false;
      if (btn.getAttribute('aria-disabled') === 'true') return false;
      return true;
    },

    findPayAndBookButton(root = document) {
      const sel = IRCTCExt.NgetPaymentFlow.getSelectors();
      const buttons = root.querySelectorAll(sel.payAndBookBtn?.[0] || 'button.btn.btn-primary');
      for (const btn of buttons) {
        if (
          IRCTCExt.NgetPaymentFlow.isPayAndBookEnabled(btn) &&
          /pay\s*&\s*book/i.test(btn.textContent || '')
        ) {
          return btn;
        }
      }

      const fallback = root.querySelectorAll('button.btn-primary, button.btn.btn-primary');
      for (const btn of fallback) {
        if (
          IRCTCExt.NgetPaymentFlow.isPayAndBookEnabled(btn) &&
          /pay\s*&\s*book/i.test(btn.textContent || '')
        ) {
          return btn;
        }
      }

      return null;
    },

    async clickPayAndBook(overlay, providerName = '') {
      overlay?.setStatus(
        IRCTCExt.NgetPaymentFlow.formatStepStatus(providerName, 'clicking Pay & Book...')
      );

      const payBtn = await IRCTCExt.Wait.poll(
        () => IRCTCExt.NgetPaymentFlow.findPayAndBookButton(document),
        { timeout: 15000, interval: 250 }
      );
      if (!payBtn) throw new Error('Pay & Book button not found on NGET payment page');

      IRCTCExt.NgetPaymentFlow.clickTarget(payBtn);
      await IRCTCExt.Wait.delay(600);
      return true;
    },

    async waitForPaymentPage() {
      const sel = IRCTCExt.NgetPaymentFlow.getSelectors();
      await IRCTCExt.Wait.poll(
        () => IRCTCExt.Wait.queryOne(sel.payTypeMenu) && IRCTCExt.Wait.isVisible(IRCTCExt.Wait.queryOne(sel.payTypeMenu)),
        { timeout: 15000, interval: 250 }
      );
    },

    async runProviderFlow(config, overlay, method) {
      const providerName = IRCTCExt.NgetPaymentFlow.getPaymentProvider(config, method);
      const providerConfig = IRCTCExt.NgetPaymentFlow.getProviderConfig(method, providerName);

      await IRCTCExt.NgetPaymentFlow.waitForPaymentPage();
      await IRCTCExt.Wait.delay(400);

      const stepContext = {
        providerName,
        menuLabel: providerConfig.sideMenuLabel,
        tileLabel: providerConfig.tileLabel
      };

      await IRCTCExt.NgetPaymentFlow.selectBankType(providerConfig.sideMenuPattern, overlay, stepContext);
      await IRCTCExt.Wait.delay(600);
      await IRCTCExt.NgetPaymentFlow.selectBankOption(providerConfig.subOptionPattern, overlay, stepContext);
      await IRCTCExt.Wait.delay(400);

      if (providerConfig.manualGateway) {
        await IRCTCExt.NgetPaymentFlow.clickPayAndBook(overlay, providerName);
        overlay?.setStatus(
          IRCTCExt.NgetPaymentFlow.formatStepStatus(
            providerName,
            'complete payment on gateway manually'
          )
        );
        return { awaitingGateway: false };
      }

      await IRCTCExt.Storage.updateState({
        running: true,
        status: 'running',
        paymentPhase: 'gateway',
        paymentGateway: providerConfig.gateway,
        gatewayPaymentMethod: method,
        awaitingGateway: true,
        currentStep: 'gateway'
      });

      await IRCTCExt.NgetPaymentFlow.clickPayAndBook(overlay, providerName);
      overlay?.setStatus(
        IRCTCExt.NgetPaymentFlow.formatStepStatus(providerName, 'redirecting to payment gateway...')
      );

      return {
        awaitingGateway: true,
        gateway: providerConfig.gateway
      };
    },

    async handleCards(config, overlay) {
      return IRCTCExt.NgetPaymentFlow.runProviderFlow(config, overlay, 'cards');
    },

    async handleUpi(config, overlay) {
      return IRCTCExt.NgetPaymentFlow.runProviderFlow(config, overlay, 'upi');
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
