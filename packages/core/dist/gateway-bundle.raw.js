(function (root) {
  root.IRCTCExt = root.IRCTCExt || {};

  const STORAGE_KEY = 'irctcConfig';

  const DEFAULT_CONFIG = {
    credentials: { username: '', password: '' },
    journey: {
      from: '',
      fromCode: '',
      to: '',
      toCode: '',
      date: '',
      trainNo: '',
      trainName: '',
      travelClass: 'SL',
      quota: 'TATKAL'
    },
    passengers: [{ name: '', age: '', gender: '', berth: 'No Preference', food: '' }],
    schedule: { enabled: false, type: 'non-ac' },
    preferences: {
      bookingSite: 'eticket',
      loyaltyChoice: 'skip',
      paymentMethod: 'cards',
      cardsProvider: 'PhonePe',
      upiProvider: 'IRCTC iPay',
      debitCard: { name: '', number: '', expiry: '', cvv: '' },
      creditCard: { name: '', number: '', expiry: '', cvv: '' },
      autoPayEnabled: false,
      autoPayType: 'debit'
    },
    access: { deviceId: '', email: '', apiBase: '', status: null },
    state: {
      status: 'idle',
      lastRun: null,
      currentStep: 'init',
      running: false,
      paused: false,
      message: '',
      passengersDone: false,
      paymentDone: false,
      autoRestartCount: 0,
      paymentPhase: null,
      paymentGateway: null,
      awaitingGateway: false,
      bookingSessionId: null,
      tokenConsumed: false
    }
  };

  let cachedConfig = null;

  function mergeConfig(current, partial) {
    const next = { ...current, ...partial };
    if (partial.journey) next.journey = { ...current.journey, ...partial.journey };
    if (partial.credentials) next.credentials = { ...current.credentials, ...partial.credentials };
    if (partial.schedule) next.schedule = { ...current.schedule, ...partial.schedule };
    if (partial.preferences) next.preferences = { ...current.preferences, ...partial.preferences };
    if (partial.access) next.access = { ...current.access, ...partial.access };
    if (partial.state) next.state = { ...current.state, ...partial.state };
    if (partial.passengers) next.passengers = partial.passengers;
    return next;
  }

  function postToHost(msg) {
    const payload = { source: 'irctc-bot', ...msg };
    const json = JSON.stringify(payload);
    if (window.IrctcBotBridge?.postMessage) {
      window.IrctcBotBridge.postMessage(json);
      return;
    }
    if (window.webkit?.messageHandlers?.IrctcBotBridge) {
      window.webkit.messageHandlers.IrctcBotBridge.postMessage(json);
      return;
    }
    if (window.parent !== window) {
      window.parent.postMessage(payload, '*');
    }
  }

  function requestConfig() {
    return new Promise((resolve) => {
      const handler = (event) => {
        if (event.data?.source === 'irctc-host' && event.data.type === 'CONFIG_DATA') {
          window.removeEventListener('message', handler);
          resolve(event.data.config || null);
        }
      };
      window.addEventListener('message', handler);
      postToHost({ type: 'GET_CONFIG' });
      setTimeout(() => {
        window.removeEventListener('message', handler);
        resolve(cachedConfig);
      }, 3000);
    });
  }

  IRCTCExt.Storage = {
    _cachedConfig: null,

    async get() {
      if (cachedConfig) {
        IRCTCExt.Storage._cachedConfig = cachedConfig;
        return { ...JSON.parse(JSON.stringify(DEFAULT_CONFIG)), ...cachedConfig };
      }
      const remote = await requestConfig();
      if (remote) {
        cachedConfig = remote;
        IRCTCExt.Storage._cachedConfig = remote;
        return { ...JSON.parse(JSON.stringify(DEFAULT_CONFIG)), ...remote };
      }
      return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    },

    async set(config) {
      cachedConfig = config;
      IRCTCExt.Storage._cachedConfig = config;
      postToHost({ type: 'SET_CONFIG', config });
    },

    async update(partial) {
      const current = await IRCTCExt.Storage.get();
      const next = mergeConfig(current, partial);
      await IRCTCExt.Storage.set(next);
      return next;
    },

    async updateState(updates) {
      const current = await IRCTCExt.Storage.get();
      current.state = { ...current.state, ...updates };
      await IRCTCExt.Storage.set(current);
      return current;
    },

    async clear() {
      cachedConfig = null;
      IRCTCExt.Storage._cachedConfig = null;
    },

    setCachedConfig(config) {
      cachedConfig = config;
      IRCTCExt.Storage._cachedConfig = config;
    }
  };

  IRCTCExt.PlatformBridge = {
    async sendMessage(type, payload = {}) {
      return new Promise((resolve) => {
        const requestId = crypto.randomUUID();
        const handler = (event) => {
          const data = event.data;
          if (data?.source === 'irctc-host' && data.type === 'RESPONSE' && data.requestId === requestId) {
            window.removeEventListener('message', handler);
            resolve(data);
          }
        };
        window.addEventListener('message', handler);
        postToHost({ type, requestId, ...payload });
        setTimeout(() => {
          window.removeEventListener('message', handler);
          resolve(null);
        }, 15000);
      });
    },

    onMessage(handler) {
      window.addEventListener('message', (event) => {
        const data = event.data;
        if (!data || data.source !== 'irctc-host') return;
        if (data.type === 'CONFIG_DATA') {
          IRCTCExt.Storage.setCachedConfig(data.config);
          return;
        }
        handler(data, (response) => {
          postToHost({
            type: 'RESPONSE',
            requestType: data.type,
            requestId: data.requestId,
            ...response
          });
        });
      });
    }
  };

  IRCTCExt.PlatformBridge.onMessage(() => {});
})(typeof globalThis !== 'undefined' ? globalThis : window);

;
window.IRCTCExt = window.IRCTCExt || {};

IRCTCExt.EticketSelectors = {
  loginHeaderBtn: [
    'nav button.btn-login',
    '.navbar-actions button.btn-login',
    'header button.btn-login',
    'button.btn-login'
  ],
  loginModal: [
    '#newLogin',
    '.login-dialog',
    '.login-wrapper'
  ],
  loginUserTab: [
    '.login-tab.active',
    '.login-tab'
  ],
  loginUsername: [
    '.login-form .field-block .field-input',
    '.login-form input[placeholder*="Username"]',
    '.login-form input[placeholder*="username"]',
    'input[formcontrolname="userid"]',
    'input[placeholder*="User"]',
    'input[name="userId"]'
  ],
  loginPassword: [
    '.login-form .password-field .field-input',
    '.login-form input[type="password"]',
    'input[formcontrolname="password"]',
    'input[type="password"]'
  ],
  loginCaptcha: [
    '.login-form input[placeholder*="Captcha"]',
    '.login-form input[placeholder*="CAPTCHA"]',
    'input[formcontrolname="captcha"]',
    'input[placeholder*="Captcha"]',
    'input[placeholder*="CAPTCHA"]'
  ],
  loginSubmit: [
    '.login-form .btn-action.btn-login',
    '.login-wrapper .btn-action.btn-login',
    '#newLogin .btn-action.btn-login',
    'button.search_btn',
    'button[type="submit"].search_btn',
    'a.search_btn.loginText'
  ],
  loggedInProfile: [
    '.nav-link-1'
  ],
  searchFrom: [
    'div.field-box[aria-label="From station"]',
    'p-autocomplete#origin input',
    'input[placeholder="FROM *"]'
  ],
  searchTo: [
    'div.field-box[aria-label="To station"]',
    'p-autocomplete#destination input',
    'input[placeholder="TO *"]'
  ],
  searchDate: [
    'div.field-box[aria-label="Select travel date"]',
    'p-calendar#journeyDate input',
    'input[placeholder="DD/MM/YYYY *"]'
  ],
  searchClass: [
    'p-dropdown[formcontrolname="journeyClass"]',
    'p-dropdown[formcontrolname="journeyClass"] .ui-dropdown-trigger'
  ],
  searchQuota: [
    'div.field-box[aria-label="Quota"]',
    'p-dropdown#journeyQuota',
    'p-dropdown[formcontrolname="journeyQuota"]',
    'p-dropdown[formcontrolname="journeyQuota"] .ui-dropdown-trigger'
  ],
  searchButton: [
    'app-jp-input button.search-btn[type="submit"]',
    'button.search-btn[type="submit"]',
    'button.search_btn',
    'button[type="submit"].search_btn'
  ],
  stationSearchInput: [
    'div.field-box[aria-expanded="true"] input',
    'div.field-box[aria-expanded="true"] .field-input',
    '.custom-dropdown-panel .station-search-input',
    '.custom-dropdown-panel input',
    '.custom-dropdown-panel .field-input',
    'input.station-search-input',
    'input[placeholder*="Station"]',
    'input[placeholder*="station"]',
    'input[placeholder*="Search"]',
    'input[placeholder*="Type"]'
  ],
  customStationPanel: [
    '.custom-dropdown-panel'
  ],
  customStationOptions: [
    '.custom-dropdown-panel .custom-option',
    '[role="listbox"] [role="option"]',
    '.custom-option'
  ],
  customQuotaOptions: [
    '.custom-dropdown-panel-quota .custom-option',
    '.custom-dropdown-panel .custom-option',
    '[role="listbox"] [role="option"]',
    'div.field-box[aria-label="Quota"][aria-expanded="true"] + .custom-dropdown-panel .custom-option'
  ],
  calendarPanel: [
    '.custom-calendar-panel .ui-datepicker',
    '.ui-datepicker'
  ],
  autocompletePanel: [
    '.custom-dropdown-panel .custom-option',
    '.ui-autocomplete-panel li',
    'ul.ui-autocomplete-items li',
    '.p-autocomplete-panel li'
  ],
  dropdownPanel: [
    '.custom-dropdown-panel-quota .custom-option',
    '.custom-dropdown-panel .custom-option',
    '.ui-dropdown-panel li',
    '.p-dropdown-panel li',
    'ul.ui-dropdown-items li',
    '.ap-dropdown-panel li',
    '.ap-dropdown-panel .ui-dropdown-item'
  ],
  trainList: {
    container: ['.train-list-container', 'app-train-list-panel', 'app-train-list', 'app-train-avl-enq .train-listing'],
    trainCard: ['app-train-avl-enq'],
    trainListing: ['.train-listing'],
    trainCardMain: ['.train-card__main'],
    trainNumber: ['.train-number'],
    trainName: ['.train-name'],
    dateBadge: ['.train-dates .date-badge'],
    availabilityBtn: ['button.btn-availability'],
    refreshAvailabilityBtn: [
      'button.btn-availability.btn-availability--outline',
      'button.btn-availability'
    ],
    classRefreshIcon: [
      '.class-card .sync-icon.fa-repeat',
      '[aria-label="Refresh availability"]'
    ],
    availableClasses: ['.available-classes'],
    classCard: ['.class-card'],
    classCode: ['.class-code'],
    classStatus: ['.class-status'],
    bookBtn: ['button.btn-book'],
    scrollNext: ['.btn-scroll-next'],
    trainHeading: ['.train-heading strong'],
    classCell: ['div.pre-avl'],
    bookNowBtn: ['button.train_Search'],
    bookNowEnabled: ['button.train_Search:not(.disable-book)']
  },
  passengerName: [
    'input[formcontrolname="passengerName"]',
    'input[placeholder*="Name"]'
  ],
  passengerAge: [
    'input[formcontrolname="passengerAge"]',
    'input[placeholder*="Age"]'
  ],
  passengerGender: [
    'p-dropdown[formcontrolname="passengerGender"]',
    'select[formcontrolname="passengerGender"]'
  ],
  passengerBerth: [
    'p-dropdown[formcontrolname="passengerBerthChoice"]',
    'p-dropdown[formcontrolname="berthChoice"]'
  ],
  passengerFood: [
    'p-dropdown[formcontrolname="passengerFoodChoice"]',
    'p-dropdown[formcontrolname="foodChoice"]'
  ],
  continueBtn: [
    'button.train_Search',
    'button.search_btn',
    'button[type="submit"]'
  ],
  paymentOptions: [
    '.bank-type',
    '.payment-opt',
    'input[type="radio"]'
  ],
  termsCheckbox: [
    'input[type="checkbox"]',
    '.ui-chkbox input'
  ],
  passengers: {
    bookConfirmOverlay: ['.bc-overlay', 'app-book-now-confirmation .bc-card'],
    bookConfirmContinue: ['.bc-btn-continue', 'button.bc-btn-continue'],
    existingPassengerBtn: ['button.btn-existing'],
    existingModal: ['.ep-modal-mask', 'section.ep-modal-panel[role="dialog"]'],
    existingModalTitle: ['#existingPassengerTitle.ep-title', '.ep-title'],
    existingPassengerRow: ['.ep-passenger-row:not(.ep-passenger-row--disabled)'],
    existingPassengerCheckbox: ['.ep-passenger-row .ui-chkbox-box', '.ep-passenger-row input[type="checkbox"]'],
    existingPassengerName: ['.ep-passenger-name'],
    existingPassengerDetails: ['.ep-passenger-details'],
    existingPassengerAddBtn: ['button.ep-add-btn', 'button.ep-add-btn.app-modal-button--primary'],
    existingPassengerCancelBtn: ['button.app-modal-button--cancel'],
    passengerListContainer: ['.passenger-list', 'app-passenger-list'],
    passengerListCard: ['.passenger-list .passenger-card', 'app-passenger-list .passenger-card'],
    passengerCardName: ['.passenger-name'],
    passengerCardDetails: ['.passenger-detail-row'],
    passengerEditBtn: ['.action-icons img[alt="Edit"]', '.action-icon[alt="Edit"]'],
    passengerDeleteBtn: ['.action-icons img[alt="Delete"]', '.action-icon[alt="Delete"]'],
    passengerDeleteConfirmBtn: ['button.app-modal-button--primary', 'button.ui-button-danger'],
    editPassengerModal: ['.add-passenger-dialog .ap-container', '.ap-container'],
    editPassengerSaveBtn: ['button.ap-add-btn.app-modal-button--primary', 'button.ap-add-btn'],
    newPassengerBtn: ['button.btn-new-passenger'],
    newPassengerModal: ['.ap-container', '.ui-dialog-content .ap-container'],
    newPassengerTitle: ['.ap-title'],
    newPassengerName: [
      'p-autocomplete[formcontrolname="passengerName"] input',
      'input[formcontrolname="passengerName"]'
    ],
    newPassengerAge: ['input[formcontrolname="passengerAge"]'],
    newPassengerGender: [
      'p-dropdown[formcontrolname="passengerGender"] .ui-dropdown-trigger',
      'p-dropdown[formcontrolname="passengerGender"]'
    ],
    newPassengerBerth: [
      'p-dropdown[formcontrolname="passengerBerthChoice"] .ui-dropdown-trigger',
      'p-dropdown[formcontrolname="passengerBerthChoice"]'
    ],
    newPassengerFood: [
      'p-dropdown[formcontrolname="passengerFoodChoice"] .ui-dropdown-trigger',
      'p-dropdown[formcontrolname="passengerFoodChoice"]'
    ],
    newPassengerNationality: [
      'p-dropdown[formcontrolname="passengerNationality"] .ui-dropdown-trigger',
      'p-dropdown[formcontrolname="passengerNationality"]'
    ],
    passengerDropdownItem: [
      '.ap-dropdown-panel .ui-dropdown-item',
      '.ap-dropdown-panel li.ui-dropdown-item',
      '.ui-dropdown-panel .ui-dropdown-item',
      '.ui-dropdown-panel li.ui-dropdown-item'
    ],
    newPassengerAddBtn: ['button.ap-add-btn.app-modal-button--primary', 'button.ap-add-btn'],
    newPassengerCancelBtn: ['.ap-dialog-actions button.app-modal-button--cancel']
  },
  psgnPreferences: {
    loyaltySection: ['app-loyalty-selection'],
    loyaltySkip: ['#lo-3', 'label[for="lo-3"]', 'input[name="loyalityOperationType"][value="3"]'],
    paymentSection: ['app-booking-payment-preferences'],
    paymentCards: ['#payment-option-0', 'input[name="payment"][value="3"]'],
    paymentUpi: ['#payment-option-1', 'input[name="payment"][value="2"]'],
    calculateFareBtn: ['button.btn-calc-fare', '.review-actions button.btn-calc-fare'],
    continueToPaymentBtn: ['button.btn-payment', '.cta-row button.btn-payment'],
    availabilityStatus: ['.availability-status-group .available-count', '.availability-status-group .AVAILABLE'],
    reviewConfirmHost: ['app-book-now-confirmation'],
    reviewConfirmCard: ['app-book-now-confirmation .bc-card', '.bc-card'],
    reviewConfirmContinue: ['.bc-btn-continue', 'button.bc-btn-continue'],
    reviewConfirmTitle: ['.bc-title']
  },
  modals: {
    sessionRestoreHost: ['app-book-now-confirmation'],
    sessionRestoreOverlay: ['app-book-now-confirmation .bc-overlay', '.bc-overlay'],
    sessionRestoreCard: ['.bc-card', 'app-book-now-confirmation .bc-card'],
    sessionRestoreTitle: ['.bc-title'],
    sessionRestoreMessage: ['.bc-section-label']
  },
  payment: {
    bookingReviewBlock: ['.booking-review-block'],
    excludeFromClone: ['.payment-action-row', '.header-icon-btn', 'button.btn-payment'],
    paymentWrapper: ['app-payment', '.payment-wrapper'],
    ipayClickToPay: ['button.ipay-qr-button'],
    ipayCard: ['.ipay-card', '.payment-card.ipay-card'],
    bankCell: ['.bank-cell'],
    bankCard: ['.bank-card'],
    bankLogo: ['img.bank-logo'],
    payAndBookBtn: ['button.btn-payment', 'button.btn.btn-payment']
  },
  irctcIpayGateway: {
    paymentNavs: ['#paymentNavs', '#autoDebit'],
    autoDebitTab: ['#autoDebitLi'],
    debitRadio: ['#mandateDCOTM'],
    creditRadio: ['#mandateCCOTM'],
    upiMandateRadio: ['#mandateUPI'],
    upiMandatePanel: ['#upiMandate_wrapper', '#qrUpiZone_mndt'],
    upiTab: ['#upiLi'],
    upiPanel: ['#upiCC'],
    cardMandatePanel: ['#cardMandate_wrapper', '#cardNumLineForRed'],
    cardNumber: ['#cardNumLineForRed', '#mndtCardNo'],
    expiry: ['#paymentDate', '#mandateDate'],
    cvv: ['#cvvNumber', '#mandateCvv'],
    cardName: ['#cardName', '#mandateName'],
    cardFieldErrors: [
      '#mndtEmptyCardNo',
      '#mndtInvalidCardNo',
      '#mndtCardNotSupported',
      '#mndtRupayCardNo',
      '#mndtEmptyExpiry',
      '#mndtInvalidExpiry',
      '#mndtEmptyCvv',
      '#mndtInvalidCvv',
      '#mndtEmptyName',
      '#mndtInvalidName',
      '#emptyCardNo',
      '#invalidCardNo',
      '#emptyExpiry',
      '#invalidExpiry',
      '#emptyCvv',
      '#invalidCvv',
      '#emptyName',
      '#invalidName'
    ],
    autoDebitPayBtn: ['#confirm-purchase', '#autoDebitBtn'],
    qrTrigger: ['#PayByQrButton', '#PayByQrButton span'],
    autopayQrTrigger: ['#PayByQrButton_mndt', '#PayByQrButton_mndt span'],
    altCardNumber: ['#cardNumLineForRed'],
    altExpiry: ['#paymentDate'],
    altCvv: ['#cvvNumber'],
    altCardName: ['#cardName'],
    altPayBtn: ['#confirm-purchase']
  },
  phonepeGateway: {
    paymentOptionsTitle: ['Payment Options'],
    upiInstrument: ['#upi-instrument', '[id*="upi-instrument"]'],
    cardInstrument: ['#card-instrument'],
    cardNumber: ['#card-number'],
    cardName: ['#card-name'],
    cardExpiry: ['#card-validity'],
    cardCvv: ['#card-cvv'],
    proceedBtn: ['#proceed-btn'],
    fieldErrorVisible: ['#input-error-text._show_1gbm9_37'],
    paymentOptionItem: ['[id$="-instrument"]', '._paymentOptionItemContainer_1cewd_1'],
    qrCode: ['canvas', 'img[alt*="QR" i]', 'img[src*="qr" i]']
  }
};

IRCTCExt.SELECTORS = IRCTCExt.EticketSelectors;

;
window.IRCTCExt = window.IRCTCExt || {};

IRCTCExt.Wait = {
  async delay(ms) {
    const step = 200;
    let elapsed = 0;

    while (elapsed < ms) {
      const control = await IRCTCExt.Bot?.checkControlState?.();
      if (control === 'stopped') {
        const err = new Error('Booking stopped');
        err.code = 'BOOKING_STOPPED';
        throw err;
      }
      if (control === 'paused') {
        await IRCTCExt.Bot.waitUntilResumedOrStopped();
        if (!(await IRCTCExt.Bot?.isRunning?.())) {
          const err = new Error('Booking stopped');
          err.code = 'BOOKING_STOPPED';
          throw err;
        }
      }

      const slice = Math.min(step, ms - elapsed);
      await new Promise((resolve) => setTimeout(resolve, slice));
      elapsed += slice;
    }
  },

  queryOne(selectors, root = document) {
    const list = Array.isArray(selectors) ? selectors : [selectors];
    for (const selector of list) {
      const el = root.querySelector(selector);
      if (el) return el;
    }
    return null;
  },

  queryAll(selectors, root = document) {
    const list = Array.isArray(selectors) ? selectors : [selectors];
    for (const selector of list) {
      const nodes = root.querySelectorAll(selector);
      if (nodes.length) return Array.from(nodes);
    }
    return [];
  },

  async waitFor(selectors, { timeout = 15000, root = document, visible = false } = {}) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const el = IRCTCExt.Wait.queryOne(selectors, root);
      if (el && (!visible || IRCTCExt.Wait.isVisible(el))) return el;
      await IRCTCExt.Wait.delay(100);
    }
    return null;
  },

  isVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) {
      return false;
    }
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  },

  watchPath(callback) {
    let last = location.pathname;
    const check = () => {
      if (location.pathname !== last) {
        const prev = last;
        last = location.pathname;
        callback(last, prev);
      }
    };
    window.addEventListener('popstate', check);
    const interval = setInterval(check, 300);
    return () => {
      window.removeEventListener('popstate', check);
      clearInterval(interval);
    };
  },

  async poll(fn, { interval = 100, timeout = 15000 } = {}) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const control = await IRCTCExt.Bot?.checkControlState?.();
      if (control === 'stopped') {
        const err = new Error('Booking stopped');
        err.code = 'BOOKING_STOPPED';
        throw err;
      }
      if (control === 'paused') {
        await IRCTCExt.Bot.waitUntilResumedOrStopped();
        if (!(await IRCTCExt.Bot?.isRunning?.())) {
          const err = new Error('Booking stopped');
          err.code = 'BOOKING_STOPPED';
          throw err;
        }
      }

      const result = await fn();
      if (result) return result;
      await IRCTCExt.Wait.delay(interval);
    }
    return null;
  },

  installIrctcNoiseFilter() {
    if (IRCTCExt.Wait._noiseFilterInstalled) return;
    IRCTCExt.Wait._noiseFilterInstalled = true;

    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      const message = reason?.message || reason?.name || String(reason || '');
      if (/pointer\s*lock|requestpointerlock|wrongdocumenterror/i.test(message)) {
        event.preventDefault();
      }
    });
  }
};

IRCTCExt.Wait.installIrctcNoiseFilter();

;
window.IRCTCExt = window.IRCTCExt || {};

IRCTCExt.Events = {
  click(el) {
    if (!el) return;
    el.scrollIntoView({ block: 'center', inline: 'nearest' });

    // Native click avoids IRCTC pointer-lock handlers triggered by synthetic PointerEvents.
    if (typeof el.click === 'function') {
      el.click();
      return;
    }

    const rect = el.getBoundingClientRect();
    const opts = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: rect.left + Math.min(24, Math.max(8, rect.width / 5)),
      clientY: rect.top + rect.height / 2,
      buttons: 1
    };
    el.dispatchEvent(new MouseEvent('mousedown', opts));
    el.dispatchEvent(new MouseEvent('mouseup', opts));
    el.dispatchEvent(new MouseEvent('click', opts));
  },

  setNativeValue(el, value) {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) setter.call(el, value);
    else el.value = value;
  },

  setInputValue(el, value, { blur = true } = {}) {
    if (!el) return;
    el.focus();
    IRCTCExt.Events.setNativeValue(el, value);
    el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, data: value, inputType: 'insertFromPaste' }));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    if (blur) el.dispatchEvent(new Event('blur', { bubbles: true }));
  },

  keyEvent(el, type, key) {
    el.dispatchEvent(
      new KeyboardEvent(type, {
        key,
        code: key.length === 1 ? `Key${key.toUpperCase()}` : key,
        bubbles: true,
        cancelable: true
      })
    );
  },

  async typeSlowly(el, text, delayMs = 80) {
    if (!el) return;
    el.focus();
    IRCTCExt.Events.setNativeValue(el, '');
    el.dispatchEvent(new InputEvent('input', { bubbles: true, data: '', inputType: 'deleteContentBackward' }));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    for (const ch of String(text)) {
      IRCTCExt.Events.keyEvent(el, 'keydown', ch);
      IRCTCExt.Events.keyEvent(el, 'keypress', ch);
      IRCTCExt.Events.setNativeValue(el, el.value + ch);
      el.dispatchEvent(new InputEvent('input', { bubbles: true, data: ch, inputType: 'insertText' }));
      el.dispatchEvent(new Event('input', { bubbles: true }));
      IRCTCExt.Events.keyEvent(el, 'keyup', ch);
      await IRCTCExt.Wait.delay(delayMs);
    }
    el.dispatchEvent(new Event('change', { bubbles: true }));
  },

  openFieldBox(fieldBox) {
    if (!fieldBox) return;
    fieldBox.scrollIntoView({ block: 'center', inline: 'nearest' });
    fieldBox.focus();
    IRCTCExt.Events.click(fieldBox);
    if (fieldBox.getAttribute('aria-expanded') !== 'true') {
      const inner = fieldBox.querySelector('.field-inner');
      if (inner) IRCTCExt.Events.click(inner);
    }
  },

  closeOpenFieldBoxes(except = null) {
    document.querySelectorAll('div.field-box[aria-expanded="true"]').forEach((open) => {
      if (open !== except) IRCTCExt.Events.click(open);
    });
  },

  visibleStationOptions() {
    const panels = IRCTCExt.Wait.queryAll(IRCTCExt.SELECTORS.customStationPanel);
    const visiblePanels = panels.filter((panel) => IRCTCExt.Wait.isVisible(panel));
    const fromPanels = visiblePanels.flatMap((panel) =>
      Array.from(panel.querySelectorAll('.custom-option')).filter((opt) => IRCTCExt.Wait.isVisible(opt))
    );
    if (fromPanels.length) return fromPanels;

    return IRCTCExt.Wait.queryAll(IRCTCExt.SELECTORS.customStationOptions).filter((opt) =>
      IRCTCExt.Wait.isVisible(opt)
    );
  },

  optionMatches(el, text) {
    const needle = String(text).trim().toLowerCase();
    if (!needle) return false;
    const name = el.querySelector('.option-name')?.textContent?.trim().toLowerCase() || '';
    const code = el.querySelector('.option-code')?.textContent?.trim().toLowerCase() || '';
    const full = (el.textContent || '').trim().toLowerCase();
    return (
      name.includes(needle) ||
      code.includes(needle) ||
      full.includes(needle) ||
      needle.includes(code) ||
      needle.includes(name)
    );
  },

  async pickCustomOption(panelSelector, text, { requireMatch = false, getOptions } = {}) {
    const options = await IRCTCExt.Wait.poll(
      () => {
        const list = getOptions
          ? getOptions()
          : IRCTCExt.Wait.queryAll(panelSelector).filter((opt) => IRCTCExt.Wait.isVisible(opt));
        return list.length ? list : null;
      },
      { timeout: 8000, interval: 150 }
    );
    if (!options?.length) return false;

    const match =
      options.find((opt) => IRCTCExt.Events.optionMatches(opt, text)) ||
      options.find((opt) =>
        (opt.textContent || '').toLowerCase().includes(String(text).toLowerCase().slice(0, 3))
      );

    if (requireMatch && !match) return false;

    const chosen = match || options[0];
    IRCTCExt.Events.click(chosen);
    await IRCTCExt.Wait.delay(300);
    return true;
  },

  stationAlreadySelected(fieldBox, text) {
    const placeholder = fieldBox?.querySelector('.select-placeholder');
    if (!placeholder?.classList.contains('has-value')) return false;

    const shown = IRCTCExt.Stations.normalizeStationText(placeholder.textContent);
    const needles = IRCTCExt.Stations.stationSearchTerms(text).map((term) =>
      IRCTCExt.Stations.normalizeStationText(term)
    );
    return needles.some(
      (needle) =>
        needle.length >= 2 &&
        (shown.includes(needle) || needle.includes(shown.split('|')[0]?.trim() || shown))
    );
  },

  findStationInput(fieldBox) {
    const local = fieldBox?.querySelector('input, textarea, .field-input');
    if (local && IRCTCExt.Wait.isVisible(local)) return local;

    if (fieldBox?.getAttribute('aria-expanded') === 'true') {
      const expandedInput = fieldBox.querySelector('input, textarea, .field-input');
      if (expandedInput && IRCTCExt.Wait.isVisible(expandedInput)) return expandedInput;
    }

    const panels = IRCTCExt.Wait.queryAll(IRCTCExt.SELECTORS.customStationPanel);
    const visiblePanel = panels.find((panel) => IRCTCExt.Wait.isVisible(panel));
    if (visiblePanel) {
      const panelInput = visiblePanel.querySelector('.station-search-input, input, textarea, .field-input');
      if (panelInput && IRCTCExt.Wait.isVisible(panelInput)) return panelInput;
    }

    const all = IRCTCExt.Wait.queryAll(IRCTCExt.SELECTORS.stationSearchInput);
    return all.find((el) => IRCTCExt.Wait.isVisible(el) && !el.closest('.login-form, #newLogin')) || null;
  },

  async waitForFieldExpanded(fieldBox, timeout = 5000) {
    return IRCTCExt.Wait.poll(
      () => (fieldBox?.getAttribute('aria-expanded') === 'true' ? true : null),
      { timeout, interval: 100 }
    );
  },

  async trySelectStationOption(fieldBox, text) {
    const picked = await IRCTCExt.Events.pickCustomOption(
      IRCTCExt.SELECTORS.customStationOptions,
      text,
      {
        requireMatch: true,
        getOptions: () => IRCTCExt.Events.visibleStationOptions()
      }
    );
    if (picked && IRCTCExt.Events.stationAlreadySelected(fieldBox, text)) return true;
    return IRCTCExt.Events.stationAlreadySelected(fieldBox, text);
  },

  quotaAlreadySelected(fieldBox, quota) {
    const shown = IRCTCExt.Stations.normalizeQuota(
      fieldBox?.querySelector('.select-placeholder')?.textContent
    );
    const target = IRCTCExt.Stations.normalizeQuota(quota);
    return shown === target;
  },

  quotaOptionMatches(el, quota) {
    const text = IRCTCExt.Stations.normalizeQuota(el?.textContent);
    const target = IRCTCExt.Stations.normalizeQuota(quota);
    if (!text || !target) return false;
    if (target === 'TATKAL') return text === 'TATKAL';
    if (target === 'GENERAL') return text === 'GENERAL';
    if (target === 'LADIES') return text === 'LADIES';
    return text === target || text.includes(target);
  },

  async pickQuotaOption(quota) {
    const targetText = IRCTCExt.Stations.quotaOptionText(quota);
    const options = await IRCTCExt.Wait.poll(
      () => {
        const list = IRCTCExt.Wait.queryAll(IRCTCExt.SELECTORS.customQuotaOptions);
        return list.length ? list : null;
      },
      { timeout: 8000, interval: 150 }
    );
    if (!options?.length) return false;

    const match =
      options.find((opt) => IRCTCExt.Events.quotaOptionMatches(opt, quota)) ||
      options.find((opt) =>
        IRCTCExt.Stations.normalizeQuota(opt.textContent) === IRCTCExt.Stations.normalizeQuota(targetText)
      );

    if (!match) return false;
    IRCTCExt.Events.click(match);
    await IRCTCExt.Wait.delay(300);
    return true;
  },

  async selectQuotaField(fieldBox, quota) {
    if (!fieldBox || !quota) return false;
    if (IRCTCExt.Events.quotaAlreadySelected(fieldBox, quota)) return true;

    IRCTCExt.Events.openFieldBox(fieldBox);
    await IRCTCExt.Wait.poll(
      () => (fieldBox.getAttribute('aria-expanded') === 'true' ? true : null),
      { timeout: 3000, interval: 100 }
    );
    await IRCTCExt.Wait.delay(200);

    const picked = await IRCTCExt.Events.pickQuotaOption(quota);
    if (picked) return true;
    return IRCTCExt.Events.quotaAlreadySelected(fieldBox, quota);
  },

  async fillStationField(fieldBox, text) {
    if (!fieldBox || !text) return false;
    if (IRCTCExt.Events.stationAlreadySelected(fieldBox, text)) return true;

    IRCTCExt.Events.closeOpenFieldBoxes(fieldBox);
    IRCTCExt.Events.openFieldBox(fieldBox);
    await IRCTCExt.Events.waitForFieldExpanded(fieldBox, 5000);
    await IRCTCExt.Wait.delay(250);

    const input = await IRCTCExt.Wait.poll(() => IRCTCExt.Events.findStationInput(fieldBox), {
      timeout: 8000,
      interval: 120
    });
    if (!input) return false;

    const searchTerms = IRCTCExt.Stations.stationSearchTerms(text);
    for (const term of searchTerms) {
      input.focus();
      IRCTCExt.Events.click(input);
      IRCTCExt.Events.setInputValue(input, term, { blur: false });
      await IRCTCExt.Wait.delay(500);
      if (await IRCTCExt.Events.trySelectStationOption(fieldBox, text)) return true;

      await IRCTCExt.Events.typeSlowly(input, term, 60);
      await IRCTCExt.Wait.delay(400);
      if (await IRCTCExt.Events.trySelectStationOption(fieldBox, text)) return true;
    }

    return IRCTCExt.Events.stationAlreadySelected(fieldBox, text);
  },

  async fillAutocomplete(input, text) {
    if (!input) return false;
    if (input.matches?.('div.field-box') || input.classList?.contains('field-box')) {
      return IRCTCExt.Events.fillStationField(input, text);
    }
    await IRCTCExt.Events.typeSlowly(input, text, 40);
    await IRCTCExt.Wait.delay(500);
    const options = IRCTCExt.Wait.queryAll(IRCTCExt.SELECTORS.autocompletePanel);
    const match = options.find((li) => IRCTCExt.Events.optionMatches(li, text));
    if (match) {
      IRCTCExt.Events.click(match);
      await IRCTCExt.Wait.delay(300);
      return true;
    }
    if (options.length) {
      IRCTCExt.Events.click(options[0]);
      await IRCTCExt.Wait.delay(300);
      return true;
    }
    return false;
  },

  async selectDropdown(triggerSelectors, labelText) {
    const trigger = await IRCTCExt.Wait.waitFor(triggerSelectors, { timeout: 5000 });
    if (!trigger) return false;
    IRCTCExt.Events.click(trigger);
    await IRCTCExt.Wait.delay(400);
    return IRCTCExt.Events.pickCustomOption(IRCTCExt.SELECTORS.dropdownPanel, labelText);
  },

  parseDdMmYyyy(dateStr) {
    const parts = String(dateStr).split('/');
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)) return null;
    return { day, month, year };
  },

  async pickCustomCalendarDate(dateStr) {
    const parsed = IRCTCExt.Events.parseDdMmYyyy(dateStr);
    if (!parsed) return false;

    const panel = await IRCTCExt.Wait.waitFor(IRCTCExt.SELECTORS.calendarPanel, { timeout: 5000, visible: true });
    if (!panel) return false;

    const monthNames = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ];

    for (let i = 0; i < 24; i += 1) {
      const title = (panel.querySelector('.ui-datepicker-title')?.textContent || '').toLowerCase();
      const monthOk = title.includes(monthNames[parsed.month]);
      const yearOk = title.includes(String(parsed.year));
      if (monthOk && yearOk) break;

      const titleDate = new Date(parsed.year, parsed.month, 1);
      const shownYear = Number((title.match(/\d{4}/) || [])[0]);
      const shownMonth = monthNames.findIndex((m) => title.includes(m));
      const goNext =
        Number.isNaN(shownYear) || shownMonth < 0
          ? true
          : new Date(shownYear, shownMonth, 1) < titleDate;
      const nav = panel.querySelector(goNext ? '.ui-datepicker-next' : '.ui-datepicker-prev');
      if (!nav) break;
      IRCTCExt.Events.click(nav);
      await IRCTCExt.Wait.delay(200);
    }

    const day = String(parsed.day);
    const cells = Array.from(
      panel.querySelectorAll('.ui-datepicker-calendar td a, .ui-datepicker-calendar td span, .p-datepicker-calendar td span')
    ).filter((c) => !c.closest('td')?.classList.contains('ui-datepicker-other-month'));
    const cell = cells.find((c) => c.textContent.trim() === day);
    if (!cell) return false;
    IRCTCExt.Events.click(cell);
    await IRCTCExt.Wait.delay(200);
    return true;
  },

  async setCalendarDate(input, dateStr) {
    if (!input || !dateStr) return false;

    if (input.matches?.('div.field-box') || input.classList?.contains('field-box')) {
      IRCTCExt.Events.openFieldBox(input);
      await IRCTCExt.Wait.delay(250);
      return IRCTCExt.Events.pickCustomCalendarDate(dateStr);
    }

    IRCTCExt.Events.setInputValue(input, dateStr);
    await IRCTCExt.Wait.delay(200);
    IRCTCExt.Events.click(input);
    await IRCTCExt.Wait.delay(300);
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = String(parseInt(parts[0], 10));
      const cells = Array.from(document.querySelectorAll('.ui-datepicker-calendar td a, .p-datepicker-calendar td span'));
      const cell = cells.find((c) => c.textContent.trim() === day);
      if (cell) {
        IRCTCExt.Events.click(cell);
        await IRCTCExt.Wait.delay(200);
        return true;
      }
    }
    return true;
  }
};

;
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


;
window.IRCTCExt = window.IRCTCExt || {};

IRCTCExt.IrctcIpayGateway = {
  formatExpiry(expiry) {
    const raw = String(expiry || '').trim();
    if (!raw) return '';
    if (/^\d{2}\/\d{2}$/.test(raw)) return raw;
    const slash = raw.match(/^(\d{1,2})\/(\d{2,4})$/);
    if (slash) {
      const mm = slash[1].padStart(2, '0');
      const yy = slash[2].length === 4 ? slash[2].slice(-2) : slash[2];
      return `${mm}/${yy}`;
    }
    const digits = raw.replace(/\D/g, '');
    if (digits.length >= 4) {
      return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
    }
    return raw;
  },

  async waitForGatewayReady() {
    const sel = IRCTCExt.SELECTORS.irctcIpayGateway;
    const ready = await IRCTCExt.Wait.waitFor(sel.paymentNavs, { timeout: 20000, visible: true });
    if (!ready) throw new Error('IRCTC iPay gateway did not load');
    await IRCTCExt.Wait.delay(300);
  },

  async finishGateway(overlay, message) {
    await IRCTCExt.Storage.updateState({
      paymentDone: true,
      paymentPhase: null,
      awaitingGateway: false,
      paymentGateway: null,
      status: 'done',
      running: false,
      currentStep: 'done'
    });
    overlay?.setStep('Payment');
    overlay?.setStatus(message);
    overlay?.showPause(message);
  },

  autoPayRadioLabel(type) {
    if (type === 'credit') return 'Credit Card';
    if (type === 'qr') return 'UPI';
    return 'Debit Card';
  },

  autoPayRadioSelectors(type) {
    const sel = IRCTCExt.SELECTORS.irctcIpayGateway;
    if (type === 'credit') return sel.creditRadio;
    if (type === 'qr') return sel.upiMandateRadio;
    return sel.debitRadio;
  },

  async ensureAutopayTabActive() {
    const sel = IRCTCExt.SELECTORS.irctcIpayGateway;
    const tab = IRCTCExt.Wait.queryOne(sel.autoDebitTab);
    if (!tab) return;

    if (!tab.classList.contains('activeLi')) {
      IRCTCExt.Events.click(tab);
      await IRCTCExt.Wait.delay(350);
    }

    await IRCTCExt.Wait.waitFor(sel.paymentNavs, { timeout: 5000, visible: true });
  },

  async selectAutoPayRadio(type) {
    const normalized = type === 'upi' ? 'qr' : type;
    const label = IRCTCExt.IrctcIpayGateway.autoPayRadioLabel(normalized);
    const selectors = IRCTCExt.IrctcIpayGateway.autoPayRadioSelectors(normalized);

    await IRCTCExt.IrctcIpayGateway.ensureAutopayTabActive();

    const radio = await IRCTCExt.Wait.waitFor(selectors, { timeout: 8000, visible: true });
    if (!radio) throw new Error(`${label} auto pay option not found on gateway`);

    if (!radio.checked) {
      IRCTCExt.Events.click(radio);
      await IRCTCExt.Wait.delay(400);
    }

    if (!radio.checked) {
      const labelEl = radio.closest('label');
      if (labelEl) IRCTCExt.Events.click(labelEl);
      await IRCTCExt.Wait.delay(400);
    }

    return radio;
  },

  async selectMandateType(type) {
    return IRCTCExt.IrctcIpayGateway.selectAutoPayRadio(type);
  },

  findVisibleField(selectors) {
    const list = Array.isArray(selectors) ? selectors : [selectors];
    for (const selector of list) {
      const el = document.querySelector(selector);
      if (el && IRCTCExt.Wait.isVisible(el)) return el;
    }
    return null;
  },

  resolveCardFields() {
    const sel = IRCTCExt.SELECTORS.irctcIpayGateway;
    const sets = [
      {
        number: sel.altCardNumber,
        expiry: sel.altExpiry,
        cvv: sel.altCvv,
        name: sel.altCardName,
        payBtn: sel.altPayBtn
      },
      {
        number: ['#mndtCardNo'],
        expiry: ['#mandateDate'],
        cvv: ['#mandateCvv'],
        name: ['#mandateName'],
        payBtn: ['#autoDebitBtn']
      }
    ];

    for (const set of sets) {
      const numberEl = IRCTCExt.IrctcIpayGateway.findVisibleField(set.number);
      if (!numberEl) continue;

      const expiryEl = IRCTCExt.IrctcIpayGateway.findVisibleField(set.expiry);
      const cvvEl = IRCTCExt.IrctcIpayGateway.findVisibleField(set.cvv);
      const nameEl = IRCTCExt.IrctcIpayGateway.findVisibleField(set.name);
      const payBtn = IRCTCExt.IrctcIpayGateway.findVisibleField(set.payBtn);

      if (expiryEl && cvvEl && nameEl) {
        return { numberEl, expiryEl, cvvEl, nameEl, payBtn };
      }
    }

    throw new Error('Card fields not found on IRCTC iPay gateway');
  },

  async waitForCardFields() {
    const fields = await IRCTCExt.Wait.poll(
      () => {
        try {
          return IRCTCExt.IrctcIpayGateway.resolveCardFields();
        } catch {
          return null;
        }
      },
      { timeout: 8000, interval: 150 }
    );
    if (!fields) throw new Error('Card form not visible on IRCTC iPay gateway');
    return fields;
  },

  fieldHasInputError(el) {
    if (!el || !IRCTCExt.Wait.isVisible(el)) return true;
    if (el.classList.contains('redLine')) return true;
    return !String(el.value || '').trim();
  },

  hasVisibleCardFieldError(fields) {
    const sel = IRCTCExt.SELECTORS.irctcIpayGateway;
    for (const id of sel.cardFieldErrors) {
      const el = document.querySelector(id);
      if (el && IRCTCExt.Wait.isVisible(el)) return true;
    }

    if (fields) {
      for (const el of [fields.numberEl, fields.expiryEl, fields.cvvEl, fields.nameEl]) {
        if (IRCTCExt.IrctcIpayGateway.fieldHasInputError(el)) return true;
      }

      const panel =
        fields.numberEl?.closest('.cardNumValiWrapper, .cardNumUiNew, .mndt_wrapper, form') ||
        fields.numberEl?.parentElement;
      if (panel) {
        for (const err of panel.querySelectorAll('.text-danger1')) {
          if (IRCTCExt.Wait.isVisible(err)) return true;
        }
      }
    }

    return false;
  },

  async clearGatewayInput(el) {
    if (!el) return;
    el.focus();
    IRCTCExt.Events.setNativeValue(el, '');
    el.dispatchEvent(
      new InputEvent('input', { bubbles: true, data: '', inputType: 'deleteContentBackward' })
    );
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('keyup', { bubbles: true }));
    el.dispatchEvent(new Event('focusout', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
    await IRCTCExt.Wait.delay(200);
  },

  async fillGatewayInput(el, value, { slow = false } = {}) {
    if (!el) return;
    await IRCTCExt.IrctcIpayGateway.clearGatewayInput(el);
    const text = String(value || '');

    if (slow) {
      await IRCTCExt.Events.typeSlowly(el, text, 40);
    } else {
      IRCTCExt.Events.setInputValue(el, text, { blur: false });
      el.dispatchEvent(new Event('keyup', { bubbles: true }));
      el.dispatchEvent(new Event('focusout', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
    }

    await IRCTCExt.Wait.delay(150);
  },

  cardNumberLooksValid(el, expectedDigits) {
    if (!el) return false;
    const digits = String(el.value || '').replace(/\D/g, '');
    const expected = String(expectedDigits || '').replace(/\D/g, '');
    if (digits.length < 12) return false;
    if (expected && digits !== expected) return false;
    if (el.classList.contains('redLine')) return false;
    return true;
  },

  async fillCardNumberWithRetry(numberEl, cardNumber) {
    const maxTries = 3;
    for (let attempt = 1; attempt <= maxTries; attempt++) {
      await IRCTCExt.IrctcIpayGateway.fillGatewayInput(numberEl, cardNumber, { slow: true });
      await IRCTCExt.Wait.delay(200);

      if (IRCTCExt.IrctcIpayGateway.cardNumberLooksValid(numberEl, cardNumber)) return;

      if (attempt < maxTries) {
        await IRCTCExt.IrctcIpayGateway.clearGatewayInput(numberEl);
        await IRCTCExt.Wait.delay(200);
      }
    }

    throw new Error('Could not enter card number on IRCTC iPay gateway');
  },

  async clearCardFields(fields) {
    const resolved = fields || IRCTCExt.IrctcIpayGateway.resolveCardFields();
    for (const el of [resolved.numberEl, resolved.expiryEl, resolved.cvvEl, resolved.nameEl]) {
      await IRCTCExt.IrctcIpayGateway.clearGatewayInput(el);
    }
  },

  async fillCardFields(card) {
    const fields = IRCTCExt.IrctcIpayGateway.resolveCardFields();
    const cardNumber = String(card?.number || '').replace(/\s+/g, '');
    const expiryDigits = IRCTCExt.IrctcIpayGateway.formatExpiry(card?.expiry).replace(/\D/g, '');

    await IRCTCExt.IrctcIpayGateway.fillCardNumberWithRetry(fields.numberEl, cardNumber);
    await IRCTCExt.IrctcIpayGateway.fillGatewayInput(fields.expiryEl, expiryDigits, { slow: true });
    await IRCTCExt.IrctcIpayGateway.fillGatewayInput(fields.cvvEl, card?.cvv || '');
    await IRCTCExt.IrctcIpayGateway.fillGatewayInput(fields.nameEl, card?.name || '');

    return fields;
  },

  async waitForCardFormValid(fields) {
    const resolved = fields || IRCTCExt.IrctcIpayGateway.resolveCardFields();
    const ok = await IRCTCExt.Wait.poll(
      () => {
        if (IRCTCExt.IrctcIpayGateway.hasVisibleCardFieldError(resolved)) return false;

        const payBtn =
          resolved.payBtn ||
          IRCTCExt.IrctcIpayGateway.findVisibleField(IRCTCExt.SELECTORS.irctcIpayGateway.autoDebitPayBtn);
        if (!payBtn || !IRCTCExt.Wait.isVisible(payBtn)) return false;
        if (payBtn.disabled) return false;
        return true;
      },
      { timeout: 5000, interval: 150 }
    );

    if (!ok) {
      throw new Error('Gateway rejected saved card details — check card number, expiry, CVV, and name');
    }

    return resolved;
  },

  async fillAutopayCard(overlay, card, type) {
    const label = type === 'credit' ? 'credit' : 'debit';
    const maxAttempts = 3;

    overlay?.setStatus(`Selecting ${label} card auto pay type...`);
    await IRCTCExt.IrctcIpayGateway.selectAutoPayRadio(type);
    await IRCTCExt.IrctcIpayGateway.waitForCardFields();

    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        let fields = IRCTCExt.IrctcIpayGateway.resolveCardFields();

        if (attempt > 1) {
          overlay?.setStatus(`Retrying card fill (${attempt}/${maxAttempts})...`);
          await IRCTCExt.IrctcIpayGateway.clearCardFields(fields);
          await IRCTCExt.Wait.delay(300);
        } else {
          overlay?.setStatus(`Filling ${label} card on IRCTC iPay...`);
        }

        fields = await IRCTCExt.IrctcIpayGateway.fillCardFields(card);

        overlay?.setStatus('Validating card details...');
        fields = await IRCTCExt.IrctcIpayGateway.waitForCardFormValid(fields);

        const payBtn =
          fields.payBtn ||
          IRCTCExt.IrctcIpayGateway.findVisibleField(IRCTCExt.SELECTORS.irctcIpayGateway.autoDebitPayBtn);
        if (!payBtn) throw new Error('Pay button not found on IRCTC iPay gateway');

        overlay?.setStatus('Submitting card payment...');
        IRCTCExt.Events.click(payBtn);
        await IRCTCExt.Wait.delay(500);

        await IRCTCExt.IrctcIpayGateway.finishGateway(
          overlay,
          'Card submitted — complete OTP/bank step manually.'
        );
        return;
      } catch (err) {
        lastError = err;
        if (attempt >= maxAttempts) break;
      }
    }

    throw lastError || new Error('Gateway rejected saved card details — check card number, expiry, CVV, and name');
  },

  async clickQrTrigger(selectors) {
    const qrBtn = await IRCTCExt.Wait.poll(
      () => {
        const btn = IRCTCExt.Wait.queryOne(selectors);
        return btn && IRCTCExt.Wait.isVisible(btn) ? btn : null;
      },
      { timeout: 8000, interval: 150 }
    );
    if (!qrBtn) return null;
    IRCTCExt.Events.click(qrBtn);
    await IRCTCExt.Wait.delay(500);
    return qrBtn;
  },

  async handleQrFlow(overlay) {
    const sel = IRCTCExt.SELECTORS.irctcIpayGateway;
    overlay?.setStatus('Selecting UPI auto pay type...');
    await IRCTCExt.IrctcIpayGateway.selectAutoPayRadio('qr');

    await IRCTCExt.Wait.waitFor(sel.upiMandatePanel, { timeout: 8000, visible: true });

    overlay?.setStatus('Opening UPI QR on IRCTC iPay...');
    let clicked = await IRCTCExt.IrctcIpayGateway.clickQrTrigger(sel.autopayQrTrigger);

    if (!clicked) {
      const upiTab = IRCTCExt.Wait.queryOne(sel.upiTab);
      if (upiTab && IRCTCExt.Wait.isVisible(upiTab)) {
        IRCTCExt.Events.click(upiTab);
        await IRCTCExt.Wait.delay(400);
        await IRCTCExt.Wait.waitFor(sel.upiPanel, { timeout: 8000, visible: true });
        clicked = await IRCTCExt.IrctcIpayGateway.clickQrTrigger(sel.qrTrigger);
      }
    }

    if (!clicked) throw new Error('QR pay button not found on IRCTC iPay gateway');

    await IRCTCExt.IrctcIpayGateway.finishGateway(overlay, 'QR ready — scan and pay manually.');
  },

  async handle(config, overlay) {
    await IRCTCExt.IrctcIpayGateway.waitForGatewayReady();

    const autoPay = IRCTCExt.BkgPayment.getAutoPaySettings(config);
    if (!autoPay.enabled) {
      await IRCTCExt.IrctcIpayGateway.finishGateway(
        overlay,
        'Auto pay disabled — complete payment manually on gateway.'
      );
      return true;
    }

    if (autoPay.type === 'qr') {
      return IRCTCExt.IrctcIpayGateway.handleQrFlow(overlay);
    }

    if (autoPay.type === 'credit' || autoPay.type === 'debit') {
      if (!autoPay.card?.number) {
        throw new Error(`Saved ${autoPay.type} card details are missing in extension popup`);
      }
      return IRCTCExt.IrctcIpayGateway.fillAutopayCard(overlay, autoPay.card, autoPay.type);
    }

    throw new Error(`Unsupported auto pay type: ${autoPay.type}`);
  }
};

;
window.IRCTCExt = window.IRCTCExt || {};

IRCTCExt.PhonePeGateway = {
  isPhonePeHost() {
    return location.hostname.includes('phonepe.com');
  },

  formatExpiry(expiry) {
    const raw = String(expiry || '').trim();
    if (!raw) return '';
    if (/^\d{2}\/\d{2}$/.test(raw)) return raw;
    const slash = raw.match(/^(\d{1,2})\/(\d{2,4})$/);
    if (slash) {
      const mm = slash[1].padStart(2, '0');
      const yy = slash[2].length === 4 ? slash[2].slice(-2) : slash[2];
      return `${mm}/${yy}`;
    }
    const digits = raw.replace(/\D/g, '');
    if (digits.length >= 4) {
      return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
    }
    return raw;
  },

  async finishGateway(overlay, message) {
    await IRCTCExt.Storage.updateState({
      paymentDone: true,
      paymentPhase: null,
      awaitingGateway: false,
      paymentGateway: null,
      status: 'done',
      running: false,
      currentStep: 'done'
    });
    overlay?.setStep('Payment');
    overlay?.setStatus(message);
    overlay?.showPause(message);
  },

  isLoadingScreen() {
    const text = (document.body?.textContent || '').toLowerCase();
    return text.includes('please wait') && text.includes('processing your request');
  },

  isPaymentOptionsVisible() {
    const sel = IRCTCExt.SELECTORS.phonepeGateway;
    if (IRCTCExt.Wait.queryOne(sel.cardInstrument)) return true;
    if (IRCTCExt.Wait.queryOne(sel.upiInstrument)) return true;
    const title = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span')).find((el) =>
      /payment options/i.test(el.textContent || '')
    );
    return !!(title && IRCTCExt.Wait.isVisible(title));
  },

  async waitForGatewayReady() {
    const ready = await IRCTCExt.Wait.poll(
      () => {
        if (IRCTCExt.PhonePeGateway.isPaymentOptionsVisible()) return true;
        if (IRCTCExt.PhonePeGateway.isLoadingScreen()) return null;
        return IRCTCExt.PhonePeGateway.isPaymentOptionsVisible() ? true : null;
      },
      { timeout: 30000, interval: 300 }
    );
    if (!ready) throw new Error('PhonePe payment gateway did not load');
    await IRCTCExt.Wait.delay(400);
  },

  findUpiInstrument() {
    const sel = IRCTCExt.SELECTORS.phonepeGateway;
    const direct = IRCTCExt.Wait.queryOne(sel.upiInstrument);
    if (direct && IRCTCExt.Wait.isVisible(direct)) return direct;

    for (const item of IRCTCExt.Wait.queryAll(sel.paymentOptionItem)) {
      if (!IRCTCExt.Wait.isVisible(item)) continue;
      const title = item.querySelector('._titleContainer_1cewd_41, [class*="titleContainer"]');
      const text = (title?.textContent || item.textContent || '').replace(/\s+/g, ' ').trim();
      if (/^UPI$/i.test(text) || (/\bUPI\b/i.test(text) && !/debit|credit card/i.test(text))) {
        return item;
      }
    }
    return null;
  },

  isInstrumentSelected(el) {
    if (!el) return false;
    if (el.classList.contains('_selected_1cewd_32')) return true;
    if (el.id === 'card-instrument' && el.className.includes('_selected_')) return true;
    return el.getAttribute('aria-selected') === 'true';
  },

  async selectInstrument(el, label, overlay) {
    if (!el) throw new Error(`${label} payment option not found on PhonePe gateway`);
    if (IRCTCExt.PhonePeGateway.isInstrumentSelected(el)) return el;

    overlay?.setStatus(`Selecting ${label} on PhonePe...`);
    IRCTCExt.Events.click(el);
    await IRCTCExt.Wait.delay(500);
    return el;
  },

  async selectCardInstrument(overlay) {
    const sel = IRCTCExt.SELECTORS.phonepeGateway;
    const card = await IRCTCExt.Wait.waitFor(sel.cardInstrument, { timeout: 15000, visible: true });
    await IRCTCExt.PhonePeGateway.selectInstrument(card, 'Debit/Credit Card', overlay);

    const numberInput = await IRCTCExt.Wait.waitFor(sel.cardNumber, { timeout: 10000, visible: true });
    if (!numberInput) throw new Error('PhonePe card form did not appear');
    return numberInput;
  },

  async selectUpiInstrument(overlay) {
    const upi = await IRCTCExt.Wait.poll(
      () => IRCTCExt.PhonePeGateway.findUpiInstrument(),
      { timeout: 10000, interval: 200 }
    );
    if (!upi) return false;
    await IRCTCExt.PhonePeGateway.selectInstrument(upi, 'UPI', overlay);
    return true;
  },

  hasVisibleFieldError() {
    const sel = IRCTCExt.SELECTORS.phonepeGateway;
    for (const err of IRCTCExt.Wait.queryAll(sel.fieldErrorVisible)) {
      if (IRCTCExt.Wait.isVisible(err) && (err.textContent || '').trim()) return true;
    }
    return false;
  },

  isProceedEnabled(btn) {
    if (!btn || !IRCTCExt.Wait.isVisible(btn)) return false;
    if (btn.disabled) return false;
    if (btn.getAttribute('aria-disabled') === 'true') return false;
    if (btn.classList.contains('_disabled_1ozip_25')) return false;
    return true;
  },

  async fillCardForm(card, overlay) {
    const sel = IRCTCExt.SELECTORS.phonepeGateway;
    const numberEl = IRCTCExt.Wait.queryOne(sel.cardNumber);
    const nameEl = IRCTCExt.Wait.queryOne(sel.cardName);
    const expiryEl = IRCTCExt.Wait.queryOne(sel.cardExpiry);
    const cvvEl = IRCTCExt.Wait.queryOne(sel.cardCvv);

    if (!numberEl || !nameEl || !expiryEl || !cvvEl) {
      throw new Error('PhonePe card fields not found');
    }

    const cardNumber = String(card?.number || '').replace(/\s+/g, '');
    const expiry = IRCTCExt.PhonePeGateway.formatExpiry(card?.expiry);

    overlay?.setStatus('Filling card details on PhonePe...');
    IRCTCExt.Events.setInputValue(numberEl, cardNumber);
    await IRCTCExt.Wait.delay(200);
    IRCTCExt.Events.setInputValue(nameEl, card?.name || '');
    await IRCTCExt.Wait.delay(200);
    IRCTCExt.Events.setInputValue(expiryEl, expiry);
    await IRCTCExt.Wait.delay(200);
    IRCTCExt.Events.setInputValue(cvvEl, card?.cvv || '');
    await IRCTCExt.Wait.delay(400);

    if (IRCTCExt.PhonePeGateway.hasVisibleFieldError()) {
      throw new Error('PhonePe rejected card details — check number, expiry, CVV, and name');
    }
  },

  async clickProceedWhenEnabled(overlay) {
    const sel = IRCTCExt.SELECTORS.phonepeGateway;
    overlay?.setStatus('Waiting for Proceed button...');

    const btn = await IRCTCExt.Wait.poll(
      () => {
        const candidate = IRCTCExt.Wait.queryOne(sel.proceedBtn);
        return IRCTCExt.PhonePeGateway.isProceedEnabled(candidate) ? candidate : null;
      },
      { timeout: 15000, interval: 250 }
    );

    if (!btn) throw new Error('PhonePe Proceed button not enabled — check saved card details');

    overlay?.setStatus('Clicking Proceed...');
    IRCTCExt.Events.click(btn);
    await IRCTCExt.Wait.delay(600);
    return btn;
  },

  async isQrVisible() {
    const sel = IRCTCExt.SELECTORS.phonepeGateway;
    for (const selector of sel.qrCode) {
      const el = document.querySelector(selector);
      if (el && IRCTCExt.Wait.isVisible(el)) return true;
    }
    return false;
  },

  async handleQrFlow(overlay) {
    overlay?.setStatus('Preparing PhonePe UPI / QR...');

    const upiSelected = await IRCTCExt.PhonePeGateway.selectUpiInstrument(overlay);
    if (!upiSelected && !(await IRCTCExt.PhonePeGateway.isQrVisible())) {
      throw new Error('PhonePe UPI payment option not found');
    }

    const qrReady = await IRCTCExt.Wait.poll(
      () => (IRCTCExt.PhonePeGateway.isQrVisible() ? true : null),
      { timeout: 15000, interval: 300 }
    );

    if (!qrReady) throw new Error('PhonePe QR code did not appear');

    await IRCTCExt.PhonePeGateway.finishGateway(overlay, 'QR ready — scan and pay manually.');
  },

  async fillAutopayCard(overlay, card, type) {
    const label = type === 'credit' ? 'credit' : 'debit';
    if (!card?.number) {
      throw new Error(`Saved ${label} card details are missing in extension popup`);
    }

    await IRCTCExt.PhonePeGateway.selectCardInstrument(overlay);
    await IRCTCExt.PhonePeGateway.fillCardForm(card, overlay);
    await IRCTCExt.PhonePeGateway.clickProceedWhenEnabled(overlay);
    await IRCTCExt.PhonePeGateway.finishGateway(
      overlay,
      'Card submitted — complete OTP/3DS manually.'
    );
  },

  async handle(config, overlay) {
    await IRCTCExt.PhonePeGateway.waitForGatewayReady();

    const autoPay = IRCTCExt.BkgPayment.getAutoPaySettings(config);
    if (!autoPay.enabled) {
      await IRCTCExt.PhonePeGateway.finishGateway(
        overlay,
        'Auto pay disabled — complete payment manually on PhonePe gateway.'
      );
      return true;
    }

    if (autoPay.type === 'qr') {
      return IRCTCExt.PhonePeGateway.handleQrFlow(overlay);
    }

    if (autoPay.type === 'credit' || autoPay.type === 'debit') {
      return IRCTCExt.PhonePeGateway.fillAutopayCard(overlay, autoPay.card, autoPay.type);
    }

    throw new Error(`Unsupported auto pay type: ${autoPay.type}`);
  }
};

;
window.IRCTCExt = window.IRCTCExt || {};

IRCTCExt.Gateways = {
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

;
window.IRCTCExt = window.IRCTCExt || {};

IRCTCExt.Overlay = {
  el: null,
  startTime: null,
  timerInterval: null,
  onContinue: null,
  onStop: null,
  _bound: false,

  async ensureBody() {
    if (document.body) return;
    await IRCTCExt.Wait.poll(() => document.body, { timeout: 10000, interval: 50 });
  },

  async init() {
    await IRCTCExt.Overlay.ensureBody();
    if (!document.body) return IRCTCExt.Overlay;

    if (document.getElementById('irctc-ext-overlay')) {
      IRCTCExt.Overlay.el = document.getElementById('irctc-ext-overlay');
      IRCTCExt.Overlay.ensureMinimizeButton();
      IRCTCExt.Overlay.ensureRestartButton();
      IRCTCExt.Overlay.bindEvents();
      return IRCTCExt.Overlay;
    }

    const root = document.createElement('div');
    root.id = 'irctc-ext-overlay';
    root.className = 'irctc-ext-overlay irctc-ext-overlay--hidden';
    root.innerHTML = `
      <div class="irctc-ext-overlay__header">
        <span>IRCTC Tatkal Bot</span>
        <div class="irctc-ext-overlay__header-right">
          <span id="irctc-ext-step">Idle</span>
          <button type="button" class="irctc-ext-overlay__icon-btn" id="irctc-ext-minimize" title="Minimize" aria-label="Minimize overlay">−</button>
        </div>
      </div>
      <div class="irctc-ext-overlay__body">
        <div class="irctc-ext-overlay__status" id="irctc-ext-status">Ready</div>
        <div class="irctc-ext-overlay__timer" id="irctc-ext-timer">Elapsed: 0s</div>
        <div class="irctc-ext-overlay__actions">
          <button class="irctc-ext-overlay__btn" id="irctc-ext-pause" type="button">Pause</button>
          <button class="irctc-ext-overlay__btn irctc-ext-overlay__btn--accent" id="irctc-ext-restart" type="button">Restart</button>
          <button class="irctc-ext-overlay__btn irctc-ext-overlay__btn--danger" id="irctc-ext-stop" type="button">Stop</button>
        </div>
        <div class="irctc-ext-overlay__pause-panel" id="irctc-ext-pause-panel" style="display:none;">
          <div id="irctc-ext-pause-msg">Solve CAPTCHA, then click Continue.</div>
          <button class="irctc-ext-overlay__btn irctc-ext-overlay__btn--primary" id="irctc-ext-continue" type="button" style="margin-top:8px;width:100%;">Continue</button>
        </div>
        <div class="irctc-ext-overlay__error" id="irctc-ext-error"></div>
      </div>
    `;
    document.body.appendChild(root);
    IRCTCExt.Overlay.el = root;

    IRCTCExt.Overlay.bindEvents();

    return IRCTCExt.Overlay;
  },

  ensureMinimizeButton() {
    const header = this.el?.querySelector('.irctc-ext-overlay__header');
    if (!header || document.getElementById('irctc-ext-minimize')) return;

    let right = header.querySelector('.irctc-ext-overlay__header-right');
    if (!right) {
      right = document.createElement('div');
      right.className = 'irctc-ext-overlay__header-right';
      const step = document.getElementById('irctc-ext-step');
      if (step) right.appendChild(step);
      header.appendChild(right);
    }

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'irctc-ext-minimize';
    btn.className = 'irctc-ext-overlay__icon-btn';
    btn.title = 'Minimize';
    btn.setAttribute('aria-label', 'Minimize overlay');
    btn.textContent = '−';
    right.appendChild(btn);
  },

  ensureRestartButton() {
    const actions = this.el?.querySelector('.irctc-ext-overlay__actions');
    if (!actions || document.getElementById('irctc-ext-restart')) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'irctc-ext-restart';
    btn.className = 'irctc-ext-overlay__btn irctc-ext-overlay__btn--accent';
    btn.textContent = 'Restart';
    const stopBtn = document.getElementById('irctc-ext-stop');
    if (stopBtn) {
      actions.insertBefore(btn, stopBtn);
    } else {
      actions.appendChild(btn);
    }
  },

  bindEvents() {
    const minimizeBtn = document.getElementById('irctc-ext-minimize');
    if (minimizeBtn && minimizeBtn.dataset.bound !== '1') {
      minimizeBtn.dataset.bound = '1';
      minimizeBtn.addEventListener('click', () => IRCTCExt.Overlay.toggleMinimize());
    }

    const restartBtn = document.getElementById('irctc-ext-restart');
    if (restartBtn && restartBtn.dataset.bound !== '1') {
      restartBtn.dataset.bound = '1';
      restartBtn.addEventListener('click', () => IRCTCExt.Overlay.restart());
    }

    if (this._bound) return;

    document.getElementById('irctc-ext-pause')?.addEventListener('click', () => IRCTCExt.Overlay.togglePause());
    document.getElementById('irctc-ext-stop')?.addEventListener('click', () => IRCTCExt.Overlay.stop());
    document.getElementById('irctc-ext-continue')?.addEventListener('click', () => {
      document.getElementById('irctc-ext-pause-panel').style.display = 'none';
      if (typeof IRCTCExt.Overlay.onContinue === 'function') IRCTCExt.Overlay.onContinue();
    });
    this._bound = true;
  },

  setMinimized(minimized) {
    if (!this.el) return;
    this.el.classList.toggle('irctc-ext-overlay--minimized', minimized);
    const btn = document.getElementById('irctc-ext-minimize');
    if (btn) {
      btn.textContent = minimized ? '+' : '−';
      btn.title = minimized ? 'Expand' : 'Minimize';
      btn.setAttribute('aria-label', minimized ? 'Expand overlay' : 'Minimize overlay');
    }
  },

  toggleMinimize() {
    this.setMinimized(!this.el?.classList.contains('irctc-ext-overlay--minimized'));
  },

  async show() {
    await IRCTCExt.Overlay.init();
    if (IRCTCExt.Overlay.el) {
      IRCTCExt.Overlay.el.classList.remove('irctc-ext-overlay--hidden');
    }
    if (window.innerWidth <= 600) {
      IRCTCExt.Overlay.setMinimized(true);
    }
    const config = await IRCTCExt.Storage.get().catch(() => null);
    if (config) IRCTCExt.Overlay.updatePauseButton(config.state?.paused);
    return IRCTCExt.Overlay;
  },

  hide() {
    if (this.el) this.el.classList.add('irctc-ext-overlay--hidden');
    this.stopTimer();
  },

  startTimer() {
    this.startTime = Date.now();
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      const sec = Math.floor((Date.now() - this.startTime) / 1000);
      const timer = document.getElementById('irctc-ext-timer');
      if (timer) timer.textContent = `Elapsed: ${sec}s`;
    }, 1000);
  },

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  },

  setStep(step) {
    const el = document.getElementById('irctc-ext-step');
    if (el) el.textContent = step;
  },

  setStatus(msg) {
    const el = document.getElementById('irctc-ext-status');
    if (el) el.textContent = msg;
  },

  setError(msg) {
    const el = document.getElementById('irctc-ext-error');
    if (el) el.textContent = msg || '';
  },

  showPause(message, onContinue) {
    this.onContinue = onContinue;
    const panel = document.getElementById('irctc-ext-pause-panel');
    const msg = document.getElementById('irctc-ext-pause-msg');
    if (msg) msg.textContent = message;
    if (panel) panel.style.display = 'block';
  },

  updatePauseButton(paused) {
    const btn = document.getElementById('irctc-ext-pause');
    if (btn) btn.textContent = paused ? 'Resume' : 'Pause';
  },

  async togglePause() {
    const config = await IRCTCExt.Storage.get();
    if (!config.state.running) {
      this.setStatus('Not running');
      return;
    }

    const paused = !config.state.paused;
    await IRCTCExt.Storage.updateState({ paused });
    this.updatePauseButton(paused);
    this.setStatus(paused ? 'Paused' : 'Resumed');
    this.setStep(paused ? 'Paused' : config.state.currentStep || 'Running');

    if (!paused && window.IRCTCExt?.Bot) {
      await IRCTCExt.Bot.resumeIfNeeded();
    }
  },

  async restart() {
    if (!window.IRCTCExt?.Bot) return;
    try {
      this.setError('');
      this.setStatus('Refreshing page to restart...');
      await IRCTCExt.Bot.restart();
    } catch (err) {
      console.error('[IRCTC-Bot] Restart failed:', err);
      this.setError(err.message || String(err));
      this.setStatus('Restart failed');
      this.setStep('Error');
    }
  },

  async stop() {
    this.setStatus('Stopping...');
    this.setStep('Stopped');
    this.stopTimer();

    if (window.IRCTCExt?.Bot?.stop) {
      await IRCTCExt.Bot.stop();
      return;
    }

    await IRCTCExt.Storage.updateState({ running: false, paused: false, status: 'stopped', currentStep: 'init' });
    this.setStatus('Stopped');
    if (typeof this.onStop === 'function') this.onStop();
    location.reload();
  }
};

;
(function (root) {
  root.IRCTCExt = root.IRCTCExt || {};
})(typeof globalThis !== 'undefined' ? globalThis : window);

IRCTCExt.GatewayBot = {
  running: false,

  async resumeIfNeeded() {
    const config = await IRCTCExt.Storage.get();
    if (!config.state.running || config.state.paused || !config.state.awaitingGateway) return;
    if (this.running) return;

    if (IRCTCExt.EticketSelectors) {
      IRCTCExt.SELECTORS = IRCTCExt.EticketSelectors;
    }

    this.running = true;
    try {
      const overlay = await IRCTCExt.Overlay.show();
      overlay.startTimer();
      overlay.setStep('Payment');
      overlay.setError('');
      overlay.setStatus('Payment gateway loaded — continuing automation...');
      await IRCTCExt.Gateways.run(config, overlay);
    } catch (err) {
      console.error('[IRCTC-Gateway]', err);
      const overlay = await IRCTCExt.Overlay.show().catch(() => null);
      overlay?.setError(err.message || String(err));
      overlay?.setStatus('Gateway payment failed: ' + (err.message || err));
      overlay?.setStep('Error');
      await IRCTCExt.Storage.updateState({
        status: 'error',
        running: false,
        awaitingGateway: false,
        message: err.message
      });
      IRCTCExt.PlatformBridge?.sendMessage('BOOKING_STATUS', {
        status: 'error',
        message: err.message
      });
    } finally {
      this.running = false;
    }
  },

  init() {
    if (IRCTCExt.GatewayBot._initialized) return;
    IRCTCExt.GatewayBot._initialized = true;

    IRCTCExt.Wait.installIrctcNoiseFilter?.();
    IRCTCExt.Overlay.init().catch((err) => console.warn('[IRCTC-Gateway] Overlay init:', err));

    const handleMessage = (msg, sendResponse) => {
      if (msg.type === 'PING') {
        sendResponse({ ok: true });
        return true;
      }
      if (msg.type === 'RESUME_GATEWAY' || msg.type === 'START_GATEWAY') {
        IRCTCExt.GatewayBot.resumeIfNeeded().catch((err) =>
          console.error('[IRCTC-Gateway] Resume failed:', err)
        );
        sendResponse({ ok: true });
        return true;
      }
      if (msg.type === 'STOP_BOOKING') {
        IRCTCExt.Overlay.stop?.();
        sendResponse({ ok: true });
        return true;
      }
      return false;
    };

    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => handleMessage(msg, sendResponse));
    } else if (IRCTCExt.PlatformBridge?.onMessage) {
      IRCTCExt.PlatformBridge.onMessage(handleMessage);
    }

    IRCTCExt.Wait.poll(() => document.body, { timeout: 10000, interval: 50 }).then(() => {
      IRCTCExt.GatewayBot.resumeIfNeeded();
    });
  }
};

IRCTCExt.GatewayBot.init();
