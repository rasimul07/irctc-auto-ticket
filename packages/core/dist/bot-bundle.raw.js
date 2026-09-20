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
(function (root) {
  root.IRCTCExt = root.IRCTCExt || {};

  if (!IRCTCExt.SiteRegistry) {
    IRCTCExt.SiteRegistry = {
      SITES: {},

      register(site) {
        if (site?.id) this.SITES[site.id] = site;
      },

      getSiteId(config) {
        return config?.preferences?.bookingSite === 'nget' ? 'nget' : 'eticket';
      },

      get(config) {
        const id = this.getSiteId(config);
        const site = this.SITES[id];
        if (site) return site;
        if (id !== 'eticket') {
          console.warn(`[IRCTC-Bot] Site "${id}" is not loaded. Reload the extension.`);
        }
        return this.SITES.eticket;
      },

      getById(id) {
        return this.SITES[id] || this.SITES.eticket;
      },

      activateSelectors(config) {
        const site = this.get(config);
        if (!site) {
          throw new Error('Booking site profile not loaded. Reload the extension.');
        }
        if (site.selectors) IRCTCExt.SELECTORS = site.selectors;
        return site;
      }
    };
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);

;
(function (root) {
  root.IRCTCExt = root.IRCTCExt || {};

  IRCTCExt.EticketConfig = {
    id: 'eticket',
    label: 'Beta — eticket',
    homeUrl: 'https://www.irctc.co.in/eticket',
    trainSearchUrl: 'https://www.irctc.co.in/eticket/train-search',
    trainSearchPath: '/eticket/train-search',
    trainListUrl: 'https://www.irctc.co.in/eticket/booking/train-list',
    trainListPath: '/eticket/booking/train-list',
    urlPattern: 'https://www.irctc.co.in/eticket/*',
    trainSearchUrlPattern: 'https://www.irctc.co.in/eticket/train-search*',
    errorPagePath: '/eticket/error'
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);

;
window.IRCTCExt = window.IRCTCExt || {};

IRCTCExt.EticketPaths = {
  syncStepFromPath(path, state = {}) {
    if (path.includes('bkgPaymentOptions')) return 'payment';
    if (path.includes('reviewBooking')) return 'review';
    if (path.includes('psgninput')) return state.passengersDone ? 'review' : 'passengers';
    // Redirect to /eticket/booking/train-list confirms search was submitted.
    if (IRCTCExt.EticketPaths.isTrainListPath(path)) return 'train-list';
    // Fill journey details on train-search, then click Search.
    if (IRCTCExt.EticketPaths.isTrainSearchPath(path)) return 'search';
    return 'init';
  },

  isErrorPage(path = location.pathname) {
    return path.includes(IRCTCExt.EticketConfig.errorPagePath);
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
    return path.includes(searchPath) || path.includes('train-search');
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
      'p-dropdown[formcontrolname="passengerGender"] .ui-dropdown-trigger-icon',
      'p-dropdown[formcontrolname="passengerGender"] .ui-dropdown-trigger',
      'p-dropdown[formcontrolname="passengerGender"]'
    ],
    newPassengerBerth: [
      'p-dropdown[formcontrolname="passengerBerthChoice"] .ui-dropdown-trigger-icon',
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
    newPassengerAutocompletePanel: [
      '.ui-autocomplete-panel li',
      'ul.ui-autocomplete-items li',
      '.p-autocomplete-panel li'
    ],
    newPassengerValidationError: ['.ap-validation-messages small'],
    newPassengerAddBtn: [
      '.ap-dialog-actions button.ap-add-btn',
      'button.ap-add-btn.app-modal-button--primary',
      'button.ap-add-btn'
    ],
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
  irctcPaymentsGateway: {
    cardAccordionBtn: ['#cardAccordionBtn', 'button.accordion-button.explore-btn'],
    cardAccordionPanel: ['#collapseOne', '#cardAccordionBtn + .accordion-collapse'],
    cardForm: ['#inputForm', 'form[name="inputForm"]', '#collapseOne form'],
    cardNumberMasked: ['#cardNoMasked', 'input[name="cardNoMasked"]', '#collapseOne input[placeholder*="XXXX"]'],
    expiryMonth: ['#month', 'select[name="expiry-month1"]', '#collapseOne select[name*="month" i]'],
    expiryYear: ['#year', 'select[name="expiry-year1"]', '#collapseOne select[name*="year" i]'],
    cvv: ['#cvv', 'input[name="cvv"]'],
    nameOnCard: ['#nameOnCard', 'input[name="nameOnCard"]'],
    smartPayToggle: ['#cardSmartPayToggle', '#collapseOne #cardSmartPayToggle'],
    upiBhimAccordionBtn: ['#upiAccordionBtn', 'button[data-bs-target="#collapseUpi"]'],
    upiBhimAccordionPanel: ['#collapseUpi'],
    upiBhimQrRadio: ['#qr-click', 'input[data-click="toggleQR"]'],
    upiBhimQrSection: ['#show-qr-div', '.showQRDiv'],
    upiCcClAccordionBtn: ['#upiCcClAccordionBtn'],
    upiCcClAccordionPanel: ['#collapseCcCl', '#upiCcClAccordionBtn + .accordion-collapse'],
    upiCcClQrRadio: ['#qr-click-cccl'],
    upiCcClQrSection: ['#show-qr-div-cccl'],
    upiQrModal: ['.modal.show', '.modal.fade.show', '[role="dialog"].show'],
    upiShowQrBtn: ['#irctc-generate-qr-btn', 'button[data-click="showUpiQR"]'],
    upiQrImage: ['#irctc-qr-code', 'canvas', 'img[src*="qr" i]', '.qr-code img'],
    payNowBtn: ['button.pay-now-btn', '.pay-now-btn', 'button.btn-primary'],
    cardErrors: ['#cardErrFld', '#cardMonthErr', '#cardYearErr', '#cardcvvFld', '#cardErrFld1']
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

IRCTCExt.EticketTrainList = {
  setStatus(overlay, msg) {
    overlay?.setStatus(msg);
  },

  isInViewport(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth;
  },

  scrollIntoViewIfNeeded(el) {
    if (!el || IRCTCExt.EticketTrainList.isInViewport(el)) return;
    el.scrollIntoView({ block: 'center', inline: 'nearest' });
  },

  normalizeTrainText(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  },

  scoreTrainName(cardName, searchName) {
    const a = IRCTCExt.EticketTrainList.normalizeTrainText(cardName);
    const b = IRCTCExt.EticketTrainList.normalizeTrainText(searchName);
    if (!b) return 0;
    if (a === b) return 100;
    if (a.includes(b) || b.includes(a)) return 80;

    const wordsA = a.split(' ').filter(Boolean);
    const wordsB = b.split(' ').filter(Boolean);
    if (!wordsB.length) return 0;

    const overlap = wordsB.filter((word) =>
      wordsA.some((cardWord) => cardWord.includes(word) || word.includes(cardWord))
    ).length;
    return Math.round((overlap / wordsB.length) * 70);
  },

  isPopulatedTrainCard(card) {
    if (!card || !IRCTCExt.Wait.isVisible(card)) return false;
    const sel = IRCTCExt.SELECTORS.trainList;
    return !!(
      IRCTCExt.Wait.queryOne(sel.trainListing, card) &&
      IRCTCExt.Wait.queryOne(sel.trainNumber, card)
    );
  },

  getPopulatedTrainCards() {
    const sel = IRCTCExt.SELECTORS.trainList;
    return [...document.querySelectorAll(sel.trainCard?.[0] || 'app-train-avl-enq')].filter((card) =>
      IRCTCExt.EticketTrainList.isPopulatedTrainCard(card)
    );
  },

  getCardTrainName(card) {
    const sel = IRCTCExt.SELECTORS.trainList;
    const nameEl = IRCTCExt.Wait.queryOne(sel.trainName, card);
    return (nameEl?.textContent || '').trim();
  },

  getCardTrainNumber(card) {
    const sel = IRCTCExt.SELECTORS.trainList;
    const numEl = IRCTCExt.Wait.queryOne(sel.trainNumber, card);
    return (numEl?.textContent || '').trim();
  },

  findTrainCardByNumberDirect(trainNo) {
    if (!trainNo) return null;

    const normalized = String(trainNo).trim();
    const sel = IRCTCExt.SELECTORS.trainList;
    const numEl = [...document.querySelectorAll(`${sel.trainCard?.[0] || 'app-train-avl-enq'} ${sel.trainNumber?.[0] || '.train-number'}`)].find(
      (el) => (el.textContent || '').trim() === normalized
    );
    const card = numEl?.closest('app-train-avl-enq') || null;
    return card && IRCTCExt.EticketTrainList.isPopulatedTrainCard(card) ? card : null;
  },

  findTrainCardByNumber(trainNo) {
    const direct = IRCTCExt.EticketTrainList.findTrainCardByNumberDirect(trainNo);
    if (direct) return direct;

    const normalized = String(trainNo || '').trim();
    if (!normalized) return null;

    for (const card of IRCTCExt.EticketTrainList.getPopulatedTrainCards()) {
      const heading = card.querySelector('.train-heading strong');
      if (heading && new RegExp(`\\(\\s*${normalized}\\s*\\)`).test(heading.textContent)) {
        return card;
      }
    }
    return null;
  },

  findTrainCardByNameDirect(trainName, minScore = 50) {
    if (!trainName) return null;

    const normalizedSearch = IRCTCExt.EticketTrainList.normalizeTrainText(trainName);
    let bestCard = null;
    let bestScore = 0;

    for (const card of IRCTCExt.EticketTrainList.getPopulatedTrainCards()) {
      const name = IRCTCExt.EticketTrainList.getCardTrainName(card);
      const normalizedName = IRCTCExt.EticketTrainList.normalizeTrainText(name);
      if (normalizedName === normalizedSearch) return card;

      const score = IRCTCExt.EticketTrainList.scoreTrainName(name, trainName);
      if (score > bestScore) {
        bestScore = score;
        bestCard = card;
      }
    }

    return bestScore >= minScore ? bestCard : null;
  },

  findTrainCardByName(trainName, minScore = 50) {
    return IRCTCExt.EticketTrainList.findTrainCardByNameDirect(trainName, minScore);
  },

  findTrainCard(journey = {}) {
    const trainNo = String(journey.trainNo || '').trim();
    const trainName = String(journey.trainName || '').trim();

    if (trainNo) {
      const byNumber = IRCTCExt.EticketTrainList.findTrainCardByNumber(trainNo);
      if (byNumber) return byNumber;
    }

    if (trainName) {
      const byName = IRCTCExt.EticketTrainList.findTrainCardByName(trainName);
      if (byName) return byName;
    }

    if (trainName || trainNo) return null;

    const cards = IRCTCExt.EticketTrainList.getPopulatedTrainCards();
    return cards[0] || null;
  },

  async waitForTrainListReady(overlay) {
    IRCTCExt.EticketTrainList.setStatus(overlay, 'Waiting for train list...');
    const sel = IRCTCExt.SELECTORS.trainList;

    const ready = await IRCTCExt.Wait.poll(
      () => {
        if (IRCTCExt.EticketTrainList.getPopulatedTrainCards().length > 0) return true;
        const container = IRCTCExt.Wait.queryOne(sel.container);
        return container && IRCTCExt.Wait.isVisible(container) ? true : null;
      },
      { timeout: 20000, interval: 100 }
    );

    if (!ready) throw new Error('Train list did not load');
  },

  async findTrainCardWithPoll(journey, searchLabel, overlay) {
    IRCTCExt.EticketTrainList.setStatus(overlay, `Searching train list for ${searchLabel}...`);

    let card = IRCTCExt.EticketTrainList.findTrainCard(journey);
    if (card) return card;

    card = await IRCTCExt.Wait.poll(() => IRCTCExt.EticketTrainList.findTrainCard(journey), {
      timeout: 8000,
      interval: 100
    });

    if (!card && (journey.trainName || journey.trainNo)) {
      throw new Error(`Train ${searchLabel} not found in results`);
    }
    if (!card) {
      throw new Error('No trains found on page');
    }
    return card;
  },

  classMatchesCode(classCodeEl, travelClass) {
    if (!classCodeEl || !travelClass) return false;
    const text = (classCodeEl.textContent || '').trim();
    const label = IRCTCExt.Stations.getClassLabel(travelClass);
    return text.includes(label) || text.includes(`(${travelClass})`) || text.endsWith(travelClass);
  },

  hasClassCards(card) {
    if (!card) return false;

    const sel = IRCTCExt.SELECTORS.trainList;
    if (card.querySelectorAll(`${sel.availableClasses?.[0] || '.available-classes'} ${sel.classCard?.[0] || '.class-card'}`).length > 0) {
      return true;
    }

    const classCards = card.querySelectorAll(sel.classCard?.[0] || '.class-card');
    for (const classCard of classCards) {
      if (
        classCard.querySelector(sel.classStatus?.[0] || '.class-status') ||
        classCard.querySelector(sel.bookBtn?.[0] || 'button.btn-book')
      ) {
        return true;
      }
    }

    if (card.querySelectorAll(sel.classCell?.[0] || 'div.pre-avl').length > 0) return true;

    const bookButtons = card.querySelectorAll(sel.bookBtn?.[0] || 'button.btn-book');
    return [...bookButtons].some((btn) => IRCTCExt.Wait.isVisible(btn));
  },

  getClassCards(card) {
    const sel = IRCTCExt.SELECTORS.trainList;
    const cards = card.querySelectorAll(sel.classCard?.[0] || '.class-card');
    if (cards.length) return [...cards];

    return [...card.querySelectorAll(sel.classCell?.[0] || 'div.pre-avl')];
  },

  classCardMatchesTravelClass(classCard, travelClass) {
    if (!classCard || !travelClass) return false;

    const sel = IRCTCExt.SELECTORS.trainList;
    const codeEl = classCard.querySelector(sel.classCode?.[0] || '.class-code');
    if (IRCTCExt.EticketTrainList.classMatchesCode(codeEl, travelClass)) return true;

    const codeText = (codeEl?.textContent || classCard.textContent || '').trim();
    const normalizedClass = String(travelClass).trim().toUpperCase();
    if (new RegExp(`\\b${normalizedClass}\\b`).test(codeText.toUpperCase())) return true;

    return false;
  },

  findClassCard(card, travelClass) {
    for (const classCard of IRCTCExt.EticketTrainList.getClassCards(card)) {
      if (IRCTCExt.EticketTrainList.classCardMatchesTravelClass(classCard, travelClass)) return classCard;
    }
    return null;
  },

  parseClassStatus(classCard) {
    const sel = IRCTCExt.SELECTORS.trainList;
    const statusEl = classCard?.querySelector(sel.classStatus?.[0] || '.class-status');
    if (!statusEl) return { type: '', text: '' };

    const text = (statusEl.textContent || '').trim();
    const status = { type: '', text };

    if (statusEl.classList.contains('AVAILABLE')) status.type = 'AVAILABLE';
    else if (statusEl.classList.contains('RAC')) status.type = 'RAC';
    else if (statusEl.classList.contains('WL')) status.type = 'WL';
    else if (statusEl.classList.contains('REGRET')) status.type = 'REGRET';

    if (!status.type) {
      const upper = text.toUpperCase();
      if (upper.includes('AVAILABLE')) status.type = 'AVAILABLE';
      else if (/\bRAC\b/.test(upper)) status.type = 'RAC';
      else if (upper.includes('WL')) status.type = 'WL';
      else if (upper.includes('REGRET')) status.type = 'REGRET';
    }

    if (IRCTCExt.EticketTrainList.isHighLoadStatus(status)) {
      status.type = 'HIGH_LOAD';
    }

    return status;
  },

  isHighLoadStatus(status) {
    const text = String(status?.text || '');
    return /high\s*load|please\s*retry/i.test(text);
  },

  isRetryableAvailabilityError(status) {
    return IRCTCExt.EticketTrainList.isHighLoadStatus(status) || status?.type === 'HIGH_LOAD';
  },

  isBookableStatus(statusType) {
    return statusType === 'AVAILABLE' || statusType === 'RAC';
  },

  isAvailabilityButtonBusy(btn) {
    if (!btn) return false;
    if (btn.disabled) return true;
    if (btn.getAttribute('aria-disabled') === 'true') return true;
    if (btn.classList.contains('ui-button-loading')) return true;
    return /\b(checking|loading)\b/i.test(btn.textContent || '');
  },

  findRefreshAvailabilityButton(card) {
    const sel = IRCTCExt.SELECTORS.trainList;
    const candidates = IRCTCExt.Wait.queryAll(sel.refreshAvailabilityBtn || sel.availabilityBtn, card);
    const refreshBtn = candidates.find(
      (btn) => /refresh\s*availability/i.test(btn.textContent || '') && IRCTCExt.Wait.isVisible(btn)
    );
    if (refreshBtn) return refreshBtn;

    const buttons = card.querySelectorAll('button');
    return (
      [...buttons].find(
        (btn) => /refresh\s*availability/i.test(btn.textContent || '') && IRCTCExt.Wait.isVisible(btn)
      ) || null
    );
  },

  findClassRefreshIcon(classCard) {
    if (!classCard) return null;
    const sel = IRCTCExt.SELECTORS.trainList;
    const icons = IRCTCExt.Wait.queryAll(sel.classRefreshIcon, classCard);
    return icons.find((icon) => IRCTCExt.Wait.isVisible(icon)) || null;
  },

  findAvailabilityButton(card) {
    const refreshBtn = IRCTCExt.EticketTrainList.findRefreshAvailabilityButton(card);
    if (refreshBtn && !IRCTCExt.EticketTrainList.isAvailabilityButtonBusy(refreshBtn)) {
      return refreshBtn;
    }

    const sel = IRCTCExt.SELECTORS.trainList;
    const direct = IRCTCExt.Wait.queryOne(sel.availabilityBtn, card);
    if (direct && IRCTCExt.Wait.isVisible(direct) && !IRCTCExt.EticketTrainList.isAvailabilityButtonBusy(direct)) {
      return direct;
    }

    const buttons = card.querySelectorAll('button');
    return (
      [...buttons].find((btn) => {
        if (!IRCTCExt.Wait.isVisible(btn)) return false;
        if (IRCTCExt.EticketTrainList.isAvailabilityButtonBusy(btn)) return false;
        return /check\s*availability|refresh\s*availability/i.test(btn.textContent || '');
      }) || null
    );
  },

  findAvailabilityRefreshControl(card, classCard) {
    const refreshBtn = IRCTCExt.EticketTrainList.findRefreshAvailabilityButton(card);
    if (refreshBtn && !IRCTCExt.EticketTrainList.isAvailabilityButtonBusy(refreshBtn)) {
      return refreshBtn;
    }
    return IRCTCExt.EticketTrainList.findClassRefreshIcon(classCard);
  },

  async waitForBookableClass(card, classCard, travelClass, overlay) {
    let attempt = 0;

    while (await IRCTCExt.Bot.isRunning()) {
      const control = await IRCTCExt.Bot.checkControlState();
      if (control === 'stopped') {
        throw new Error('Booking stopped');
      }
      if (control === 'paused') {
        IRCTCExt.EticketTrainList.setStatus(overlay, 'Paused — click Resume to continue...');
        await IRCTCExt.Bot.waitUntilResumedOrStopped();
        if (!(await IRCTCExt.Bot.isRunning())) {
          throw new Error('Booking stopped');
        }
        continue;
      }
      const status = IRCTCExt.EticketTrainList.parseClassStatus(classCard);
      if (IRCTCExt.EticketTrainList.isBookableStatus(status.type)) {
        return status;
      }

      if (!IRCTCExt.EticketTrainList.isRetryableAvailabilityError(status)) {
        throw new Error(
          `${travelClass} shows ${status.text || status.type || 'not available'} — not bookable`
        );
      }

      attempt += 1;
      IRCTCExt.EticketTrainList.setStatus(
        overlay,
        `High load on ${travelClass} — refreshing (attempt ${attempt})...`
      );

      const refreshControl = IRCTCExt.EticketTrainList.findAvailabilityRefreshControl(card, classCard);
      if (refreshControl) {
        IRCTCExt.EticketTrainList.scrollIntoViewIfNeeded(classCard);
        IRCTCExt.Events.click(refreshControl);
      }

      await IRCTCExt.Wait.delay(600);

      const previousText = status.text;
      await IRCTCExt.Wait.poll(
        () => {
          const next = IRCTCExt.EticketTrainList.parseClassStatus(classCard);
          if (IRCTCExt.EticketTrainList.isBookableStatus(next.type)) return next;
          if (next.text !== previousText) return next;
          return null;
        },
        { timeout: 8000, interval: 200 }
      );
    }

    throw new Error('Booking stopped');
  },

  async loadAvailability(card, overlay, travelClass, maxAttempts = 3) {
    if (IRCTCExt.EticketTrainList.hasClassCards(card)) {
      IRCTCExt.EticketTrainList.setStatus(
        overlay,
        `Availability already loaded — selecting class ${travelClass}...`
      );
      return true;
    }

    IRCTCExt.EticketTrainList.scrollIntoViewIfNeeded(card);

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      if (IRCTCExt.EticketTrainList.hasClassCards(card)) {
        IRCTCExt.EticketTrainList.setStatus(
          overlay,
          `Availability loaded — selecting class ${travelClass}...`
        );
        return true;
      }

      const btn = IRCTCExt.EticketTrainList.findAvailabilityButton(card);
      if (!btn) {
        if (IRCTCExt.EticketTrainList.hasClassCards(card)) return true;
        throw new Error('Check Availability button not found');
      }

      IRCTCExt.EticketTrainList.setStatus(
        overlay,
        attempt === 0
          ? 'Clicking Check Availability...'
          : `Retrying Check Availability (${attempt + 1}/${maxAttempts})...`
      );

      IRCTCExt.Events.click(btn);
      await IRCTCExt.Wait.delay(attempt === 0 ? 350 : 500);

      const loaded = await IRCTCExt.Wait.poll(() => IRCTCExt.EticketTrainList.hasClassCards(card), {
        timeout: 8000,
        interval: 100
      });
      if (loaded) {
        IRCTCExt.EticketTrainList.setStatus(
          overlay,
          `Availability loaded — selecting class ${travelClass}...`
        );
        return true;
      }
    }

    throw new Error('Class availability did not load');
  },

  async findClassCardWithScroll(card, travelClass, overlay) {
    for (let i = 0; i < 6; i += 1) {
      const classCard = IRCTCExt.EticketTrainList.findClassCard(card, travelClass);
      if (classCard) return classCard;

      const scrollBtn = card.querySelector('.btn-scroll-next');
      if (!scrollBtn || !IRCTCExt.Wait.isVisible(scrollBtn)) break;

      IRCTCExt.EticketTrainList.setStatus(overlay, `Scrolling to find class ${travelClass}...`);
      IRCTCExt.Events.click(scrollBtn);
      await IRCTCExt.Wait.delay(250);
    }
    return IRCTCExt.EticketTrainList.findClassCard(card, travelClass);
  },

  async bookTrain(config, overlay) {
    const { journey } = config;

    overlay?.setStep('Train List');
    await IRCTCExt.EticketTrainList.waitForTrainListReady(overlay);

    const trainName = String(journey.trainName || '').trim();
    const trainNo = String(journey.trainNo || '').trim();
    const searchLabel = trainNo || trainName || 'train';
    const travelClass = journey.travelClass || 'SL';

    const card = await IRCTCExt.EticketTrainList.findTrainCardWithPoll(journey, searchLabel, overlay);

    const trainNum = IRCTCExt.EticketTrainList.getCardTrainNumber(card) || trainNo || '';
    const matchedName = IRCTCExt.EticketTrainList.getCardTrainName(card);
    const foundLabel =
      trainNum && matchedName
        ? `Found train ${trainNum} — ${matchedName}`
        : matchedName
          ? `Found train ${matchedName}`
          : `Found train ${trainNum}`;
    IRCTCExt.EticketTrainList.setStatus(overlay, foundLabel);

    await IRCTCExt.EticketTrainList.loadAvailability(card, overlay, travelClass);

    const classCard = await IRCTCExt.EticketTrainList.findClassCardWithScroll(card, travelClass, overlay);
    if (!classCard) throw new Error(`Class ${travelClass} not found for train ${trainNum}`);

    const status = await IRCTCExt.EticketTrainList.waitForBookableClass(
      card,
      classCard,
      travelClass,
      overlay
    );

    const bookBtn = classCard.querySelector('button.btn-book');
    if (!bookBtn) throw new Error(`BOOK button not found for class ${travelClass}`);

    IRCTCExt.EticketTrainList.setStatus(
      overlay,
      `Class ${travelClass} available (${status.text || status.type}) — clicking Book...`
    );
    IRCTCExt.EticketTrainList.scrollIntoViewIfNeeded(classCard);
    IRCTCExt.Events.click(bookBtn);
    await IRCTCExt.Wait.delay(400);

    IRCTCExt.EticketTrainList.setStatus(overlay, 'Book clicked — waiting for passenger page...');
    await IRCTCExt.EticketTrainList.confirmBookingAndWait(overlay);
    return true;
  },

  async confirmBookingAndWait(overlay) {
    if (location.pathname.includes('psgninput')) {
      return true;
    }

    const deadline = Date.now() + 25000;

    while (Date.now() < deadline) {
      if (location.pathname.includes('psgninput')) {
        return true;
      }

      await IRCTCExt.Wait.delay(100);
    }

    if (location.pathname.includes('psgninput')) {
      return true;
    }

    throw new Error('Did not reach passenger input page after booking');
  }
};

;
window.IRCTCExt = window.IRCTCExt || {};

IRCTCExt.EticketLoginFlow = {
  headerLoginButton() {
    const buttons = IRCTCExt.Wait.queryAll(IRCTCExt.SELECTORS.loginHeaderBtn);
    return buttons.find(
      (btn) =>
        !btn.closest('#newLogin, .login-dialog, .login-wrapper, .login-form') &&
        (btn.textContent || '').toUpperCase().includes('LOGIN')
    );
  },

  hasChallenge() {
    const captcha = IRCTCExt.Wait.queryOne(IRCTCExt.SELECTORS.loginCaptcha);
    if (captcha && IRCTCExt.Wait.isVisible(captcha)) return true;
    const otp = document.querySelector(
      'input[placeholder*="OTP"], input[placeholder*="otp"], input[formcontrolname*="otp"]'
    );
    return !!(otp && IRCTCExt.Wait.isVisible(otp));
  },

  async isLoggedIn() {
    if (IRCTCExt.EticketLoginFlow.headerLoginButton()) return false;
    if (IRCTCExt.Wait.queryOne(IRCTCExt.SELECTORS.loggedInProfile)) return true;
    const oldLogin = document.querySelector('a.search_btn.loginText');
    if (oldLogin && oldLogin.textContent.toUpperCase().includes('LOGIN')) return false;
    if (IRCTCExt.Wait.queryOne(['#newLogin .login-form', '.login-dialog .login-form'])) return false;
    return !IRCTCExt.EticketLoginFlow.headerLoginButton();
  },

  async openLoginModal() {
    const loginBtn = IRCTCExt.EticketLoginFlow.headerLoginButton();
    if (loginBtn) {
      IRCTCExt.Events.click(loginBtn);
      await IRCTCExt.Wait.delay(600);
    }
    await IRCTCExt.Wait.waitFor(IRCTCExt.SELECTORS.loginModal, { timeout: 8000 });

    const tabs = Array.from(document.querySelectorAll('.login-tab'));
    const userTab = tabs.find((tab) => (tab.textContent || '').toUpperCase().includes('USER'));
    if (userTab && !userTab.classList.contains('active')) {
      IRCTCExt.Events.click(userTab);
      await IRCTCExt.Wait.delay(300);
    }
  },

  async waitForEnabledSubmit() {
    return IRCTCExt.Wait.poll(
      () => {
        const submit = IRCTCExt.Wait.queryOne(IRCTCExt.SELECTORS.loginSubmit);
        if (!submit) return null;
        if (submit.classList.contains('disabled-state') || submit.disabled) return null;
        return submit;
      },
      { timeout: 8000, interval: 150 }
    );
  },

  async waitForCaptchaContinue(overlay) {
    overlay.setStatus('CAPTCHA or OTP required. Complete it, then click Continue.');
    await IRCTCExt.Storage.updateState({ currentStep: 'login-captcha', paused: true });
    await new Promise((resolve) => {
      overlay.showPause('Complete CAPTCHA or OTP in the login form, then click Continue.', async () => {
        const submit = IRCTCExt.Wait.queryOne(IRCTCExt.SELECTORS.loginSubmit);
        if (submit && !submit.classList.contains('disabled-state')) {
          IRCTCExt.Events.click(submit);
        }
        await IRCTCExt.Storage.updateState({ paused: false });
        await IRCTCExt.Wait.delay(1500);
        resolve();
      });
    });
  },

  async run(config, overlay) {
    await IRCTCExt.Wait.poll(
      () =>
        IRCTCExt.EticketLoginFlow.headerLoginButton() ||
        IRCTCExt.Wait.queryOne(IRCTCExt.SELECTORS.loggedInProfile) ||
        document.querySelector('a.search_btn.loginText') ||
        IRCTCExt.Wait.queryOne(IRCTCExt.SELECTORS.searchFrom),
      { timeout: 12000, interval: 200 }
    );

    if (await IRCTCExt.EticketLoginFlow.isLoggedIn()) {
      overlay.setStatus('Already logged in');
      return true;
    }

    overlay.setStep('Login');
    overlay.setStatus('Opening login...');
    await IRCTCExt.EticketLoginFlow.openLoginModal();

    const userInput = await IRCTCExt.Wait.waitFor(IRCTCExt.SELECTORS.loginUsername, {
      timeout: 10000,
      visible: true
    });
    const passInput = await IRCTCExt.Wait.waitFor(IRCTCExt.SELECTORS.loginPassword, {
      timeout: 10000,
      visible: true
    });
    if (!userInput || !passInput) throw new Error('Login form not found');

    overlay.setStatus('Filling username and password...');
    IRCTCExt.Events.setInputValue(userInput, config.credentials.username);
    IRCTCExt.Events.setInputValue(passInput, config.credentials.password);

    if (IRCTCExt.EticketLoginFlow.hasChallenge()) {
      await IRCTCExt.EticketLoginFlow.waitForCaptchaContinue(overlay);
    } else {
      const submit = await IRCTCExt.EticketLoginFlow.waitForEnabledSubmit();
      if (!submit) throw new Error('Login button stayed disabled');
      overlay.setStatus('Submitting login...');
      IRCTCExt.Events.click(submit);
      await IRCTCExt.Wait.delay(800);

      if (IRCTCExt.EticketLoginFlow.hasChallenge()) {
        await IRCTCExt.EticketLoginFlow.waitForCaptchaContinue(overlay);
      }
    }

    await IRCTCExt.Wait.poll(() => IRCTCExt.EticketLoginFlow.isLoggedIn(), { timeout: 20000, interval: 400 });
    if (!(await IRCTCExt.EticketLoginFlow.isLoggedIn())) {
      throw new Error('Login failed or timed out');
    }

    overlay.setStatus('Login successful');
    return true;
  },

  async runWithRetry(config, overlay, { maxAttempts = 3 } = {}) {
    if (await IRCTCExt.EticketLoginFlow.isLoggedIn()) {
      overlay.setStatus('Already logged in');
      return true;
    }

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await IRCTCExt.EticketLoginFlow.run(config, overlay);
        if (await IRCTCExt.EticketLoginFlow.isLoggedIn()) return true;
      } catch (err) {
        if (attempt >= maxAttempts) throw err;
        console.warn(`[IRCTC-Bot] Login attempt ${attempt}/${maxAttempts}:`, err);
        overlay.setStatus(`Login failed, retry ${attempt}/${maxAttempts}...`);
        await IRCTCExt.Wait.delay(1500);
      }
    }

    throw new Error(`Login failed after ${maxAttempts} attempts`);
  }
};

;
window.IRCTCExt = window.IRCTCExt || {};

IRCTCExt.EticketSearchFlow = {
  async completeSearchRedirect(overlay) {
    await IRCTCExt.Storage.updateState({
      currentStep: 'train-list',
      running: true,
      status: 'running',
      message: 'Search submitted — loading train list'
    });
    overlay.setStep('train-list');
    overlay.setStatus('Search submitted — loading train list...');
    return true;
  },

  async submitSearchWithRedirect(overlay, { maxAttempts = 3, redirectTimeoutMs = 12000 } = {}) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (IRCTCExt.EticketPaths.isSearchSubmittedPath(location.pathname)) {
        return IRCTCExt.EticketSearchFlow.completeSearchRedirect(overlay);
      }

      overlay.setStatus(attempt === 1 ? 'Submitting search...' : `Retrying search (${attempt}/${maxAttempts})...`);

      const searchBtn = await IRCTCExt.Wait.waitFor(IRCTCExt.SELECTORS.searchButton, { timeout: 5000 });
      if (!searchBtn) throw new Error('Search button not found');

      IRCTCExt.Events.click(searchBtn);

      const redirected = await IRCTCExt.Wait.poll(
        () => IRCTCExt.EticketPaths.isSearchSubmittedPath(location.pathname),
        { timeout: redirectTimeoutMs, interval: 200 }
      );

      if (redirected || IRCTCExt.EticketPaths.isSearchSubmittedPath(location.pathname)) {
        return IRCTCExt.EticketSearchFlow.completeSearchRedirect(overlay);
      }

      if (attempt < maxAttempts) {
        if (IRCTCExt.EticketPaths.isSearchSubmittedPath(location.pathname)) {
          return IRCTCExt.EticketSearchFlow.completeSearchRedirect(overlay);
        }
        overlay.setStatus(`Search did not redirect, retry ${attempt}/${maxAttempts}...`);
        await IRCTCExt.Wait.delay(500);
      }
    }

    if (IRCTCExt.EticketPaths.isSearchSubmittedPath(location.pathname)) {
      return IRCTCExt.EticketSearchFlow.completeSearchRedirect(overlay);
    }

    throw new Error('Search did not open train list');
  },

  async run(config, overlay) {
    if (IRCTCExt.EticketPaths.isSearchSubmittedPath(location.pathname)) {
      return IRCTCExt.EticketSearchFlow.completeSearchRedirect(overlay);
    }

    overlay.setStep('Search');
    overlay.setStatus('Filling journey details...');
    await IRCTCExt.Storage.updateState({ currentStep: 'search' });

    IRCTCExt.Modals.dismissSessionRestore?.();
    await IRCTCExt.Wait.delay(300);

    const fromBox = await IRCTCExt.Wait.waitFor(IRCTCExt.SELECTORS.searchFrom, { timeout: 20000, visible: true });
    const toBox = await IRCTCExt.Wait.waitFor(IRCTCExt.SELECTORS.searchTo, { timeout: 15000, visible: true });
    if (!fromBox || !toBox) throw new Error('Search form not found');

    const fromText = config.journey.from || config.journey.fromCode;
    const toText = config.journey.to || config.journey.toCode;
    if (!fromText || !toText) throw new Error('From/To station not configured');

    overlay.setStatus('Selecting From station...');
    const fromOk = fromBox.classList?.contains('field-box')
      ? await IRCTCExt.Events.fillStationField(fromBox, fromText)
      : await IRCTCExt.Events.fillAutocomplete(fromBox, fromText);
    if (!fromOk) throw new Error('Could not select From station');

    overlay.setStatus('Selecting To station...');
    const toOk = toBox.classList?.contains('field-box')
      ? await IRCTCExt.Events.fillStationField(toBox, toText)
      : await IRCTCExt.Events.fillAutocomplete(toBox, toText);
    if (!toOk) throw new Error('Could not select To station');

    const dateBox = await IRCTCExt.Wait.waitFor(IRCTCExt.SELECTORS.searchDate, { timeout: 5000 });
    const dateStr = IRCTCExt.Stations.formatDateForIRCTC(config.journey.date);
    if (dateBox && dateStr) {
      overlay.setStatus('Selecting travel date...');
      await IRCTCExt.Events.setCalendarDate(dateBox, dateStr);
    }

    const quota = config.journey?.quota || 'TATKAL';
    overlay.setStatus('Selecting quota...');
    const quotaBox = await IRCTCExt.Wait.waitFor(IRCTCExt.SELECTORS.searchQuota, { timeout: 5000 });
    if (!quotaBox) throw new Error('Quota field not found on search form');

    const quotaOk = quotaBox.classList?.contains('field-box')
      ? await IRCTCExt.Events.selectQuotaField(quotaBox, quota)
      : await IRCTCExt.Events.selectDropdown(
          IRCTCExt.SELECTORS.searchQuota,
          IRCTCExt.Stations.quotaOptionText(quota)
        );
    if (!quotaOk) throw new Error(`Could not select quota: ${quota}`);

    return IRCTCExt.EticketSearchFlow.submitSearchWithRedirect(overlay);
  }
};

;
window.IRCTCExt = window.IRCTCExt || {};

IRCTCExt.EticketBookingFlow = {
  async fillPassengers(config, overlay) {
    if (!location.pathname.includes('psgninput')) {
      throw new Error('Not on passenger input page');
    }
    return IRCTCExt.Passengers.addPassengers(config, overlay);
  },

  async configurePsgninputOptions(config, overlay) {
    if (!location.pathname.includes('psgninput')) {
      throw new Error('Not on passenger input page');
    }
    return IRCTCExt.PsgnPreferences.configure(config, overlay);
  },

  async clickContinueToPayment(overlay) {
    if (!location.pathname.includes('reviewBooking')) {
      throw new Error('Not on review booking page');
    }
    return IRCTCExt.PsgnPreferences.clickContinueToPayment(overlay);
  },

  // Legacy flow for old IRCTC payment gateway pages (not used on eticket psgninput).
  async proceedReview(overlay) {
    overlay.setStep('Review');
    overlay.setStatus('Proceeding to review...');
    await IRCTCExt.Storage.updateState({ currentStep: 'review' });

    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    for (const cb of checkboxes) {
      if (!cb.checked && IRCTCExt.Wait.isVisible(cb)) {
        IRCTCExt.Events.click(cb);
      }
    }

    const buttons = Array.from(document.querySelectorAll('button'));
    const proceed = buttons.find((b) => /continue|proceed|review|pay/i.test(b.textContent));
    if (proceed) {
      IRCTCExt.Events.click(proceed);
      await IRCTCExt.Wait.delay(1500);
    }
    return true;
  },

  async showPaymentReview(overlay) {
    overlay.setStep('Payment');
    const message = 'Complete payment manually on IRCTC.';
    if (IRCTCExt.PaymentReviewOverlay?.show) {
      await IRCTCExt.PaymentReviewOverlay.show();
      overlay.showPause(message);
    } else {
      overlay.setStatus(message);
      overlay.showPause?.(message);
    }
    await IRCTCExt.Storage.updateState({ status: 'done', running: false, currentStep: 'done' });
    return true;
  },

  // Legacy flow for old IRCTC payment gateway pages (not used on eticket psgninput).
  async selectPayment(overlay) {
    overlay.setStep('Payment');
    overlay.setStatus('Selecting payment method...');
    await IRCTCExt.Storage.updateState({ currentStep: 'payment' });

    await IRCTCExt.Wait.delay(2000);
    const paymentOption = document.querySelector('.bank-type, .payment-opt, input[type="radio"]');
    if (paymentOption) IRCTCExt.Events.click(paymentOption);

    const payBtn = Array.from(document.querySelectorAll('button')).find((b) => /pay|make payment/i.test(b.textContent));
    if (payBtn) IRCTCExt.Events.click(payBtn);

    overlay.showPause('Complete payment OTP manually on the gateway, then click Continue.', () => {
      overlay.setStatus('Payment step acknowledged.');
    });

    await IRCTCExt.Storage.updateState({ status: 'done', running: false, currentStep: 'done' });
    return true;
  }
};

;
window.IRCTCExt = window.IRCTCExt || {};

IRCTCExt.EticketSite = {
  ...IRCTCExt.EticketConfig,
  selectors: IRCTCExt.EticketSelectors,
  syncStepFromPath: IRCTCExt.EticketPaths.syncStepFromPath.bind(IRCTCExt.EticketPaths),
  isErrorPage: IRCTCExt.EticketPaths.isErrorPage.bind(IRCTCExt.EticketPaths),
  isTrainListPath: IRCTCExt.EticketPaths.isTrainListPath.bind(IRCTCExt.EticketPaths),
  isSearchSubmittedPath: IRCTCExt.EticketPaths.isSearchSubmittedPath.bind(IRCTCExt.EticketPaths),
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

;
(function (root) {
  root.IRCTCExt = root.IRCTCExt || {};

  IRCTCExt.NgetConfig = {
    id: 'nget',
    label: 'Classic — nget',
    homeUrl: 'https://www.irctc.co.in/nget',
    trainSearchUrl: 'https://www.irctc.co.in/nget/train-search',
    trainSearchPath: '/nget/train-search',
    urlPattern: 'https://www.irctc.co.in/nget/*',
    trainSearchUrlPattern: 'https://www.irctc.co.in/nget/train-search*',
    gatewayUrl: 'https://pg.irctcpayments.com/',
    gatewayHost: 'pg.irctcpayments.com',
    gatewayUrlPattern: 'https://pg.irctcpayments.com/*',
    gatewayAuthRedirectPath: '/pg/api/v2/authRedirect',
    thirdPartyGatewayHosts: ['pg.irctcpayments.com', 'irctcipay.com', 'phonepe.com'],
    errorPagePath: '/nget/error'
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);

;
window.IRCTCExt = window.IRCTCExt || {};

// TODO: verify nget path segments when implementing classic flow automation.
IRCTCExt.NgetPaths = {
  isGatewayHost(hostname = location.hostname) {
    const host = IRCTCExt.NgetConfig?.gatewayHost || 'pg.irctcpayments.com';
    return hostname.includes(host) || hostname.includes('irctcpayments.com');
  },

  isGatewayPath(path = location.pathname, hostname = location.hostname) {
    return IRCTCExt.NgetPaths.isGatewayHost(hostname);
  },

  isGatewayAuthRedirectPath(path = location.pathname, hostname = location.hostname) {
    if (!IRCTCExt.NgetPaths.isGatewayHost(hostname)) return false;
    const authPath = IRCTCExt.NgetConfig?.gatewayAuthRedirectPath || '/pg/api/v2/authRedirect';
    return path.includes(authPath) || path.includes('/authRedirect');
  },

  isPaymentPath(path = location.pathname) {
    return path.includes('bkgPaymentOptions') || /\/payment(?:\/|$)/i.test(path);
  },

  isReviewPath(path = location.pathname) {
    return path.includes('reviewBooking') || /\/review(?:\/|$)/i.test(path);
  },

  syncStepFromPath(path, state = {}) {
    if (IRCTCExt.NgetPaths.isGatewayPath(path)) return 'gateway';
    if (state.awaitingGateway && state.paymentPhase === 'gateway') return 'gateway';
    if (IRCTCExt.NgetPaths.isPaymentPath(path)) return 'payment';
    if (IRCTCExt.NgetPaths.isReviewPath(path)) return 'review';
    if (path.includes('psgninput')) return state.passengersDone ? 'review' : 'passengers';
    if (path.includes('train-list')) return 'train-list';
    if (path.includes('train-search')) {
      if (IRCTCExt.NgetLanguageFlow?.isLanguageModalVisible?.()) return 'language';
      if (IRCTCExt.NgetLoginFlow?.needsLogin?.()) return 'login';
      return 'search';
    }
    return 'init';
  },

  isErrorPage(path = location.pathname) {
    return path.includes(IRCTCExt.NgetConfig.errorPagePath);
  },

  isTrainListPath(path = location.pathname) {
    return path.includes('train-list');
  },

  isTrainSearchPath(path = location.pathname) {
    return path.includes('train-search');
  },

  isPassengerPath(path = location.pathname) {
    return path.includes('psgninput');
  }
};

;
window.IRCTCExt = window.IRCTCExt || {};

IRCTCExt.NgetSelectors = {
  languageDialog: [
    '.ui-dialog-content .pnr-detail',
    '.ui-dialog-content',
    '.ui-dialog.ui-widget'
  ],
  languageButtons: [
    '.ui-dialog-content button.btn.btn-primary',
    '.ui-dialog-content button.btn-primary',
    '.ui-dialog button.btn-primary'
  ],
  languageButtonRow: [
    '.ui-dialog-content .text-center.col-xs-12',
    '.ui-dialog-content .text-center'
  ],
  languageEnglishSubmit: [
    '.ui-dialog-content button[type="submit"].btn-primary',
    '.ui-dialog button[type="submit"].btn-primary'
  ],
  loginHeaderBtn: [
    'a.search_btn.loginText[aria-label*="Login"]',
    'a.search_btn.loginText',
    'button.search_btn:not(.train_Search)'
  ], // desktop + sidebar; prefer findDesktopLoginButton / findSidebarLoginButton
  hamburgerMenu: [
    '.h_menu_drop_button a',
    '.h_menu_drop_button .fa-align-justify',
    'div.h_menu_drop_button a'
  ],
  hamburgerSidebar: [
    '.ui-sidebar.ui-sidebar-active',
    '.ui-sidebar-right.ui-sidebar-active'
  ],
  sidebarLoginBtn: [
    '.ui-sidebar-active nav.nav-bar button.search_btn',
    '.ui-sidebar-active button.search_btn'
  ],
  desktopLoginBtn: [
    'a.search_btn.loginText[aria-label*="Login"]',
    'a.search_btn.loginText'
  ],
  loginDialog: ['.ui-dialog-content:has(.irmodal)', '.ui-dialog .ui-dialog-content'],
  loginModal: ['.ui-dialog-content .irmodal', '.ui-dialog-content .irmodal[role="form"]', '.irmodal'],
  loginUsername: [
    'input[formcontrolname="userid"]',
    'input[placeholder="User Name"]',
    '.irmodal input[formcontrolname="userid"]'
  ],
  loginPassword: [
    'input[formcontrolname="password"]',
    'input[placeholder="Password"]',
    '.irmodal input[formcontrolname="password"]'
  ],
  loginSubmit: [
    'button.train_Search[type="submit"]',
    'button.search_btn.train_Search.train_Search_custom_hover[type="submit"]',
    '.irmodal button.train_Search[type="submit"]',
    '.irmodal button.search_btn.train_Search'
  ],
  loginCaptcha: [
    '.irmodal input[placeholder*="Captcha"]',
    '.irmodal input[placeholder*="CAPTCHA"]',
    '.irmodal input[formcontrolname="captcha"]'
  ],
  loggedInProfile: [
    'a[href*="logout"]',
    'button[aria-label*="Logout"]',
    '.user-profile',
    '.profile-icon'
  ],
  searchFrom: [
    'p-autocomplete#origin input.ui-autocomplete-input',
    '#origin input.ui-autocomplete-input',
    'p-autocomplete[formcontrolname="origin"] input'
  ],
  searchTo: [
    'p-autocomplete#destination input.ui-autocomplete-input',
    '#destination input.ui-autocomplete-input',
    'p-autocomplete[formcontrolname="destination"] input'
  ],
  searchDate: [
    'p-calendar#jDate input',
    'p-calendar[formcontrolname="journeyDate"] input',
    '#jDate input'
  ],
  searchClass: [
    'p-dropdown#journeyClass .ui-dropdown-trigger',
    'p-dropdown[formcontrolname="journeyClass"] .ui-dropdown-trigger'
  ],
  searchQuota: [
    'p-dropdown#journeyQuota .ui-dropdown-trigger',
    'p-dropdown[formcontrolname="journeyQuota"] .ui-dropdown-trigger'
  ],
  searchButton: [
    'button.search_btn.train_Search',
    'button.train_Search[type="submit"]',
    'button.train_Search'
  ],
  autocompletePanel: [
    '.ui-autocomplete-panel',
    'ul.ui-autocomplete-items'
  ],
  autocompleteOptions: [
    '.ui-autocomplete-panel li.ui-autocomplete-list-item',
    'ul.ui-autocomplete-items li'
  ],
  dropdownPanel: [
    '.ui-dropdown-panel .ui-dropdown-item',
    'ul.ui-dropdown-items li',
    '.ui-dropdown-panel li'
  ],
  dropdownOptions: [
    '.ui-dropdown-panel .ui-dropdown-item',
    'ul.ui-dropdown-items li'
  ],
  calendarPanel: [
    '.ui-datepicker',
    '.ui-datepicker-calendar'
  ],
  trainList: {
    container: ['.trains-div', 'app-train-avl-enq'],
    trainCard: ['app-train-avl-enq'],
    trainHeading: ['.train-heading strong'],
    classCell: ['div.pre-avl'],
    classLabel: ['div.pre-avl strong'],
    classRefreshLink: ['div.pre-avl .col-xs-12.link', 'div.pre-avl .link'],
    classRefreshIcon: ['div.pre-avl .fa-repeat', 'div.pre-avl .fa.fa-repeat'],
    classStatus: ['div.pre-avl'],
    classPickerCell: ['div.pre-avl'],
    classTabMenu: ['p-tabmenu', '.ui-tabmenu'],
    classTabItem: ['.ui-tabmenuitem'],
    classTabActive: ['.ui-tabmenuitem.ui-state-active'],
    datePanel: ['p-tabmenu'],
    dateCell: ['div.pre-avl'],
    dateLabel: ['div.pre-avl > div:first-child strong'],
    dateStatus: ['div.pre-avl .AVAILABLE', 'div.pre-avl .RAC', 'div.pre-avl .WL', 'div.pre-avl .REGRET'],
    bookNowBtn: ['button.train_Search', 'button.btnDefault.train_Search'],
    bookNowEnabled: [
      'button.train_Search:not(.disable-book)',
      'button.btnDefault.train_Search:not(.disable-book)'
    ]
  },
  passengers: {
    passengerPanel: ['p-panel .ui-panel-title', '.ui-panel-title.p-heading'],
    passengerRow: ['app-passenger'],
    addPassengerLink: ['a span.prenext'],
    deletePassengerBtn: ['a.fa.fa-remove.fa-lg', 'a.fa-remove'],
    passengerName: [
      'p-autocomplete[formcontrolname="passengerName"] input',
      'input[formcontrolname="passengerName"]'
    ],
    passengerAge: ['input[formcontrolname="passengerAge"]'],
    passengerGender: [
      'select[formcontrolname="passengerGender"]',
      'input[formcontrolname="passengerGender"]',
      'p-dropdown[formcontrolname="passengerGender"] .ui-dropdown-trigger',
      'p-dropdown[formcontrolname="passengerGender"]'
    ],
    passengerBerth: ['select[formcontrolname="passengerBerthChoice"]'],
    autocompleteOptions: [
      '.ui-autocomplete-panel li.ui-autocomplete-list-item',
      'ul.ui-autocomplete-items li'
    ],
    validationError: ['app-control-messages small', '.ui-messages-error']
  },
  psgnPreferences: {
    paymentPanelTitle: ['.ui-panel-title.p-heading', 'p-panel .ui-panel-title'],
    paymentTypeCards: ['input[name="paymentType"][value="3"]'],
    paymentTypeUpi: ['input[name="paymentType"][value="2"]'],
    paymentTypeRadio: ['p-radiobutton[formcontrolname="paymentType"]', 'input[name="paymentType"]'],
    continueBtn: [
      'button.train_Search.btnDefault[type="submit"]',
      'button.train_Search.btnDefault'
    ]
  },
  review: {
    passengerDetailHost: ['app-psgn-detail'],
    passengerDetailContent: [
      'app-psgn-detail .ui-panel-content',
      'app-psgn-detail p-panel .ui-panel-content'
    ],
    continueBtn: [
      'button.train_Search.btnDefault[type="submit"]',
      'button.btnDefault.train_Search'
    ]
  },
  payment: {
    payTypeMenu: ['#pay-type'],
    bankTypeItem: ['#pay-type .bank-type', '.bank-type'],
    bankTypeActive: ['.bank-type-active'],
    bankOptionRow: ['.bank-text', '.border-all.link .bank-text'],
    bankOptionClickable: ['.border-all.link', 'td .border-all.link'],
    payAndBookBtn: ['button.btn.btn-primary', 'button.btn-primary']
  }
};

;
(function (root) {
  root.IRCTCExt = root.IRCTCExt || {};
  if (IRCTCExt.NgetTrainList) return;

  IRCTCExt.NgetTrainList = {
    setStatus(overlay, msg) {
      overlay?.setStatus(msg);
    },

    scrollIntoViewIfNeeded(el) {
      if (!el) return;
      el.scrollIntoView({ block: 'center', inline: 'nearest' });
    },

    normalizeTrainText(text) {
      return String(text || '')
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    },

    scoreTrainName(cardName, searchName) {
      const a = IRCTCExt.NgetTrainList.normalizeTrainText(cardName);
      const b = IRCTCExt.NgetTrainList.normalizeTrainText(searchName);
      if (!b) return 0;
      if (a === b) return 100;
      if (a.includes(b) || b.includes(a)) return 80;

      const wordsA = a.split(' ').filter(Boolean);
      const wordsB = b.split(' ').filter(Boolean);
      if (!wordsB.length) return 0;

      const overlap = wordsB.filter((word) =>
        wordsA.some((cardWord) => cardWord.includes(word) || word.includes(cardWord))
      ).length;
      return Math.round((overlap / wordsB.length) * 70);
    },

    parseCardHeading(text) {
      const raw = String(text || '').trim();
      const match = raw.match(/^(.+?)\s*\(\s*(\d+)\s*\)\s*$/);
      if (!match) return { name: raw, number: '' };
      return { name: match[1].trim(), number: match[2].trim() };
    },

    getCardHeading(card) {
      const sel = IRCTCExt.SELECTORS.trainList;
      const el = IRCTCExt.Wait.queryOne(sel.trainHeading, card);
      return (el?.textContent || '').trim();
    },

    getCardTrainName(card) {
      return IRCTCExt.NgetTrainList.parseCardHeading(IRCTCExt.NgetTrainList.getCardHeading(card)).name;
    },

    getCardTrainNumber(card) {
      return IRCTCExt.NgetTrainList.parseCardHeading(IRCTCExt.NgetTrainList.getCardHeading(card)).number;
    },

    resolveTrainCard(el) {
      if (!el) return null;
      if (el.matches?.('app-train-avl-enq')) return el;
      return el.closest('app-train-avl-enq');
    },

    isPopulatedTrainCard(card) {
      if (!card) return false;
      const heading = IRCTCExt.Wait.queryOne(IRCTCExt.SELECTORS.trainList.trainHeading, card);
      return !!(heading && IRCTCExt.Wait.isVisible(heading));
    },

    getPopulatedTrainCards() {
      const sel = IRCTCExt.SELECTORS.trainList;
      const headingSelector = sel.trainHeading?.[0] || '.train-heading strong';
      const cards = [];
      const seen = new Set();

      for (const heading of document.querySelectorAll(headingSelector)) {
        if (!IRCTCExt.Wait.isVisible(heading)) continue;
        const card = IRCTCExt.NgetTrainList.resolveTrainCard(heading);
        if (!card || seen.has(card)) continue;
        if (!IRCTCExt.NgetTrainList.isPopulatedTrainCard(card)) continue;
        seen.add(card);
        cards.push(card);
      }

      if (cards.length) return cards;

      return [...document.querySelectorAll(sel.trainCard?.[0] || 'app-train-avl-enq')].filter((card) =>
        IRCTCExt.NgetTrainList.isPopulatedTrainCard(card)
      );
    },

    findTrainCardByNumber(trainNo) {
      const normalized = String(trainNo || '').trim();
      if (!normalized) return null;

      for (const card of IRCTCExt.NgetTrainList.getPopulatedTrainCards()) {
        if (IRCTCExt.NgetTrainList.getCardTrainNumber(card) === normalized) return card;
      }

      const headingSelector = IRCTCExt.SELECTORS.trainList.trainHeading?.[0] || '.train-heading strong';
      const numberPattern = new RegExp(`\\(\\s*${normalized}\\s*\\)`);
      for (const heading of document.querySelectorAll(headingSelector)) {
        if (!IRCTCExt.Wait.isVisible(heading)) continue;
        if (!numberPattern.test(heading.textContent || '')) continue;
        const card = IRCTCExt.NgetTrainList.resolveTrainCard(heading);
        if (card && IRCTCExt.NgetTrainList.isPopulatedTrainCard(card)) return card;
      }

      return null;
    },

    findTrainCardByName(trainName, minScore = 50) {
      if (!trainName) return null;

      const normalizedSearch = IRCTCExt.NgetTrainList.normalizeTrainText(trainName);
      let bestCard = null;
      let bestScore = 0;

      for (const card of IRCTCExt.NgetTrainList.getPopulatedTrainCards()) {
        const name = IRCTCExt.NgetTrainList.getCardTrainName(card);
        const normalizedName = IRCTCExt.NgetTrainList.normalizeTrainText(name);
        if (normalizedName === normalizedSearch) return card;

        const score = IRCTCExt.NgetTrainList.scoreTrainName(name, trainName);
        if (score > bestScore) {
          bestScore = score;
          bestCard = card;
        }
      }

      return bestScore >= minScore ? bestCard : null;
    },

    findTrainCard(journey = {}) {
      const trainNo = String(journey.trainNo || '').trim();
      const trainName = String(journey.trainName || '').trim();

      if (trainNo) {
        const byNumber = IRCTCExt.NgetTrainList.findTrainCardByNumber(trainNo);
        if (byNumber) return byNumber;

        if (!/^\d+$/.test(trainNo)) {
          const byNoAsName = IRCTCExt.NgetTrainList.findTrainCardByName(trainNo);
          if (byNoAsName) return byNoAsName;
        }
      }

      if (trainName) {
        const byName = IRCTCExt.NgetTrainList.findTrainCardByName(trainName);
        if (byName) return byName;
      }

      if (trainName || trainNo) return null;
      return IRCTCExt.NgetTrainList.getPopulatedTrainCards()[0] || null;
    },

    async waitForTrainListReady(overlay) {
      IRCTCExt.NgetTrainList.setStatus(overlay, 'Waiting for train list...');

      const ready = await IRCTCExt.Wait.poll(
        () => (IRCTCExt.NgetTrainList.getPopulatedTrainCards().length > 0 ? true : null),
        { timeout: 20000, interval: 100 }
      );

      if (!ready) throw new Error('Train list did not load');
    },

    async findTrainCardWithPoll(journey, searchLabel, overlay) {
      IRCTCExt.NgetTrainList.setStatus(overlay, `Searching train list for ${searchLabel}...`);

      let card = IRCTCExt.NgetTrainList.findTrainCard(journey);
      if (card) return card;

      card = await IRCTCExt.Wait.poll(() => IRCTCExt.NgetTrainList.findTrainCard(journey), {
        timeout: 8000,
        interval: 100
      });

      if (!card && (journey.trainName || journey.trainNo)) {
        throw new Error(`Train ${searchLabel} not found in results`);
      }
      if (!card) throw new Error('No trains found on page');
      return card;
    },

    classCellMatchesTravelClass(classCell, travelClass) {
      if (!classCell || !travelClass) return false;

      const labelEl = classCell.querySelector('strong');
      const text = (labelEl?.textContent || classCell.textContent || '').trim();
      const normalizedClass = String(travelClass).trim().toUpperCase();
      const classLabel = IRCTCExt.Stations.getClassLabel(travelClass);

      if (text.includes(classLabel)) return true;
      if (new RegExp(`\\(\\s*${normalizedClass}\\s*\\)`).test(text)) return true;
      if (new RegExp(`\\b${normalizedClass}\\b`).test(text.toUpperCase())) return true;

      return false;
    },

    isClassPickerCell(cell) {
      if (!cell || IRCTCExt.NgetTrainList.isDateAvailabilityCell(cell)) return false;

      if (IRCTCExt.NgetTrainList.findClassRefreshControl(cell)) return true;

      const strong = cell.querySelector('div:first-child strong, strong');
      const label = (strong?.textContent || '').trim();
      if (!label) return false;
      if (/\b(mon|tue|wed|thu|fri|sat|sun)\b/i.test(label)) return false;

      return (
        /\([A-Z0-9]{1,3}\)/.test(label) ||
        /sleeper|tier|class|chair|sitting|economy|anubhuti|vistadome/i.test(label)
      );
    },

    isDateAvailabilityCell(cell) {
      if (!cell) return false;
      if (cell.querySelector('.AVAILABLE, .RAC, .WL, .REGRET')) return true;
      const label = IRCTCExt.NgetTrainList.getDateCellLabel(cell);
      return /\b(mon|tue|wed|thu|fri|sat|sun)\b/i.test(label);
    },

    getClassPickerCells(card) {
      const sel = IRCTCExt.SELECTORS.trainList;
      const cells = [...card.querySelectorAll(sel.classPickerCell?.[0] || 'div.pre-avl')];
      return cells.filter((cell) => IRCTCExt.NgetTrainList.isClassPickerCell(cell));
    },

    getClassCells(card) {
      return IRCTCExt.NgetTrainList.getClassPickerCells(card);
    },

    getDatePanel(card) {
      const sel = IRCTCExt.SELECTORS.trainList;
      return IRCTCExt.Wait.queryOne(sel.datePanel, card);
    },

    getDateAvailabilityCells(card) {
      const panel = IRCTCExt.NgetTrainList.getDatePanel(card);
      if (!panel) return [];

      const container = panel.closest('.col-xs-12') || card;
      const cells = [...container.querySelectorAll('div.pre-avl')];
      return cells.filter((cell) => IRCTCExt.NgetTrainList.isDateAvailabilityCell(cell));
    },

    getDateCellLabel(dateCell) {
      const sel = IRCTCExt.SELECTORS.trainList;
      const labelEl = IRCTCExt.Wait.queryOne(sel.dateLabel, dateCell) || dateCell.querySelector('strong');
      return (labelEl?.textContent || '').trim();
    },

    findClassCell(card, travelClass) {
      for (const classCell of IRCTCExt.NgetTrainList.getClassPickerCells(card)) {
        if (IRCTCExt.NgetTrainList.classCellMatchesTravelClass(classCell, travelClass)) {
          return classCell;
        }
      }
      return null;
    },

    async findClassCellWithScroll(card, travelClass, overlay) {
      for (let i = 0; i < 8; i += 1) {
        const classCell = IRCTCExt.NgetTrainList.findClassCell(card, travelClass);
        if (classCell) {
          IRCTCExt.NgetTrainList.scrollIntoViewIfNeeded(classCell);
          return classCell;
        }

        const scrollHost = card.querySelector('[style*="overflow-x"]') || card.querySelector('table');
        if (scrollHost && scrollHost.scrollWidth > scrollHost.clientWidth) {
          IRCTCExt.NgetTrainList.setStatus(overlay, `Scrolling to find class ${travelClass}...`);
          scrollHost.scrollLeft += Math.min(180, scrollHost.clientWidth);
          await IRCTCExt.Wait.delay(250);
          continue;
        }
        break;
      }

      const classCell = IRCTCExt.NgetTrainList.findClassCell(card, travelClass);
      if (classCell) IRCTCExt.NgetTrainList.scrollIntoViewIfNeeded(classCell);
      return classCell;
    },

    findClassRefreshControl(classCell) {
      if (!classCell) return null;

      const sel = IRCTCExt.SELECTORS.trainList;
      const links = IRCTCExt.Wait.queryAll(sel.classRefreshLink, classCell);
      const link = links.find(
        (el) => /refresh/i.test(el.textContent || '') && IRCTCExt.Wait.isVisible(el)
      );
      if (link) return link;

      const icons = IRCTCExt.Wait.queryAll(sel.classRefreshIcon, classCell);
      const icon = icons.find((el) => IRCTCExt.Wait.isVisible(el));
      if (icon) return icon;

      return null;
    },

    async waitForDatePanel(card, overlay) {
      const loaded = await IRCTCExt.Wait.poll(
        () => {
          const panel = IRCTCExt.NgetTrainList.getDatePanel(card);
          if (!panel || !IRCTCExt.Wait.isVisible(panel)) return null;
          return IRCTCExt.NgetTrainList.getDateAvailabilityCells(card).length > 0 ? true : null;
        },
        { timeout: 10000, interval: 200 }
      );

      if (!loaded) throw new Error('Date availability panel did not load');
      return true;
    },

    parseDateCellStatus(dateCell) {
      const sel = IRCTCExt.SELECTORS.trainList;
      const statusEl = IRCTCExt.Wait.queryOne(sel.dateStatus, dateCell);
      const text = (statusEl?.textContent || dateCell?.textContent || '').replace(/\s+/g, ' ').trim();
      const status = { type: '', text };

      const upper = text.toUpperCase();
      if (/high\s*load|please\s*retry/i.test(text)) status.type = 'HIGH_LOAD';
      else if (statusEl?.classList.contains('AVAILABLE') || upper.includes('AVAILABLE')) status.type = 'AVAILABLE';
      else if (statusEl?.classList.contains('RAC') || /\bRAC\b/.test(upper)) status.type = 'RAC';
      else if (statusEl?.classList.contains('WL') || /\bWL\b/.test(upper)) status.type = 'WL';
      else if (statusEl?.classList.contains('REGRET') || upper.includes('REGRET') || /not available/i.test(text)) {
        status.type = 'REGRET';
      }

      return status;
    },

    findDateCell(card, journeyDate) {
      if (!journeyDate) return null;

      for (const dateCell of IRCTCExt.NgetTrainList.getDateAvailabilityCells(card)) {
        const label = IRCTCExt.NgetTrainList.getDateCellLabel(dateCell);
        if (IRCTCExt.Stations.dateLabelsMatch(journeyDate, label)) return dateCell;
      }

      return null;
    },

    classTabMatchesTravelClass(tab, travelClass) {
      if (!tab || !travelClass) return false;
      const text = (tab.textContent || '').trim();
      const normalizedClass = String(travelClass).trim().toUpperCase();
      const classLabel = IRCTCExt.Stations.getClassLabel(travelClass);

      if (text.includes(classLabel)) return true;
      if (new RegExp(`\\(\\s*${normalizedClass}\\s*\\)`).test(text)) return true;
      if (new RegExp(`\\b${normalizedClass}\\b`).test(text.toUpperCase())) return true;

      return false;
    },

    async ensureClassTabActive(card, travelClass, overlay) {
      const sel = IRCTCExt.SELECTORS.trainList;
      const active = IRCTCExt.Wait.queryOne(sel.classTabActive, card);
      if (active && IRCTCExt.NgetTrainList.classTabMatchesTravelClass(active, travelClass)) return;

      const tabs = IRCTCExt.Wait.queryAll(sel.classTabItem, card);
      const match = tabs.find((tab) => IRCTCExt.NgetTrainList.classTabMatchesTravelClass(tab, travelClass));
      if (!match) return;

      IRCTCExt.NgetTrainList.setStatus(overlay, `Selecting class tab ${travelClass}...`);
      IRCTCExt.Events.click(match.querySelector('a') || match);
      await IRCTCExt.Wait.delay(300);
    },

    isHighLoadStatus(status) {
      const text = String(status?.text || '');
      return /high\s*load|please\s*retry/i.test(text) || status?.type === 'HIGH_LOAD';
    },

    isRetryableAvailabilityError(status) {
      return IRCTCExt.NgetTrainList.isHighLoadStatus(status);
    },

    isBookableStatus(statusType) {
      return statusType === 'AVAILABLE' || statusType === 'RAC';
    },

    async refreshClassAvailability(classPickerCell, card, overlay, travelClass) {
      IRCTCExt.NgetTrainList.scrollIntoViewIfNeeded(classPickerCell);

      const refresh = IRCTCExt.NgetTrainList.findClassRefreshControl(classPickerCell);
      if (!refresh) throw new Error(`Refresh control not found for class ${travelClass}`);

      IRCTCExt.NgetTrainList.setStatus(overlay, `Refreshing availability for ${travelClass}...`);
      IRCTCExt.Events.click(refresh);
      await IRCTCExt.Wait.delay(500);
      await IRCTCExt.NgetTrainList.waitForDatePanel(card, overlay);
      return true;
    },

    async waitForBookableDate(card, journeyDate, travelClass, classPickerCell, overlay) {
      let attempt = 0;
      const dateLabel = IRCTCExt.Stations.formatDateForNgetCard(journeyDate) || journeyDate;

      while (await IRCTCExt.Bot.isRunning()) {
        const control = await IRCTCExt.Bot.checkControlState();
        if (control === 'stopped') throw new Error('Booking stopped');
        if (control === 'paused') {
          IRCTCExt.NgetTrainList.setStatus(overlay, 'Paused — click Resume to continue...');
          await IRCTCExt.Bot.waitUntilResumedOrStopped();
          if (!(await IRCTCExt.Bot.isRunning())) throw new Error('Booking stopped');
          continue;
        }

        await IRCTCExt.NgetTrainList.waitForDatePanel(card, overlay);
        await IRCTCExt.NgetTrainList.ensureClassTabActive(card, travelClass, overlay);

        const dateCell = IRCTCExt.NgetTrainList.findDateCell(card, journeyDate);
        if (!dateCell) {
          throw new Error(`Journey date not found in availability (${dateLabel})`);
        }

        const status = IRCTCExt.NgetTrainList.parseDateCellStatus(dateCell);
        if (IRCTCExt.NgetTrainList.isBookableStatus(status.type)) {
          return { dateCell, status };
        }

        if (!IRCTCExt.NgetTrainList.isRetryableAvailabilityError(status)) {
          throw new Error(
            `${dateLabel} shows ${status.text || status.type || 'not available'} — not bookable`
          );
        }

        attempt += 1;
        IRCTCExt.NgetTrainList.setStatus(
          overlay,
          `High load on ${dateLabel} — refreshing (attempt ${attempt})...`
        );
        await IRCTCExt.NgetTrainList.refreshClassAvailability(
          classPickerCell,
          card,
          overlay,
          travelClass
        );
        await IRCTCExt.Wait.delay(400);
      }

      throw new Error('Booking stopped');
    },

    selectDateCell(dateCell) {
      if (!dateCell) return;
      IRCTCExt.NgetTrainList.scrollIntoViewIfNeeded(dateCell);
      IRCTCExt.Events.click(dateCell);
    },

    findBookNowButton(card) {
      const sel = IRCTCExt.SELECTORS.trainList;
      const enabled = IRCTCExt.Wait.queryOne(sel.bookNowEnabled, card);
      if (enabled && IRCTCExt.Wait.isVisible(enabled)) return enabled;

      const buttons = card.querySelectorAll(sel.bookNowBtn?.[0] || 'button.train_Search');
      return (
        [...buttons].find(
          (btn) =>
            /book\s*now/i.test(btn.textContent || '') &&
            !btn.classList.contains('disable-book') &&
            IRCTCExt.Wait.isVisible(btn)
        ) || null
      );
    },

    async waitForBookNowEnabled(card, overlay, travelClass) {
      return IRCTCExt.Wait.poll(
        () => IRCTCExt.NgetTrainList.findBookNowButton(card),
        { timeout: 15000, interval: 200 }
      );
    },

    async confirmBookingAndWait(overlay) {
      if (location.pathname.includes('psgninput')) return true;

      const deadline = Date.now() + 25000;
      while (Date.now() < deadline) {
        if (location.pathname.includes('psgninput')) return true;
        await IRCTCExt.Wait.delay(100);
      }

      if (location.pathname.includes('psgninput')) return true;
      throw new Error('Did not reach passenger input page after booking');
    },

    async bookTrain(config, overlay) {
      const { journey } = config;

      overlay?.setStep('Train List');
      await IRCTCExt.NgetTrainList.waitForTrainListReady(overlay);

      const trainName = String(journey.trainName || '').trim();
      const trainNo = String(journey.trainNo || '').trim();
      const searchLabel = trainNo || trainName || 'train';
      const travelClass = journey.travelClass || 'SL';

      const card = await IRCTCExt.NgetTrainList.findTrainCardWithPoll(journey, searchLabel, overlay);

      const trainNum = IRCTCExt.NgetTrainList.getCardTrainNumber(card) || trainNo || '';
      const matchedName = IRCTCExt.NgetTrainList.getCardTrainName(card);
      const foundLabel =
        trainNum && matchedName
          ? `Found train ${trainNum} — ${matchedName}`
          : matchedName
            ? `Found train ${matchedName}`
            : `Found train ${trainNum}`;
      IRCTCExt.NgetTrainList.setStatus(overlay, foundLabel);

      const classPickerCell = await IRCTCExt.NgetTrainList.findClassCellWithScroll(card, travelClass, overlay);
      if (!classPickerCell) throw new Error(`Class ${travelClass} not found for train ${trainNum}`);

      if (!journey.date) throw new Error('Journey date is required for nget train-list booking');

      await IRCTCExt.NgetTrainList.refreshClassAvailability(
        classPickerCell,
        card,
        overlay,
        travelClass
      );

      const { dateCell, status } = await IRCTCExt.NgetTrainList.waitForBookableDate(
        card,
        journey.date,
        travelClass,
        classPickerCell,
        overlay
      );

      const dateLabel =
        IRCTCExt.NgetTrainList.getDateCellLabel(dateCell) ||
        IRCTCExt.Stations.formatDateForNgetCard(journey.date);
      IRCTCExt.NgetTrainList.setStatus(
        overlay,
        `Selecting ${dateLabel} (${status.text || status.type})...`
      );
      IRCTCExt.NgetTrainList.selectDateCell(dateCell);
      await IRCTCExt.Wait.delay(300);

      let bookBtn = IRCTCExt.NgetTrainList.findBookNowButton(card);
      if (!bookBtn) {
        IRCTCExt.NgetTrainList.setStatus(overlay, 'Waiting for Book Now to enable...');
        bookBtn = await IRCTCExt.NgetTrainList.waitForBookNowEnabled(card, overlay, travelClass);
      }
      if (!bookBtn) throw new Error('Book Now button did not become enabled');

      IRCTCExt.NgetTrainList.setStatus(
        overlay,
        `${dateLabel} available (${status.text || status.type}) — clicking Book Now...`
      );
      IRCTCExt.NgetTrainList.scrollIntoViewIfNeeded(bookBtn);
      IRCTCExt.Events.click(bookBtn);
      await IRCTCExt.Wait.delay(400);

      IRCTCExt.NgetTrainList.setStatus(overlay, 'Book Now clicked — waiting for passenger page...');
      await IRCTCExt.NgetTrainList.confirmBookingAndWait(overlay);
      return true;
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);

;
(function (root) {
  root.IRCTCExt = root.IRCTCExt || {};
  if (IRCTCExt.NgetLanguageFlow) return;

  IRCTCExt.NgetLanguageFlow = {
    isEnglishButton(btn) {
      if (!btn) return false;
      const text = (btn.textContent || '').trim();
      if (/^english$/i.test(text)) return true;
      const aria = btn.getAttribute('aria-label') || '';
      return /english/i.test(text) && /welcome to irctc/i.test(aria);
    },

    getDialogRoot() {
      const dialog = IRCTCExt.Wait.queryOne(IRCTCExt.NgetSelectors.languageDialog);
      if (!dialog || !IRCTCExt.Wait.isVisible(dialog)) return null;
      const text = (dialog.textContent || '').replace(/\s+/g, ' ');
      if (!/welcome to irctc/i.test(text)) return null;
      if (!/preferred language/i.test(text)) return null;
      return dialog;
    },

    isLanguageModalVisible() {
      return !!IRCTCExt.NgetLanguageFlow.getDialogRoot();
    },

    findEnglishButton() {
      const dialog = IRCTCExt.NgetLanguageFlow.getDialogRoot();
      if (!dialog) return null;

      const primaryButtons = IRCTCExt.Wait.queryAll(IRCTCExt.NgetSelectors.languageButtons, dialog);
      const byText = primaryButtons.find((btn) => IRCTCExt.NgetLanguageFlow.isEnglishButton(btn));
      if (byText) return byText;

      const rows = IRCTCExt.Wait.queryAll(IRCTCExt.NgetSelectors.languageButtonRow, dialog);
      for (const row of rows) {
        const submitButtons = IRCTCExt.Wait.queryAll(
          ['button[type="submit"].btn-primary', 'button.btn-primary'],
          row
        );
        const english = submitButtons.find((btn) => /english/i.test((btn.textContent || '').trim()));
        if (english) return english;
      }

      const submitButtons = IRCTCExt.Wait.queryAll(IRCTCExt.NgetSelectors.languageEnglishSubmit, dialog);
      return submitButtons.find((btn) => IRCTCExt.NgetLanguageFlow.isEnglishButton(btn)) || null;
    },

    submitEnglishButton(englishBtn) {
      IRCTCExt.Events.click(englishBtn);

      const form = englishBtn.closest('form');
      if (!form) return;

      if (typeof form.requestSubmit === 'function') {
        try {
          form.requestSubmit(englishBtn);
        } catch {
          form.requestSubmit();
        }
        return;
      }

      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    },

    async clickEnglishAndWaitForClose(englishBtn, overlay) {
      overlay?.setStatus?.('Selecting English...');
      IRCTCExt.NgetLanguageFlow.submitEnglishButton(englishBtn);
      await IRCTCExt.Wait.delay(500);

      if (!IRCTCExt.NgetLanguageFlow.isLanguageModalVisible()) {
        return true;
      }

      IRCTCExt.NgetLanguageFlow.submitEnglishButton(englishBtn);
      await IRCTCExt.Wait.delay(400);

      const closed = await IRCTCExt.Wait.poll(
        () => (!IRCTCExt.NgetLanguageFlow.isLanguageModalVisible() ? true : null),
        { timeout: 10000, interval: 200 }
      );

      return !!closed;
    },

    async dismissPreferredLanguage(overlay) {
      overlay?.setStep?.('Language');
      overlay?.setStatus?.('Waiting for language prompt...');

      const modalShown = await IRCTCExt.Wait.poll(
        () => (IRCTCExt.NgetLanguageFlow.isLanguageModalVisible() ? true : null),
        { timeout: 12000, interval: 200 }
      );

      if (!modalShown) {
        overlay?.setStatus?.('Language prompt not shown — continuing.');
        return false;
      }

      const englishBtn = IRCTCExt.NgetLanguageFlow.findEnglishButton();
      if (!englishBtn) {
        throw new Error('English language button not found on IRCTC language prompt.');
      }

      const closed = await IRCTCExt.NgetLanguageFlow.clickEnglishAndWaitForClose(englishBtn, overlay);
      if (!closed) {
        throw new Error('Language prompt did not close after selecting English.');
      }

      overlay?.setStatus?.('English selected.');
      await IRCTCExt.Wait.delay(300);
      return true;
    },

    async dismissIfPresent(overlay) {
      return IRCTCExt.NgetLanguageFlow.dismissPreferredLanguage(overlay);
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);

;
(function (root) {
  root.IRCTCExt = root.IRCTCExt || {};
  if (IRCTCExt.NgetLoginFlow) return;

  IRCTCExt.NgetLoginFlow = {
    NARROW_LOGIN_BREAKPOINT: 1302,

    usesNarrowLoginLayout() {
      return window.innerWidth < IRCTCExt.NgetLoginFlow.NARROW_LOGIN_BREAKPOINT;
    },

    isSidebarOpen() {
      const sidebar = IRCTCExt.Wait.queryOne(IRCTCExt.SELECTORS.hamburgerSidebar);
      return !!(sidebar && IRCTCExt.Wait.isVisible(sidebar));
    },

    getLoginModalRoot() {
      const dialogs = document.querySelectorAll('.ui-dialog-content');
      for (const dialog of dialogs) {
        if (!IRCTCExt.Wait.isVisible(dialog)) continue;

        const modal = dialog.querySelector('.irmodal');
        if (!modal) continue;

        const title = modal.querySelector('.modal-title, #exampleModalLabel');
        const userInput = modal.querySelector('input[formcontrolname="userid"]');
        const isLoginTitle = title && /login/i.test(title.textContent || '');
        const hasLoginForm = !!(userInput && IRCTCExt.Wait.isVisible(userInput));

        if (isLoginTitle || hasLoginForm) return modal;
      }

      const modal = IRCTCExt.Wait.queryOne(IRCTCExt.SELECTORS.loginModal);
      if (!modal || !IRCTCExt.Wait.isVisible(modal)) return null;

      const title = modal.querySelector('.modal-title, #exampleModalLabel');
      if (title && !/login/i.test(title.textContent || '')) return null;
      return modal;
    },

    isLoginModalVisible() {
      const modal = IRCTCExt.NgetLoginFlow.getLoginModalRoot();
      if (!modal) return false;
      const userInput = IRCTCExt.Wait.queryOne(IRCTCExt.SELECTORS.loginUsername, modal);
      const passInput = IRCTCExt.Wait.queryOne(IRCTCExt.SELECTORS.loginPassword, modal);
      return !!(
        userInput &&
        passInput &&
        IRCTCExt.Wait.isVisible(userInput) &&
        IRCTCExt.Wait.isVisible(passInput)
      );
    },

    isLoginHeaderButton(btn, { visibleOnly = true, allowInSidebar = false } = {}) {
      if (!btn) return false;
      if (visibleOnly && !IRCTCExt.Wait.isVisible(btn)) return false;
      if (btn.closest('.irmodal, .ui-dialog-content .irmodal, .ui-dialog-content')) return false;
      if (!allowInSidebar && btn.closest('.ui-sidebar')) return false;
      if (btn.classList.contains('train_Search')) return false;

      const text = (btn.textContent || '').trim();
      const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
      return (
        /login\s*\/\s*register/i.test(text) ||
        (/\blogin\b/i.test(text) && aria.includes('login'))
      );
    },

    findDesktopLoginButton() {
      const selectors = IRCTCExt.SELECTORS.desktopLoginBtn || IRCTCExt.SELECTORS.loginHeaderBtn || [];
      for (const selector of selectors) {
        const candidates = document.querySelectorAll(selector);
        const match = [...candidates].find((btn) =>
          IRCTCExt.NgetLoginFlow.isLoginHeaderButton(btn, { visibleOnly: true, allowInSidebar: false })
        );
        if (match) return match;
      }
      return null;
    },

    findSidebarLoginButton() {
      if (!IRCTCExt.NgetLoginFlow.isSidebarOpen()) return null;

      const sidebar = IRCTCExt.Wait.queryOne(IRCTCExt.SELECTORS.hamburgerSidebar);
      if (!sidebar) return null;

      const selectors = IRCTCExt.SELECTORS.sidebarLoginBtn || [];
      for (const selector of selectors) {
        const candidates = sidebar.querySelectorAll(selector);
        const match = [...candidates].find((btn) =>
          IRCTCExt.NgetLoginFlow.isLoginHeaderButton(btn, { visibleOnly: true, allowInSidebar: true })
        );
        if (match) return match;
      }

      const buttons = sidebar.querySelectorAll('button.search_btn');
      return (
        [...buttons].find((btn) =>
          IRCTCExt.NgetLoginFlow.isLoginHeaderButton(btn, { visibleOnly: true, allowInSidebar: true })
        ) || null
      );
    },

    findLoginButton({ visibleOnly = true } = {}) {
      const desktop = IRCTCExt.NgetLoginFlow.findDesktopLoginButton();
      if (desktop) return desktop;

      const sidebar = IRCTCExt.NgetLoginFlow.findSidebarLoginButton();
      if (sidebar) return sidebar;

      return null;
    },

    headerLoginButton() {
      if (IRCTCExt.NgetLoginFlow.usesNarrowLoginLayout()) {
        return IRCTCExt.NgetLoginFlow.findSidebarLoginButton();
      }
      return IRCTCExt.NgetLoginFlow.findDesktopLoginButton();
    },

    hamburgerMenuTrigger() {
      const selectors = IRCTCExt.SELECTORS.hamburgerMenu || [];
      for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (!el) continue;
        const clickTarget = el.closest('a') || el.closest('.h_menu_drop_button') || el;
        const container = clickTarget.closest('.h_menu_drop_button') || clickTarget;
        if (IRCTCExt.Wait.isVisible(container) || IRCTCExt.Wait.isVisible(clickTarget)) {
          return clickTarget;
        }
      }
      return null;
    },

    async openSidebarMenu(overlay) {
      if (IRCTCExt.NgetLoginFlow.isSidebarOpen()) return true;

      const trigger = IRCTCExt.NgetLoginFlow.hamburgerMenuTrigger();
      if (!trigger) return false;

      overlay?.setStatus('Opening menu...');
      IRCTCExt.Events.click(trigger);

      const opened = await IRCTCExt.Wait.poll(
        () => (IRCTCExt.NgetLoginFlow.isSidebarOpen() ? true : null),
        { timeout: 8000, interval: 200 }
      );
      return !!opened;
    },

    async resolveLoginButton(overlay) {
      const narrow = IRCTCExt.NgetLoginFlow.usesNarrowLoginLayout();
      const desktopBtn = IRCTCExt.NgetLoginFlow.findDesktopLoginButton();

      if (!narrow && desktopBtn) return desktopBtn;

      if (narrow || !desktopBtn) {
        const sidebarBtn = IRCTCExt.NgetLoginFlow.findSidebarLoginButton();
        if (sidebarBtn) return sidebarBtn;

        const opened = await IRCTCExt.NgetLoginFlow.openSidebarMenu(overlay);
        if (!opened) {
          if (desktopBtn) return desktopBtn;
          return null;
        }

        overlay?.setStatus('Clicking LOGIN / REGISTER in menu...');
        const btn = await IRCTCExt.Wait.poll(
          () => IRCTCExt.NgetLoginFlow.findSidebarLoginButton(),
          { timeout: 8000, interval: 200 }
        );
        if (btn) return btn;
      }

      return desktopBtn || IRCTCExt.NgetLoginFlow.findLoginButton({ visibleOnly: true });
    },

    needsLogin() {
      if (IRCTCExt.NgetLoginFlow.isLoginModalVisible()) return true;
      if (IRCTCExt.Wait.queryOne(IRCTCExt.SELECTORS.loggedInProfile)) return false;

      if (IRCTCExt.NgetLoginFlow.findDesktopLoginButton()) return true;
      if (IRCTCExt.NgetLoginFlow.findSidebarLoginButton()) return true;

      const searchInput = IRCTCExt.Wait.queryOne(IRCTCExt.SELECTORS.searchFrom);
      if (searchInput && IRCTCExt.Wait.isVisible(searchInput)) return false;

      if (IRCTCExt.NgetLoginFlow.usesNarrowLoginLayout()) {
        return !!IRCTCExt.NgetLoginFlow.hamburgerMenuTrigger();
      }

      return false;
    },

    getLoginSubmit(modalRoot) {
      const root = modalRoot || IRCTCExt.NgetLoginFlow.getLoginModalRoot();
      if (!root) return null;

      const submit = IRCTCExt.Wait.queryOne(IRCTCExt.SELECTORS.loginSubmit, root);
      if (submit && IRCTCExt.Wait.isVisible(submit)) return submit;

      const buttons = root.querySelectorAll('button[type="submit"], button.train_Search');
      return (
        [...buttons].find(
          (btn) => /sign\s*in/i.test(btn.textContent || '') && IRCTCExt.Wait.isVisible(btn)
        ) || null
      );
    },

    hasChallenge() {
      const modal = IRCTCExt.NgetLoginFlow.getLoginModalRoot();
      if (!modal) return false;

      const captchaInput = modal.querySelector(
        'input[placeholder*="Captcha" i], input[placeholder*="CAPTCHA" i], input[formcontrolname="captcha"]'
      );
      if (
        captchaInput &&
        captchaInput.type !== 'checkbox' &&
        IRCTCExt.Wait.isVisible(captchaInput)
      ) {
        return true;
      }

      const otpInput = modal.querySelector(
        'input:not([type="checkbox"])[placeholder*="OTP" i], input:not([type="checkbox"])[formcontrolname="otp"]'
      );
      if (!otpInput || !IRCTCExt.Wait.isVisible(otpInput)) return false;

      // Accessibility option on nget login — not an OTP entry field.
      if (otpInput.id === 'otpLogin' || otpInput.name === 'otpLogin') return false;

      return true;
    },

    async isLoggedIn() {
      if (IRCTCExt.NgetLoginFlow.isLoginModalVisible()) return false;

      if (IRCTCExt.Wait.queryOne(IRCTCExt.SELECTORS.loggedInProfile)) return true;

      if (IRCTCExt.NgetLoginFlow.findDesktopLoginButton()) return false;
      if (IRCTCExt.NgetLoginFlow.findSidebarLoginButton()) return false;

      const searchInput = IRCTCExt.Wait.queryOne(IRCTCExt.SELECTORS.searchFrom);
      return !!(searchInput && IRCTCExt.Wait.isVisible(searchInput));
    },

    async ensureLoginModal(overlay) {
      if (IRCTCExt.NgetLoginFlow.isLoginModalVisible()) {
        return IRCTCExt.NgetLoginFlow.getLoginModalRoot();
      }

      const shell = IRCTCExt.NgetLoginFlow.getLoginModalRoot();
      if (shell) {
        const ready = await IRCTCExt.Wait.poll(
          () =>
            IRCTCExt.NgetLoginFlow.isLoginModalVisible()
              ? IRCTCExt.NgetLoginFlow.getLoginModalRoot()
              : null,
          { timeout: 5000, interval: 200 }
        );
        if (ready) return ready;
      }

      overlay?.setStatus('Opening login...');
      const loginBtn = await IRCTCExt.NgetLoginFlow.resolveLoginButton(overlay);
      if (!loginBtn) throw new Error('LOGIN / REGISTER button not found');

      IRCTCExt.Events.click(loginBtn);
      await IRCTCExt.Wait.delay(600);

      const modal = await IRCTCExt.Wait.poll(
        () =>
          IRCTCExt.NgetLoginFlow.isLoginModalVisible()
            ? IRCTCExt.NgetLoginFlow.getLoginModalRoot()
            : null,
        { timeout: 10000, interval: 200 }
      );
      if (!modal) throw new Error('Login modal did not open');
      return modal;
    },

    async waitForEnabledSubmit(modalRoot) {
      return IRCTCExt.Wait.poll(
        () => {
          const submit = IRCTCExt.NgetLoginFlow.getLoginSubmit(modalRoot);
          if (!submit || !IRCTCExt.Wait.isVisible(submit)) return null;
          if (submit.disabled) return null;
          return submit;
        },
        { timeout: 8000, interval: 150 }
      );
    },

    async waitForCaptchaContinue(overlay, modalRoot) {
      overlay.setStatus('CAPTCHA or OTP required. Complete it, then click Continue.');
      await IRCTCExt.Storage.updateState({ currentStep: 'login-captcha', paused: true });
      await new Promise((resolve) => {
        overlay.showPause('Complete CAPTCHA or OTP in the login form, then click Continue.', async () => {
          const submit = IRCTCExt.NgetLoginFlow.getLoginSubmit(modalRoot);
          if (submit && !submit.disabled) {
            IRCTCExt.Events.click(submit);
          }
          await IRCTCExt.Storage.updateState({ paused: false });
          await IRCTCExt.Wait.delay(1500);
          resolve();
        });
      });
    },

    async run(config, overlay) {
      await IRCTCExt.Wait.poll(
        () => {
          if (IRCTCExt.NgetLoginFlow.isLoginModalVisible()) return true;
          if (IRCTCExt.Wait.queryOne(IRCTCExt.SELECTORS.loggedInProfile)) return true;
          if (IRCTCExt.Wait.queryOne(IRCTCExt.SELECTORS.searchFrom)) return true;
          if (IRCTCExt.NgetLoginFlow.findDesktopLoginButton()) return true;
          if (IRCTCExt.NgetLoginFlow.findSidebarLoginButton()) return true;
          if (IRCTCExt.NgetLoginFlow.isSidebarOpen()) return true;
          if (IRCTCExt.NgetLoginFlow.hamburgerMenuTrigger()) return true;
          return null;
        },
        { timeout: 12000, interval: 200 }
      );

      if (await IRCTCExt.NgetLoginFlow.isLoggedIn()) {
        overlay.setStatus('Already logged in');
        return true;
      }

      overlay.setStep('Login');

      const dialogAlreadyOpen = IRCTCExt.NgetLoginFlow.isLoginModalVisible();
      overlay.setStatus(
        dialogAlreadyOpen ? 'Login dialog open — filling credentials...' : 'Opening login...'
      );
      const modal = await IRCTCExt.NgetLoginFlow.ensureLoginModal(overlay);

      const userInput = await IRCTCExt.Wait.waitFor(IRCTCExt.SELECTORS.loginUsername, {
        timeout: 10000,
        visible: true,
        root: modal
      });
      const passInput = await IRCTCExt.Wait.waitFor(IRCTCExt.SELECTORS.loginPassword, {
        timeout: 10000,
        visible: true,
        root: modal
      });
      if (!userInput || !passInput) throw new Error('Login form not found');

      overlay.setStatus('Filling username and password...');
      IRCTCExt.Events.setInputValue(userInput, config.credentials.username);
      IRCTCExt.Events.setInputValue(passInput, config.credentials.password);

      if (IRCTCExt.NgetLoginFlow.hasChallenge()) {
        await IRCTCExt.NgetLoginFlow.waitForCaptchaContinue(overlay, modal);
      } else {
        const submit = await IRCTCExt.NgetLoginFlow.waitForEnabledSubmit(modal);
        if (!submit) throw new Error('SIGN IN button stayed disabled');
        overlay.setStatus('Submitting login...');
        IRCTCExt.Events.click(submit);
        await IRCTCExt.Wait.delay(800);

        if (IRCTCExt.NgetLoginFlow.hasChallenge()) {
          await IRCTCExt.NgetLoginFlow.waitForCaptchaContinue(overlay, modal);
        }
      }

      await IRCTCExt.Wait.poll(() => IRCTCExt.NgetLoginFlow.isLoggedIn(), { timeout: 20000, interval: 400 });
      if (!(await IRCTCExt.NgetLoginFlow.isLoggedIn())) {
        throw new Error('Login failed or timed out');
      }

      overlay.setStatus('Login successful');
      return true;
    },

    async runWithRetry(config, overlay, { maxAttempts = 3 } = {}) {
      await IRCTCExt.NgetLanguageFlow.dismissPreferredLanguage(overlay);

      if (await IRCTCExt.NgetLoginFlow.isLoggedIn()) {
        overlay.setStatus('Already logged in');
        return true;
      }

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          await IRCTCExt.NgetLoginFlow.run(config, overlay);
          if (await IRCTCExt.NgetLoginFlow.isLoggedIn()) return true;
        } catch (err) {
          if (attempt >= maxAttempts) throw err;
          console.warn(`[IRCTC-Bot] Nget login attempt ${attempt}/${maxAttempts}:`, err);
          overlay.setStatus(`Login failed, retry ${attempt}/${maxAttempts}...`);
          await IRCTCExt.Wait.delay(1500);
        }
      }

      throw new Error(`Login failed after ${maxAttempts} attempts`);
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);

;
(function (root) {
  root.IRCTCExt = root.IRCTCExt || {};
  if (IRCTCExt.NgetSearchFlow) return;

  IRCTCExt.NgetSearchFlow = {
    visibleAutocompleteOptions() {
      const panels = IRCTCExt.Wait.queryAll(IRCTCExt.SELECTORS.autocompletePanel);
      const visiblePanels = panels.filter((panel) => IRCTCExt.Wait.isVisible(panel));
      const options = visiblePanels.flatMap((panel) =>
        Array.from(panel.querySelectorAll('li')).filter((li) => IRCTCExt.Wait.isVisible(li))
      );
      if (options.length) return options;

      return IRCTCExt.Wait.queryAll(IRCTCExt.SELECTORS.autocompleteOptions).filter((opt) =>
        IRCTCExt.Wait.isVisible(opt)
      );
    },

    stationOptionsAfterHeader(options) {
      const stationsIdx = options.findIndex((opt) => /stations/i.test(opt.textContent || ''));
      if (stationsIdx >= 0) {
        const after = options.slice(stationsIdx + 1).filter((opt) => {
          const text = (opt.textContent || '').trim();
          return text && !/^-+$/.test(text) && !/journeys/i.test(text);
        });
        if (after.length) return after;
      }

      return options.filter((opt) => {
        const text = (opt.textContent || '').trim();
        if (!text || /^-+$/.test(text)) return false;
        if (/journeys/i.test(text)) return false;
        return !/stations/i.test(text);
      });
    },

    async pickStationOption(text) {
      const options = await IRCTCExt.Wait.poll(
        () => {
          const list = IRCTCExt.NgetSearchFlow.visibleAutocompleteOptions();
          return list.length ? list : null;
        },
        { timeout: 8000, interval: 150 }
      );
      if (!options?.length) return false;

      const candidates = IRCTCExt.NgetSearchFlow.stationOptionsAfterHeader(options);
      const match =
        candidates.find((opt) => IRCTCExt.Events.optionMatches(opt, text)) ||
        options.find((opt) => IRCTCExt.Events.optionMatches(opt, text));

      if (!match) return false;
      IRCTCExt.Events.click(match);
      await IRCTCExt.Wait.delay(300);
      return true;
    },

    inputShowsStation(input, text) {
      const value = (input?.value || '').trim();
      if (!value) return false;
      const needles = IRCTCExt.Stations.stationSearchTerms(text).map((term) =>
        IRCTCExt.Stations.normalizeStationText(term)
      );
      const shown = IRCTCExt.Stations.normalizeStationText(value);
      return needles.some(
        (needle) =>
          needle.length >= 2 &&
          (shown.includes(needle) || needle.includes(shown.split('-')[0]?.trim() || shown))
      );
    },

    async fillNgetStation(input, text) {
      if (!input || !text) return false;
      if (IRCTCExt.NgetSearchFlow.inputShowsStation(input, text)) return true;

      const terms = IRCTCExt.Stations.stationSearchTerms(text);
      for (const term of terms) {
        input.focus();
        IRCTCExt.Events.click(input);
        IRCTCExt.Events.setInputValue(input, term, { blur: false });
        await IRCTCExt.Wait.delay(500);

        if (await IRCTCExt.NgetSearchFlow.pickStationOption(text)) {
          if (IRCTCExt.NgetSearchFlow.inputShowsStation(input, text)) return true;
        }

        await IRCTCExt.Events.typeSlowly(input, term, 60);
        await IRCTCExt.Wait.delay(400);
        if (await IRCTCExt.NgetSearchFlow.pickStationOption(text)) {
          if (IRCTCExt.NgetSearchFlow.inputShowsStation(input, text)) return true;
        }
      }

      return IRCTCExt.NgetSearchFlow.inputShowsStation(input, text);
    },

    async selectNgetDropdown(triggerSelectors, labelText) {
      const trigger = await IRCTCExt.Wait.waitFor(triggerSelectors, { timeout: 5000, visible: true });
      if (!trigger) return false;

      const shown = (trigger.closest('p-dropdown')?.querySelector('.ui-dropdown-label')?.textContent || '')
        .trim()
        .toLowerCase();
      if (shown && shown === String(labelText).trim().toLowerCase()) return true;

      IRCTCExt.Events.click(trigger);
      await IRCTCExt.Wait.delay(400);

      const options = await IRCTCExt.Wait.poll(
        () => {
          const list = IRCTCExt.Wait.queryAll(IRCTCExt.SELECTORS.dropdownPanel).filter((opt) =>
            IRCTCExt.Wait.isVisible(opt)
          );
          return list.length ? list : null;
        },
        { timeout: 8000, interval: 150 }
      );
      if (!options?.length) return false;

      const target = String(labelText).trim().toLowerCase();
      const match =
        options.find((opt) => (opt.textContent || '').trim().toLowerCase() === target) ||
        options.find((opt) => IRCTCExt.Events.optionMatches(opt, labelText)) ||
        options.find((opt) => (opt.textContent || '').toLowerCase().includes(target));

      if (!match) return false;
      IRCTCExt.Events.click(match);
      await IRCTCExt.Wait.delay(300);
      return true;
    },

    async submitSearchWithRedirect(overlay, { maxAttempts = 3, redirectTimeoutMs = 8000 } = {}) {
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        overlay.setStatus(
          attempt === 1 ? 'Submitting search...' : `Retrying search (${attempt}/${maxAttempts})...`
        );

        const searchBtn = await IRCTCExt.Wait.waitFor(IRCTCExt.SELECTORS.searchButton, {
          timeout: 5000,
          visible: true
        });
        if (!searchBtn) throw new Error('Search Trains button not found');

        IRCTCExt.Events.click(searchBtn);

        const redirected = await IRCTCExt.Wait.poll(
          () => IRCTCExt.NgetPaths.isTrainListPath(location.pathname),
          { timeout: redirectTimeoutMs, interval: 200 }
        );

        if (redirected) {
          await IRCTCExt.Storage.updateState({
            currentStep: 'train-list',
            running: true,
            status: 'running',
            message: 'Search submitted — loading train list'
          });
          overlay.setStep('train-list');
          overlay.setStatus('Search submitted — loading train list...');
          return true;
        }

        if (attempt < maxAttempts) {
          overlay.setStatus(`Search did not redirect, retry ${attempt}/${maxAttempts}...`);
          await IRCTCExt.Wait.delay(500);
        }
      }

      throw new Error('Search did not open train list');
    },

    async run(config, overlay) {
      overlay.setStep('Search');
      overlay.setStatus('Filling journey details...');
      await IRCTCExt.Storage.updateState({ currentStep: 'search' });

      IRCTCExt.Modals.dismissSessionRestore?.();
      await IRCTCExt.Wait.delay(300);

      const fromInput = await IRCTCExt.Wait.waitFor(IRCTCExt.SELECTORS.searchFrom, {
        timeout: 20000,
        visible: true
      });
      const toInput = await IRCTCExt.Wait.waitFor(IRCTCExt.SELECTORS.searchTo, {
        timeout: 15000,
        visible: true
      });
      if (!fromInput || !toInput) throw new Error('Search form not found');

      const fromText = config.journey.from || config.journey.fromCode;
      const toText = config.journey.to || config.journey.toCode;
      if (!fromText || !toText) throw new Error('From/To station not configured');

      overlay.setStatus('Selecting From station...');
      const fromOk = await IRCTCExt.NgetSearchFlow.fillNgetStation(fromInput, fromText);
      if (!fromOk) throw new Error('Could not select From station');

      overlay.setStatus('Selecting To station...');
      const toOk = await IRCTCExt.NgetSearchFlow.fillNgetStation(toInput, toText);
      if (!toOk) throw new Error('Could not select To station');

      const dateInput = await IRCTCExt.Wait.waitFor(IRCTCExt.SELECTORS.searchDate, {
        timeout: 5000,
        visible: true
      });
      const dateStr = IRCTCExt.Stations.formatDateForIRCTC(config.journey.date);
      if (dateInput && dateStr) {
        overlay.setStatus('Selecting travel date...');
        IRCTCExt.Events.setInputValue(dateInput, dateStr, { blur: true });
        await IRCTCExt.Wait.delay(200);
        IRCTCExt.Events.click(dateInput);
        await IRCTCExt.Wait.delay(300);
        const picked = await IRCTCExt.Events.pickCustomCalendarDate(dateStr);
        if (!picked && dateInput.value !== dateStr) {
          IRCTCExt.Events.setInputValue(dateInput, dateStr, { blur: true });
        }
      }

      const travelClass = config.journey?.travelClass || 'SL';
      overlay.setStatus('Selecting class...');
      const classLabel = IRCTCExt.Stations.getClassLabel(travelClass);
      const classOk = await IRCTCExt.NgetSearchFlow.selectNgetDropdown(
        IRCTCExt.SELECTORS.searchClass,
        classLabel
      );
      if (!classOk) throw new Error(`Could not select class: ${classLabel}`);

      const quota = config.journey?.quota || 'TATKAL';
      overlay.setStatus('Selecting quota...');
      const quotaText = IRCTCExt.Stations.quotaOptionText(quota);
      const quotaOk = await IRCTCExt.NgetSearchFlow.selectNgetDropdown(
        IRCTCExt.SELECTORS.searchQuota,
        quotaText
      );
      if (!quotaOk) throw new Error(`Could not select quota: ${quotaText}`);

      return IRCTCExt.NgetSearchFlow.submitSearchWithRedirect(overlay);
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);

;
(function (root) {
  root.IRCTCExt = root.IRCTCExt || {};
  if (IRCTCExt.NgetReviewFlow) return;

  const sharedPrefs = () => IRCTCExt.PsgnPreferences;

  IRCTCExt.NgetReviewFlow = {
    getSelectors() {
      return IRCTCExt.SELECTORS?.review || IRCTCExt.NgetSelectors.review;
    },

    async waitForPassengerDetails() {
      const sel = IRCTCExt.NgetReviewFlow.getSelectors();
      const block = await IRCTCExt.Wait.poll(
        () => {
          const host = IRCTCExt.Wait.queryOne(sel.passengerDetailHost);
          if (!host || !IRCTCExt.Wait.isVisible(host)) return null;
          const content = IRCTCExt.Wait.queryOne(sel.passengerDetailContent, host);
          return content && IRCTCExt.Wait.isVisible(content) ? content : null;
        },
        { timeout: 20000, interval: 250 }
      );
      if (!block) throw new Error('Passenger details panel not found on review page');
      return block;
    },

    async showPassengerReviewPopup() {
      if (IRCTCExt.PaymentReviewOverlay?.showPassengerReview) {
        await IRCTCExt.PaymentReviewOverlay.showPassengerReview();
        return;
      }
      await IRCTCExt.NgetReviewFlow.waitForPassengerDetails();
    },

    findContinueButton() {
      const sel = IRCTCExt.NgetReviewFlow.getSelectors();
      const candidates = IRCTCExt.Wait.queryAll(sel.continueBtn);
      for (const btn of candidates) {
        if (!IRCTCExt.Wait.isVisible(btn)) continue;
        const text = (btn.textContent || '').replace(/\s+/g, ' ').trim();
        if (/^\s*continue\s*$/i.test(text)) return btn;
      }

      const buttons = Array.from(document.querySelectorAll('button.train_Search.btnDefault'));
      return (
        buttons.find((btn) => {
          if (!IRCTCExt.Wait.isVisible(btn)) return false;
          const text = (btn.textContent || '').replace(/\s+/g, ' ').trim();
          return /^\s*continue\s*$/i.test(text);
        }) || null
      );
    },

    isContinueEnabled(btn) {
      if (!btn || !IRCTCExt.Wait.isVisible(btn)) return false;
      if (btn.disabled) return false;
      if (btn.classList.contains('disabled')) return false;
      if (btn.getAttribute('aria-disabled') === 'true') return false;
      return true;
    },

    findConfirmationDialog() {
      const dialogs = document.querySelectorAll('[role="dialog"], .ui-dialog, .p-dialog');
      for (const dialog of dialogs) {
        if (!IRCTCExt.Wait.isVisible(dialog)) continue;
        const buttons = Array.from(dialog.querySelectorAll('button'));
        const hasContinue = buttons.some((btn) => {
          if (!IRCTCExt.Wait.isVisible(btn) || btn.disabled) return false;
          return /continue/i.test(btn.textContent || '');
        });
        if (hasContinue) return dialog;
      }
      return null;
    },

    findConfirmationContinueButton(root = document) {
      const buttons = Array.from(root.querySelectorAll('button'));
      return (
        buttons.find((btn) => {
          if (!IRCTCExt.Wait.isVisible(btn) || btn.disabled) return false;
          return /continue/i.test(btn.textContent || '');
        }) || null
      );
    },

    hasReachedPayment() {
      return IRCTCExt.NgetPaths.isPaymentPath(location.pathname);
    },

    async clickContinue(overlay) {
      overlay.setStatus('Waiting for Continue button...');

      const btn = await IRCTCExt.Wait.poll(
        () => {
          const candidate = IRCTCExt.NgetReviewFlow.findContinueButton();
          return candidate && IRCTCExt.NgetReviewFlow.isContinueEnabled(candidate) ? candidate : null;
        },
        { timeout: 20000, interval: 250 }
      );
      if (!btn) throw new Error('Continue button not found or still disabled');

      overlay.setStatus('Clicking Continue...');
      sharedPrefs().clickTarget(btn);
      await IRCTCExt.Wait.delay(800);
      return true;
    },

    async handleConfirmationIfNeeded(overlay) {
      const dialog = await IRCTCExt.Wait.poll(
        () => IRCTCExt.NgetReviewFlow.findConfirmationDialog(),
        { timeout: 5000, interval: 250 }
      );
      if (!dialog) return false;

      const btn = await IRCTCExt.Wait.poll(
        () => IRCTCExt.NgetReviewFlow.findConfirmationContinueButton(dialog),
        { timeout: 10000, interval: 250 }
      );
      if (!btn) return false;

      overlay.setStatus('Confirming booking review...');
      sharedPrefs().clickTarget(btn);
      await IRCTCExt.Wait.delay(500);
      return true;
    },

    async waitForNextStep(overlay, timeout = 60000) {
      if (IRCTCExt.NgetReviewFlow.hasReachedPayment()) return true;

      overlay.setStatus('Waiting for payment page...');
      const reached = await IRCTCExt.Wait.poll(
        () => {
          if (IRCTCExt.NgetReviewFlow.hasReachedPayment()) return true;
          const dialog = IRCTCExt.NgetReviewFlow.findConfirmationDialog();
          return dialog ? 'confirm' : null;
        },
        { timeout, interval: 500 }
      );

      if (reached === 'confirm') {
        await IRCTCExt.NgetReviewFlow.handleConfirmationIfNeeded(overlay);
        return IRCTCExt.NgetReviewFlow.waitForNextStep(overlay, timeout);
      }

      if (!reached) throw new Error('Did not reach payment page after review Continue');
      return true;
    },

    async run(overlay) {
      overlay.setStep('Review');
      overlay.setStatus('Loading passenger details...');

      await IRCTCExt.NgetReviewFlow.waitForPassengerDetails();
      await IRCTCExt.NgetReviewFlow.showPassengerReviewPopup();
      await IRCTCExt.Wait.delay(400);

      await IRCTCExt.NgetReviewFlow.clickContinue(overlay);
      await IRCTCExt.NgetReviewFlow.waitForNextStep(overlay);

      overlay.setStatus('Review complete — on payment page.');
      return true;
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);

;
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

;
(function (root) {
  root.IRCTCExt = root.IRCTCExt || {};
  if (IRCTCExt.NgetBookingFlow) return;

  function activateSharedBookingSelectors() {
    IRCTCExt.SELECTORS = {
      ...IRCTCExt.NgetSelectors
    };
  }

  IRCTCExt.NgetBookingFlow = {
    async fillPassengers(config, overlay) {
      if (!location.pathname.includes('psgninput')) {
        throw new Error('Not on passenger input page');
      }
      activateSharedBookingSelectors();
      return IRCTCExt.NgetPassengersFlow.addPassengers(config, overlay);
    },

    async configurePsgninputOptions(config, overlay) {
      if (!location.pathname.includes('psgninput')) {
        throw new Error('Not on passenger input page');
      }
      activateSharedBookingSelectors();
      return IRCTCExt.NgetPsgnPreferencesFlow.configure(config, overlay);
    },

    async clickContinueToPayment(overlay) {
      if (!location.pathname.includes('reviewBooking') && !location.pathname.includes('review')) {
        throw new Error('Not on review booking page');
      }
      activateSharedBookingSelectors();
      return IRCTCExt.NgetReviewFlow.run(overlay);
    },

    async handlePayment(config, overlay) {
      if (!IRCTCExt.NgetPaths.isPaymentPath(location.pathname)) {
        throw new Error('Not on NGET payment page');
      }
      activateSharedBookingSelectors();
      const method = config.preferences?.paymentMethod || 'cards';
      if (method === 'upi') {
        return IRCTCExt.NgetPaymentFlow.handleUpi(config, overlay);
      }
      return IRCTCExt.NgetPaymentFlow.handleCards(config, overlay);
    },

    async showPaymentReview(overlay) {
      activateSharedBookingSelectors();
      overlay.setStep('Payment');
      const message = 'Complete payment manually on IRCTC.';
      if (IRCTCExt.PaymentReviewOverlay?.show) {
        await IRCTCExt.PaymentReviewOverlay.show();
        overlay.showPause(message);
      } else {
        overlay.setStatus(message);
        overlay.showPause?.(message);
      }
      await IRCTCExt.Storage.updateState({ status: 'done', running: false, currentStep: 'done' });
      return true;
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);

;
(function (root) {
  root.IRCTCExt = root.IRCTCExt || {};

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
    isGatewayPath: IRCTCExt.NgetPaths.isGatewayPath.bind(IRCTCExt.NgetPaths),
    isGatewayHost: IRCTCExt.NgetPaths.isGatewayHost.bind(IRCTCExt.NgetPaths),
    isGatewayAuthRedirectPath: IRCTCExt.NgetPaths.isGatewayAuthRedirectPath.bind(IRCTCExt.NgetPaths),
    flows: {
      LoginFlow: IRCTCExt.NgetLoginFlow,
      SearchFlow: IRCTCExt.NgetSearchFlow,
      BookingFlow: IRCTCExt.NgetBookingFlow
    },
    TrainList: IRCTCExt.NgetTrainList
  };

  IRCTCExt.SiteRegistry?.register(IRCTCExt.NgetSite);
})(typeof globalThis !== 'undefined' ? globalThis : window);

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

IRCTCExt.Modals = {
  _pollTimer: null,
  _scanTimer: null,
  _initialized: false,

  forceHide(el) {
    if (!el) return false;
    el.style.setProperty('display', 'none', 'important');
    el.style.setProperty('visibility', 'hidden', 'important');
    el.style.setProperty('pointer-events', 'none', 'important');
    el.setAttribute('aria-hidden', 'true');
    return true;
  },

  isSessionRestoreRoot(el) {
    if (!el || el.nodeType !== 1) return false;

    const sel = IRCTCExt.SELECTORS?.modals;
    const titleSelectors = sel?.sessionRestoreTitle || ['.bc-title'];

    for (const selector of titleSelectors) {
      const titles = el.querySelectorAll(selector);
      for (const title of titles) {
        if (!IRCTCExt.Wait?.isVisible(title)) continue;
        if (/session\s*restore/i.test(title.textContent || '')) return true;
      }
    }

    return false;
  },

  collectSessionRestoreRoots(root = document) {
    const roots = new Set();
    const sel = IRCTCExt.SELECTORS?.modals;

    const overlaySelectors = sel?.sessionRestoreOverlay || ['.bc-overlay'];
    for (const selector of overlaySelectors) {
      root.querySelectorAll(selector).forEach((el) => {
        if (this.isSessionRestoreRoot(el)) roots.add(el);
      });
    }

    const hostSelectors = sel?.sessionRestoreHost || ['app-book-now-confirmation'];
    for (const selector of hostSelectors) {
      root.querySelectorAll(selector).forEach((el) => {
        if (this.isSessionRestoreRoot(el)) roots.add(el);
      });
    }

    return Array.from(roots);
  },

  dismissSessionRestore(root = document) {
    const sel = IRCTCExt.SELECTORS?.modals;
    let dismissed = 0;

    for (const sessionRoot of this.collectSessionRestoreRoots(root)) {
      const cardSelectors = sel?.sessionRestoreCard || ['.bc-card'];
      for (const selector of cardSelectors) {
        sessionRoot.querySelectorAll(selector).forEach((card) => {
          if (this.forceHide(card)) dismissed += 1;
        });
      }

      if (sessionRoot.matches?.('.bc-overlay, .bc-card')) {
        if (this.forceHide(sessionRoot)) dismissed += 1;
      }

      const host = sessionRoot.closest('app-book-now-confirmation');
      if (host && this.forceHide(host)) dismissed += 1;

      if (this.forceHide(sessionRoot)) dismissed += 1;
    }

    return dismissed;
  },

  collectBookNowHosts(root = document) {
    const hosts = new Set();
    if (root.nodeType === 1) {
      if (root.matches?.('app-book-now-confirmation')) hosts.add(root);
      root.querySelectorAll('app-book-now-confirmation').forEach((el) => hosts.add(el));
    }
    return Array.from(hosts);
  },

  isReviewPaymentConfirmation(host) {
    if (!host || !IRCTCExt.Wait?.isVisible(host)) return false;
    if (this.isSessionRestoreRoot(host)) return false;

    if (location.pathname.includes('reviewBooking')) return true;

    const sel = IRCTCExt.SELECTORS?.psgnPreferences;
    if (sel?.availabilityStatus) {
      const status = IRCTCExt.Wait.queryOne(sel.availabilityStatus, host);
      if (status && IRCTCExt.Wait.isVisible(status)) return true;
    }

    const text = (host.textContent || '').replace(/\s+/g, ' ').trim();
    if (/booking\s*review|continue\s*to\s*payment/i.test(text)) return true;
    if (/available-\d+/i.test(text)) return true;

    return false;
  },

  hideBookNowConfirmation(host) {
    return this.forceHide(host);
  },

  dismissBookNowConfirmation(root = document) {
    const hosts = this.collectBookNowHosts(root);
    let dismissed = 0;

    for (const host of hosts) {
      if (this.isReviewPaymentConfirmation(host)) continue;
      if (this.hideBookNowConfirmation(host)) dismissed += 1;
    }

    return dismissed;
  },

  dismissInterruptModals(root = document) {
    let dismissed = 0;
    dismissed += this.dismissSessionRestore(root);
    dismissed += this.dismissBookNowConfirmation(root);
    return dismissed;
  },

  scheduleScan() {
    if (this._scanTimer) return;
    this._scanTimer = setTimeout(() => {
      this._scanTimer = null;
      this.dismissInterruptModals();
    }, 50);
  },

  init() {
    if (this._initialized) return;
    this._initialized = true;

    this.dismissInterruptModals();

    const observer = new MutationObserver(() => {
      this.scheduleScan();
    });

    const startObserver = () => {
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true
      });
    };

    if (document.documentElement) {
      startObserver();
    } else {
      document.addEventListener('DOMContentLoaded', startObserver, { once: true });
    }

    this._pollTimer = setInterval(() => this.dismissInterruptModals(), 400);

    document.addEventListener('DOMContentLoaded', () => this.dismissInterruptModals(), { once: true });
    window.addEventListener('load', () => this.dismissInterruptModals(), { once: true });
  }
};

IRCTCExt.Modals.init();

;
window.IRCTCExt = window.IRCTCExt || {};

IRCTCExt.Events = {
  mouseEventOpts(el) {
    const rect = el.getBoundingClientRect();
    return {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
      buttons: 1
    };
  },

  clickWithMouse(el) {
    if (!el) return;
    el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    const opts = IRCTCExt.Events.mouseEventOpts(el);
    el.dispatchEvent(new MouseEvent('mousedown', opts));
    el.dispatchEvent(new MouseEvent('mouseup', opts));
    el.dispatchEvent(new MouseEvent('click', opts));
  },

  clickPrimeDropdownItem(option) {
    if (!option) return false;

    const li =
      option.matches?.('li[role="option"], li.ui-dropdown-item')
        ? option
        : option.closest?.('li[role="option"], li.ui-dropdown-item');
    const span = li?.querySelector('span') || option.querySelector?.('span');
    const host = li?.closest?.('p-dropdownitem') || option.closest?.('p-dropdownitem');

    const targets = [li, span, host, option].filter(Boolean);
    for (const target of targets) {
      target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      const opts = IRCTCExt.Events.mouseEventOpts(target);
      target.dispatchEvent(new MouseEvent('mousedown', opts));
      target.dispatchEvent(new MouseEvent('mouseup', opts));
      target.dispatchEvent(new MouseEvent('click', opts));
    }

    return true;
  },

  click(el) {
    if (!el) return;
    el.scrollIntoView({ block: 'center', inline: 'nearest' });

    // Native click avoids IRCTC pointer-lock handlers triggered by synthetic PointerEvents.
    if (typeof el.click === 'function') {
      el.click();
      return;
    }

    IRCTCExt.Events.clickWithMouse(el);
  },

  setNativeValue(el, value) {
    if (!el) return;
    let proto = HTMLInputElement.prototype;
    if (el instanceof HTMLTextAreaElement) proto = HTMLTextAreaElement.prototype;
    else if (el instanceof HTMLSelectElement) proto = HTMLSelectElement.prototype;
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

  keyCodeFor(key) {
    const map = {
      Enter: 'Enter',
      Home: 'Home',
      ArrowDown: 'ArrowDown',
      ArrowUp: 'ArrowUp',
      Escape: 'Escape',
      Tab: 'Tab',
      ' ': 'Space'
    };
    if (map[key]) return map[key];
    if (key.length === 1) return `Key${key.toUpperCase()}`;
    return key;
  },

  keyEvent(el, type, key) {
    el.dispatchEvent(
      new KeyboardEvent(type, {
        key,
        code: IRCTCExt.Events.keyCodeFor(key),
        bubbles: true,
        cancelable: true
      })
    );
  },

  pressKey(el, key) {
    IRCTCExt.Events.keyEvent(el, 'keydown', key);
    IRCTCExt.Events.keyEvent(el, 'keyup', key);
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

IRCTCExt.Stations = {
  CLASS_LABELS: {
    SL: 'Sleeper (SL)',
    '3A': 'AC 3 Tier (3A)',
    '2A': 'AC 2 Tier (2A)',
    '1A': 'AC First Class (1A)',
    CC: 'AC Chair car (CC)',
    '2S': 'Second Sitting (2S)',
    '3E': 'AC 3 Economy (3E)',
    EC: 'Exec. Chair Car (EC)',
    EV: 'Vistadome AC (EV)',
    EA: 'Anubhuti Class (EA)',
    FC: 'First Class (FC)',
    VC: 'Vistadome Chair Car (VC)',
    VS: 'Vistadome Non AC (VS)'
  },

  CLASS_OPTIONS: ['SL', '3A', '2A', '1A', 'CC', '2S', '3E', 'EC', 'EV', 'EA', 'FC', 'VC', 'VS'],

  QUOTA_OPTIONS: [
    'TATKAL',
    'GENERAL',
    'LADIES',
    'LOWER BERTH/SR.CITIZEN',
    'PERSON WITH DISABILITY',
    'DUTY PASS',
    'PREMIUM TATKAL'
  ],

  GENDER_OPTIONS: ['M', 'F', 'T'],

  BERTH_OPTIONS: [
    'No Preference',
    'Lower',
    'Middle',
    'Upper',
    'Window Side',
    'Side Lower',
    'Side Upper'
  ],

  FOOD_OPTIONS: ['Veg', 'Non-Veg', 'No Food'],

  AC_CLASSES: ['1A', '2A', '3A', 'CC', 'EC', 'EV', '3E'],
  NON_AC_CLASSES: ['SL', '2S'],

  getClassLabel(code) {
    return IRCTCExt.Stations.CLASS_LABELS[code] || code;
  },

  normalizeQuota(quota) {
    return String(quota || '').trim().toUpperCase();
  },

  quotaOptionText(quota) {
    const key = IRCTCExt.Stations.normalizeQuota(quota);
    if (key === 'TATKAL') return 'TATKAL';
    if (key === 'PREMIUM TATKAL' || key === 'PREMIUM_TATKAL') return 'PREMIUM TATKAL';
    if (key === 'LADIES') return 'LADIES';
    if (key === 'GENERAL') return 'GENERAL';
    if (key.includes('LOWER') || key.includes('SR.CITIZEN') || key.includes('SENIOR')) {
      return 'LOWER BERTH/SR.CITIZEN';
    }
    if (key.includes('DISABILITY') || key === 'PWD') return 'PERSON WITH DISABILITY';
    if (key.includes('DUTY')) return 'DUTY PASS';
    return key;
  },

  normalizeStationText(text) {
    return String(text || '').trim().toLowerCase();
  },

  stationSearchTerms(text) {
    const raw = String(text || '').trim();
    if (!raw) return [];

    const terms = [];
    const add = (value) => {
      const v = String(value || '').trim();
      if (v && !terms.some((t) => t.toLowerCase() === v.toLowerCase())) terms.push(v);
    };

    add(raw);

    const pipeParts = raw.split('|').map((part) => part.trim()).filter(Boolean);
    if (pipeParts.length > 1) {
      add(pipeParts[0]);
      add(pipeParts[pipeParts.length - 1]);
    }

    const parenMatch = raw.match(/\(([A-Z]{2,5})\)/i);
    if (parenMatch) add(parenMatch[1]);

    const codeMatch = raw.match(/\b([A-Z]{2,5})\b/);
    if (codeMatch) add(codeMatch[1]);

    if (/^[A-Za-z]{2,5}$/.test(raw)) add(raw.toUpperCase());

    return terms;
  },

  formatDateForIRCTC(dateValue) {
    if (!dateValue) return '';
    if (dateValue.includes('/')) return dateValue;
    const iso = String(dateValue).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
    const d = new Date(dateValue);
    if (Number.isNaN(d.getTime())) return dateValue;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  },

  parseJourneyDate(dateValue) {
    if (!dateValue) return null;
    const iso = String(dateValue).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) {
      const d = new Date(`${iso[1]}-${iso[2]}-${iso[3]}T12:00:00`);
      if (!Number.isNaN(d.getTime())) return d;
    }
    const d = new Date(dateValue);
    return Number.isNaN(d.getTime()) ? null : d;
  },

  formatDateForNgetCard(dateValue) {
    const d = IRCTCExt.Stations.parseJourneyDate(dateValue);
    if (!d) return '';
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${weekdays[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
  },

  dateLabelsMatch(journeyDate, cardLabel) {
    const d = IRCTCExt.Stations.parseJourneyDate(journeyDate);
    if (!d || !cardLabel) return false;

    const expected = IRCTCExt.Stations.formatDateForNgetCard(journeyDate);
    const normalizedCard = String(cardLabel).replace(/\s+/g, ' ').trim();
    const normalizedExpected = String(expected).replace(/\s+/g, ' ').trim();

    if (normalizedCard.toLowerCase() === normalizedExpected.toLowerCase()) return true;

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayMonth = `${d.getDate()} ${months[d.getMonth()]}`;
    return new RegExp(`\\b${dayMonth.replace(/\s+/g, '\\s+')}\\b`, 'i').test(normalizedCard);
  }
};

;
window.IRCTCExt = window.IRCTCExt || {};

IRCTCExt.Passengers = {
  normalizeName(name) {
    return (name || '').replace(/\s+/g, ' ').trim().toLowerCase();
  },

  extractRowName(row) {
    const nameEl = row.querySelector('.ep-passenger-name');
    if (!nameEl) return '';
    return (nameEl.textContent || '').replace(/\s+/g, ' ').trim();
  },

  parseRowDetails(row) {
    const detailsEl = row.querySelector('.ep-passenger-details');
    if (!detailsEl) return { age: '', gender: '', country: '', berth: '', food: '' };

    const text = (detailsEl.textContent || '')
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const parts = text.split('|').map((p) => p.trim());
    const agePart = (parts[0] || '').replace(/^age\s*/i, '').trim();

    return {
      age: agePart,
      gender: parts[1] || '',
      country: parts[2] || '',
      berth: parts[3] || '',
      food: parts[4] || ''
    };
  },

  foodToken(food) {
    const map = {
      Veg: 'VEG',
      'Non-Veg': 'NON_VEG',
      'No Food': 'NO_FOOD'
    };
    return (map[food] || food || '').toLowerCase();
  },

  foodLabel(food) {
    const map = {
      Veg: 'Veg',
      'Non-Veg': 'Non-Veg',
      'No Food': 'No Food'
    };
    return map[food] || food || '';
  },

  genderToken(gender) {
    const map = {
      M: 'male',
      F: 'female',
      T: 'transgender'
    };
    return (map[gender] || gender || '').toLowerCase();
  },

  genderLabel(gender) {
    const map = {
      M: 'Male',
      F: 'Female',
      T: 'Transgender'
    };
    return map[gender] || gender || 'Male';
  },

  berthToken(berth) {
    const map = {
      'No Preference': 'no preference',
      Upper: 'upper',
      Lower: 'lower',
      Middle: 'middle',
      'Window Side': 'window side',
      'Side Lower': 'side lower',
      'Side Upper': 'side upper'
    };
    return (map[berth] || berth || '').toLowerCase();
  },

  berthLabel(berth) {
    const value = String(berth || '').trim();
    if (!value || value === 'No Preference') return '';
    return value;
  },

  berthLabelsToTry(berth) {
    const label = IRCTCExt.Passengers.berthLabel(berth);
    if (!label) return [];
    if (label === 'Window Side') return ['Window Side', 'Side Lower'];
    return [label];
  },

  segmentMatches(actual, expected) {
    const a = (actual || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const e = (expected || '').replace(/\s+/g, ' ').trim().toLowerCase();
    if (!e) return false;
    return a === e || a.includes(e) || e.includes(a);
  },

  nameMatchesRow(row, passenger) {
    const rowName = IRCTCExt.Passengers.normalizeName(IRCTCExt.Passengers.extractRowName(row));
    const configName = IRCTCExt.Passengers.normalizeName(passenger.name);
    return rowName === configName;
  },

  rowMatchesPassengerStrict(row, passenger) {
    if (!IRCTCExt.Passengers.nameMatchesRow(row, passenger)) return false;

    const details = IRCTCExt.Passengers.parseRowDetails(row);
    if (passenger.age && String(details.age).trim() !== String(passenger.age).trim()) {
      return false;
    }
    if (
      passenger.gender &&
      (!details.gender ||
        !IRCTCExt.Passengers.segmentMatches(
          details.gender,
          IRCTCExt.Passengers.genderToken(passenger.gender)
        ))
    ) {
      return false;
    }

    return true;
  },

  findExistingRowStrict(rows, passenger, usedRows = new Set()) {
    const candidates = rows.filter(
      (row) => !usedRows.has(row) && IRCTCExt.Passengers.rowMatchesPassengerStrict(row, passenger)
    );
    return candidates[0] || null;
  },

  scoreRowMatch(row, passenger) {
    const details = IRCTCExt.Passengers.parseRowDetails(row);
    let score = 0;

    if (passenger.age && String(details.age).trim() === String(passenger.age).trim()) {
      score += 3;
    }
    if (passenger.gender && IRCTCExt.Passengers.segmentMatches(details.gender, IRCTCExt.Passengers.genderToken(passenger.gender))) {
      score += 2;
    }
    if (passenger.berth && IRCTCExt.Passengers.segmentMatches(details.berth, IRCTCExt.Passengers.berthToken(passenger.berth))) {
      score += 2;
    }
    if (passenger.food && IRCTCExt.Passengers.segmentMatches(details.food, IRCTCExt.Passengers.foodToken(passenger.food))) {
      score += 1;
    }

    return score;
  },

  findPassengerRow(rows, passenger, usedRows) {
    const candidates = rows.filter(
      (row) => !usedRows.has(row) && IRCTCExt.Passengers.nameMatchesRow(row, passenger)
    );

    if (!candidates.length) return null;

    if (candidates.length === 1) return candidates[0];

    let best = candidates[0];
    let bestScore = IRCTCExt.Passengers.scoreRowMatch(best, passenger);

    for (let i = 1; i < candidates.length; i += 1) {
      const row = candidates[i];
      const score = IRCTCExt.Passengers.scoreRowMatch(row, passenger);
      if (score > bestScore) {
        bestScore = score;
        best = row;
      }
    }

    return best;
  },

  partitionPassengers(rows, passengers) {
    const matched = [];
    const unmatched = [];
    const usedRows = new Set();

    for (const passenger of passengers) {
      const row = IRCTCExt.Passengers.findPassengerRow(rows, passenger, usedRows);
      if (row) {
        matched.push({ passenger, row });
        usedRows.add(row);
      } else {
        unmatched.push(passenger);
      }
    }

    return { matched, unmatched };
  },

  toggleRowCheckbox(row) {
    const box = row.querySelector('.ui-chkbox-box');
    if (!box) {
      IRCTCExt.Events.click(row);
      return;
    }
    if (box.classList.contains('ui-state-active')) return;
    IRCTCExt.Events.click(box);
  },

  countPassengerListCards() {
    return IRCTCExt.Passengers.getPassengerListCards().length;
  },

  getPassengerListCards() {
    const sel = IRCTCExt.SELECTORS.passengers;
    const cards = IRCTCExt.Wait.queryAll(sel.passengerListCard);
    return cards.filter((card) => IRCTCExt.Wait.isVisible(card));
  },

  parsePassengerListCard(card) {
    const sel = IRCTCExt.SELECTORS.passengers;
    const nameEl = IRCTCExt.Wait.queryOne(sel.passengerCardName, card);
    const rawName = (nameEl?.textContent || '').replace(/\s+/g, ' ').trim();
    const name = rawName.replace(/^\d+\.\s*/, '').trim();

    const details = { name, age: '', gender: '', country: '', berth: '', dob: '' };
    const detailRow = IRCTCExt.Wait.queryOne(sel.passengerCardDetails, card) || card;
    const items = detailRow.querySelectorAll('.detail-item');

    for (const item of items) {
      const text = (item.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text) continue;

      const labelEl = item.querySelector('.detail-label');
      if (labelEl) {
        const label = (labelEl.textContent || '').replace(/:\s*$/, '').trim().toLowerCase();
        const valueEl = item.querySelector('.detail-value');
        const value = (valueEl?.textContent || text.replace(labelEl.textContent, ''))
          .replace(/\s+/g, ' ')
          .trim();
        if (label === 'age') details.age = value;
        else if (label === 'dob') details.dob = value;
        continue;
      }

      if (/^(male|female|transgender)$/i.test(text)) {
        details.gender = text;
      } else if (/^india$/i.test(text)) {
        details.country = text;
      } else if (
        /^(upper|lower|middle|window side|side lower|side upper|no preference)$/i.test(text)
      ) {
        details.berth = text;
      }
    }

    return details;
  },

  nameMatchesListCard(card, passenger) {
    const parsed = IRCTCExt.Passengers.parsePassengerListCard(card);
    return (
      IRCTCExt.Passengers.normalizeName(parsed.name) ===
      IRCTCExt.Passengers.normalizeName(passenger.name)
    );
  },

  listCardMatchesPassengerStrict(card, passenger) {
    const details = IRCTCExt.Passengers.parsePassengerListCard(card);
    if (
      IRCTCExt.Passengers.normalizeName(details.name) !==
      IRCTCExt.Passengers.normalizeName(passenger.name)
    ) {
      return false;
    }
    if (passenger.age && String(details.age).trim() !== String(passenger.age).trim()) {
      return false;
    }
    if (
      passenger.gender &&
      (!details.gender ||
        !IRCTCExt.Passengers.segmentMatches(
          details.gender,
          IRCTCExt.Passengers.genderToken(passenger.gender)
        ))
    ) {
      return false;
    }
    return true;
  },

  findListCardStrict(cards, passenger, usedCards = new Set()) {
    return (
      cards.find(
        (card) => !usedCards.has(card) && IRCTCExt.Passengers.listCardMatchesPassengerStrict(card, passenger)
      ) || null
    );
  },

  passengerAlreadyOnList(passenger, usedCards = new Set()) {
    const cards = IRCTCExt.Passengers.getPassengerListCards();
    return !!IRCTCExt.Passengers.findListCardStrict(cards, passenger, usedCards);
  },

  scoreListCardMatch(card, passenger) {
    if (!IRCTCExt.Passengers.nameMatchesListCard(card, passenger)) return -1;

    const details = IRCTCExt.Passengers.parsePassengerListCard(card);
    let score = 10;

    if (passenger.age && String(details.age).trim() === String(passenger.age).trim()) {
      score += 3;
    }
    if (
      passenger.gender &&
      details.gender &&
      IRCTCExt.Passengers.segmentMatches(
        details.gender,
        IRCTCExt.Passengers.genderToken(passenger.gender)
      )
    ) {
      score += 2;
    }

    const berth = (passenger.berth || '').trim();
    if (berth && berth !== 'No Preference') {
      if (
        details.berth &&
        IRCTCExt.Passengers.segmentMatches(details.berth, IRCTCExt.Passengers.berthToken(berth))
      ) {
        score += 2;
      }
    } else {
      score += 1;
    }

    return score;
  },

  findListCardForPassenger(cards, passenger, usedCards) {
    const candidates = cards.filter(
      (card) => !usedCards.has(card) && IRCTCExt.Passengers.nameMatchesListCard(card, passenger)
    );
    if (!candidates.length) return null;
    if (candidates.length === 1) return candidates[0];

    let best = candidates[0];
    let bestScore = IRCTCExt.Passengers.scoreListCardMatch(best, passenger);

    for (let i = 1; i < candidates.length; i += 1) {
      const card = candidates[i];
      const score = IRCTCExt.Passengers.scoreListCardMatch(card, passenger);
      if (score > bestScore) {
        bestScore = score;
        best = card;
      }
    }

    return best;
  },

  partitionListCards(cards, passengers) {
    const matched = [];
    const unmatchedPassengers = [];
    const usedCards = new Set();

    for (const passenger of passengers) {
      const card = IRCTCExt.Passengers.findListCardStrict(cards, passenger, usedCards);
      if (card) {
        matched.push({ passenger, card });
        usedCards.add(card);
      } else {
        unmatchedPassengers.push(passenger);
      }
    }

    const extraCards = cards.filter((card) => !usedCards.has(card));
    return { matched, unmatchedPassengers, extraCards };
  },

  getMismatchType(card, passenger) {
    const details = IRCTCExt.Passengers.parsePassengerListCard(card);

    if (!IRCTCExt.Passengers.nameMatchesListCard(card, passenger)) return 'name';
    if (passenger.age && String(details.age).trim() !== String(passenger.age).trim()) {
      return 'age';
    }

    if (
      passenger.gender &&
      (!details.gender ||
        !IRCTCExt.Passengers.segmentMatches(
          details.gender,
          IRCTCExt.Passengers.genderToken(passenger.gender)
        ))
    ) {
      return 'gender';
    }

    const berth = (passenger.berth || '').trim();
    if (berth && berth !== 'No Preference') {
      if (
        !details.berth ||
        !IRCTCExt.Passengers.segmentMatches(details.berth, IRCTCExt.Passengers.berthToken(berth))
      ) {
        return 'berth';
      }
    }

    return null;
  },

  cardMatchesPassenger(card, passenger) {
    return IRCTCExt.Passengers.getMismatchType(card, passenger) === null;
  },

  isIdentityMismatch(mismatchType) {
    return mismatchType === 'name' || mismatchType === 'age' || mismatchType === 'gender';
  },

  isEditPassengerModalOpen() {
    const sel = IRCTCExt.SELECTORS.passengers;
    const modal = IRCTCExt.Wait.queryOne(sel.editPassengerModal);
    if (!modal || !IRCTCExt.Wait.isVisible(modal)) return false;
    const title = IRCTCExt.Wait.queryOne(sel.newPassengerTitle, modal);
    return !!(title && /passenger/i.test(title.textContent || ''));
  },

  async confirmPassengerDeleteIfNeeded() {
    const sel = IRCTCExt.SELECTORS.passengers;
    const dialogs = [...document.querySelectorAll('.ui-dialog, [role="dialog"]')].filter((dialog) =>
      IRCTCExt.Wait.isVisible(dialog)
    );

    for (const dialog of dialogs) {
      const buttons = [...dialog.querySelectorAll('button')].filter((btn) =>
        IRCTCExt.Wait.isVisible(btn)
      );
      const confirmBtn =
        buttons.find((btn) => /delete|confirm|yes|ok/i.test(btn.textContent || '')) ||
        IRCTCExt.Wait.queryOne(sel.passengerDeleteConfirmBtn, dialog);
      if (confirmBtn) {
        IRCTCExt.Events.click(confirmBtn);
        await IRCTCExt.Wait.delay(300);
        return true;
      }
    }

    return false;
  },

  async deletePassengerCard(card, overlay) {
    const sel = IRCTCExt.SELECTORS.passengers;
    const name = IRCTCExt.Passengers.parsePassengerListCard(card).name;
    overlay.setStatus(`Deleting passenger: ${name}...`);

    const deleteBtn = IRCTCExt.Wait.queryOne(sel.passengerDeleteBtn, card);
    if (!deleteBtn || !IRCTCExt.Wait.isVisible(deleteBtn)) {
      throw new Error(`Delete button not found for ${name}`);
    }

    IRCTCExt.Events.click(deleteBtn);
    await IRCTCExt.Wait.delay(400);
    await IRCTCExt.Passengers.confirmPassengerDeleteIfNeeded();

    const removed = await IRCTCExt.Wait.poll(
      () => (!document.contains(card) ? true : null),
      { timeout: 10000, interval: 200 }
    );
    if (!removed) throw new Error(`Passenger card was not removed: ${name}`);
    return true;
  },

  async editPassengerCard(card, passenger, overlay) {
    const sel = IRCTCExt.SELECTORS.passengers;
    overlay.setStatus(`Editing passenger: ${passenger.name}...`);

    const editBtn = IRCTCExt.Wait.queryOne(sel.passengerEditBtn, card);
    if (!editBtn || !IRCTCExt.Wait.isVisible(editBtn)) {
      throw new Error(`Edit button not found for ${passenger.name}`);
    }

    IRCTCExt.Events.click(editBtn);
    await IRCTCExt.Wait.delay(500);

    const modal = await IRCTCExt.Wait.poll(
      () =>
        IRCTCExt.Passengers.isEditPassengerModalOpen()
          ? IRCTCExt.Wait.queryOne(sel.editPassengerModal)
          : null,
      { timeout: 10000, interval: 200 }
    );
    if (!modal) throw new Error(`Edit modal did not open for ${passenger.name}`);

    if (passenger.gender) {
      const genderLabel = IRCTCExt.Passengers.genderLabel(passenger.gender);
      const genderOk = await IRCTCExt.Passengers.selectDropdownIn(
        modal,
        sel.newPassengerGender,
        genderLabel
      );
      if (!genderOk) throw new Error(`Could not set gender for ${passenger.name}`);
    }

    const berthOk = await IRCTCExt.Passengers.selectBerthPreference(modal, passenger);
    if (!berthOk) {
      throw new Error(
        `Could not set berth for ${passenger.name}: ${IRCTCExt.Passengers.berthLabel(passenger.berth)}`
      );
    }

    const foodLabel = IRCTCExt.Passengers.foodLabel(passenger.food);
    if (foodLabel) {
      const foodDropdown = IRCTCExt.Wait.queryOne(sel.newPassengerFood, modal);
      if (foodDropdown && IRCTCExt.Wait.isVisible(foodDropdown)) {
        await IRCTCExt.Passengers.selectDropdownIn(modal, sel.newPassengerFood, foodLabel);
      }
    }

    const saveBtn =
      IRCTCExt.Wait.queryOne(sel.editPassengerSaveBtn, modal) ||
      IRCTCExt.Wait.queryOne(sel.newPassengerAddBtn, modal);
    if (!saveBtn) throw new Error('Save button not found in edit passenger modal');

    IRCTCExt.Events.click(saveBtn);

    await IRCTCExt.Wait.poll(
      () => (IRCTCExt.Passengers.isEditPassengerModalOpen() ? null : true),
      { timeout: 12000, interval: 200 }
    );

    await IRCTCExt.Wait.delay(300);
    return true;
  },

  async verifyAndReconcilePassengerList(config, overlay) {
    const passengers = (config.passengers || []).filter((p) => p.name && String(p.name).trim());
    const maxPasses = 3;

    for (let pass = 1; pass <= maxPasses; pass += 1) {
      overlay.setStatus(`Verifying passenger list (${pass}/${maxPasses})...`);
      await IRCTCExt.Wait.delay(400);

      let changed = false;
      let cards = IRCTCExt.Passengers.getPassengerListCards();
      let { matched, unmatchedPassengers, extraCards } = IRCTCExt.Passengers.partitionListCards(
        cards,
        passengers
      );

      for (const card of extraCards) {
        const parsed = IRCTCExt.Passengers.parsePassengerListCard(card);
        overlay.setStatus(`Removing extra passenger: ${parsed.name || 'unknown'}...`);
        await IRCTCExt.Passengers.deletePassengerCard(card, overlay);
        changed = true;
      }

      if (changed) {
        cards = IRCTCExt.Passengers.getPassengerListCards();
        ({ matched, unmatchedPassengers, extraCards } = IRCTCExt.Passengers.partitionListCards(
          cards,
          passengers
        ));
      }

      for (let i = 0; i < matched.length; i += 1) {
        const { passenger, card } = matched[i];
        overlay.setStatus(
          `Verifying passenger ${i + 1}/${passengers.length}: ${passenger.name}...`
        );
        const mismatch = IRCTCExt.Passengers.getMismatchType(card, passenger);
        if (!mismatch) continue;

        if (IRCTCExt.Passengers.isIdentityMismatch(mismatch)) {
          await IRCTCExt.Passengers.deletePassengerCard(card, overlay);
          const expectedCount = IRCTCExt.Passengers.countPassengerListCards() + 1;
          overlay.setStatus(`Re-adding missing: ${passenger.name}...`);
          await IRCTCExt.Passengers.addOnePassenger(passenger, overlay, expectedCount);
        } else {
          await IRCTCExt.Passengers.editPassengerCard(card, passenger, overlay);
        }
        changed = true;
      }

      for (const passenger of unmatchedPassengers) {
        const expectedCount = IRCTCExt.Passengers.countPassengerListCards() + 1;
        overlay.setStatus(`Re-adding missing: ${passenger.name}...`);
        await IRCTCExt.Passengers.addOnePassenger(passenger, overlay, expectedCount);
        changed = true;
      }

      if (!changed) {
        const finalCards = IRCTCExt.Passengers.getPassengerListCards();
        if (finalCards.length !== passengers.length) {
          throw new Error(
            `Expected ${passengers.length} passenger(s), found ${finalCards.length}`
          );
        }

        const usedCards = new Set();
        const allMatch = passengers.every((passenger) => {
          const card = IRCTCExt.Passengers.findListCardStrict(finalCards, passenger, usedCards);
          if (!card || !IRCTCExt.Passengers.listCardMatchesPassengerStrict(card, passenger)) {
            return false;
          }
          if (!IRCTCExt.Passengers.cardMatchesPassenger(card, passenger)) {
            return false;
          }
          usedCards.add(card);
          return true;
        });

        if (!allMatch) {
          const failing = passengers.find((passenger) => {
            const card = IRCTCExt.Passengers.findListCardStrict(finalCards, passenger, new Set());
            return (
              !card ||
              !IRCTCExt.Passengers.listCardMatchesPassengerStrict(card, passenger) ||
              !IRCTCExt.Passengers.cardMatchesPassenger(card, passenger)
            );
          });
          if (pass === maxPasses) {
            throw new Error(`Could not verify passenger: ${failing?.name || 'unknown'}`);
          }
          changed = true;
        } else {
          overlay.setStatus(`Verified ${passengers.length} passenger(s)`);
          return true;
        }
      }
    }

    throw new Error('Passenger list verification failed after multiple attempts');
  },

  isExistingModalOpen() {
    const sel = IRCTCExt.SELECTORS.passengers;
    const mask = IRCTCExt.Wait.queryOne(sel.existingModal);
    if (!mask || !IRCTCExt.Wait.isVisible(mask)) return false;
    const title = IRCTCExt.Wait.queryOne(sel.existingModalTitle, mask);
    return !!(title && /add existing passenger/i.test(title.textContent || ''));
  },

  isNewPassengerModalOpen() {
    const sel = IRCTCExt.SELECTORS.passengers;
    const modal = IRCTCExt.Wait.queryOne(sel.newPassengerModal);
    if (!modal || !IRCTCExt.Wait.isVisible(modal)) return false;
    const title = IRCTCExt.Wait.queryOne(sel.newPassengerTitle, modal);
    return !!(title && /add passenger/i.test(title.textContent || ''));
  },

  async closeModalCancel(cancelSelectors, isOpenFn) {
    if (!isOpenFn()) return;

    const cancelBtn = IRCTCExt.Wait.queryOne(cancelSelectors);
    if (!cancelBtn) throw new Error('Cancel button not found');
    IRCTCExt.Events.click(cancelBtn);

    const closed = await IRCTCExt.Wait.poll(
      () => (isOpenFn() ? null : true),
      { timeout: 8000, interval: 200 }
    );
    if (!closed) throw new Error('Modal did not close after Cancel');
  },

  async waitForPassengerCount(minCount) {
    const count = await IRCTCExt.Wait.poll(
      () => {
        const current = IRCTCExt.Passengers.countPassengerListCards();
        return current >= minCount ? current : null;
      },
      { timeout: 15000, interval: 300 }
    );
    if (!count) {
      throw new Error(`Passengers were not added (expected at least ${minCount})`);
    }
    return count;
  },

  async openExistingPassengerModal(overlay) {
    const sel = IRCTCExt.SELECTORS.passengers;

    if (IRCTCExt.Passengers.isExistingModalOpen()) {
      return IRCTCExt.Wait.queryOne(sel.existingModal);
    }

    overlay.setStatus('Opening existing passenger list...');
    const existingBtn = await IRCTCExt.Wait.waitFor(sel.existingPassengerBtn, {
      timeout: 20000,
      visible: true
    });
    if (!existingBtn) throw new Error('Existing Passenger button not found');

    IRCTCExt.Events.click(existingBtn);

    const modalReady = await IRCTCExt.Wait.poll(
      () => (IRCTCExt.Passengers.isExistingModalOpen() ? IRCTCExt.Wait.queryOne(sel.existingModal) : null),
      { timeout: 12000, interval: 200 }
    );
    if (!modalReady) throw new Error('Add existing passenger modal did not open');
    return modalReady;
  },

  async addMatchedFromExisting(modal, matched, overlay, expectedMinCount) {
    const sel = IRCTCExt.SELECTORS.passengers;

    overlay.setStatus(`Adding ${matched.length} passenger(s) from existing list...`);
    for (const { passenger, row } of matched) {
      overlay.setStatus(`Selecting ${passenger.name} from existing list...`);
      IRCTCExt.Passengers.toggleRowCheckbox(row);
      await IRCTCExt.Wait.delay(200);
    }

    const addBtn = IRCTCExt.Wait.queryOne(sel.existingPassengerAddBtn, modal);
    if (!addBtn) throw new Error('Add button not found in existing passenger modal');

    IRCTCExt.Events.click(addBtn);
    return IRCTCExt.Passengers.waitForPassengerCount(expectedMinCount);
  },

  async openNewPassengerModal(overlay) {
    const sel = IRCTCExt.SELECTORS.passengers;

    if (IRCTCExt.Passengers.isNewPassengerModalOpen()) {
      return IRCTCExt.Wait.queryOne(sel.newPassengerModal);
    }

    const newBtn = await IRCTCExt.Wait.waitFor(sel.newPassengerBtn, { timeout: 15000, visible: true });
    if (!newBtn) throw new Error('New Passenger button not found');

    IRCTCExt.Events.click(newBtn);

    const modalReady = await IRCTCExt.Wait.poll(
      () => (IRCTCExt.Passengers.isNewPassengerModalOpen() ? IRCTCExt.Wait.queryOne(sel.newPassengerModal) : null),
      { timeout: 12000, interval: 200 }
    );
    if (!modalReady) throw new Error('Add Passenger modal did not open');
    return modalReady;
  },

  normalizeDropdownText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
  },

  getDropdownShownValue(dropdownEl) {
    const hidden = dropdownEl?.querySelector('.ui-helper-hidden-accessible input[role="listbox"]');
    const ariaValue = (hidden?.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
    if (ariaValue && !/^(select|choose)$/i.test(ariaValue)) return ariaValue;

    const label = dropdownEl?.querySelector('.ui-dropdown-label');
    const text = (label?.textContent || '').replace(/\s+/g, ' ').trim();
    if (!text || /^(select|choose)$/i.test(text)) return '';
    return text;
  },

  dropdownValueMatches(shown, expected) {
    const a = IRCTCExt.Passengers.normalizeDropdownText(shown);
    const b = IRCTCExt.Passengers.normalizeDropdownText(expected);
    if (!a || !b) return false;
    return a === b || a.includes(b) || b.includes(a);
  },

  isDropdownOpen(dropdown) {
    return !!dropdown?.querySelector('.ui-dropdown-open');
  },

  getDropdownHostClass(dropdown) {
    if (!dropdown) return '';
    const fromHost = [...dropdown.classList].find((cls) => /^ng-tns-c\d+-\d+$/.test(cls));
    if (fromHost) return fromHost;

    const inner = dropdown.querySelector('[class*="ng-tns-c"]');
    if (!inner) return '';
    return [...inner.classList].find((cls) => /^ng-tns-c\d+-\d+$/.test(cls)) || '';
  },

  getDropdownPanel(dropdown) {
    const inner = dropdown?.querySelector('.ap-dropdown-panel, .ui-dropdown-panel');
    if (inner && IRCTCExt.Wait.isVisible(inner)) return inner;

    if (!IRCTCExt.Passengers.isDropdownOpen(dropdown)) return null;

    const hostClass = IRCTCExt.Passengers.getDropdownHostClass(dropdown);
    if (hostClass) {
      const linkedPanels = [...IRCTCExt.Wait.queryAll('.ap-dropdown-panel'), ...IRCTCExt.Wait.queryAll('.ui-dropdown-panel')].filter(
        (panel) => panel.classList.contains(hostClass) && IRCTCExt.Wait.isVisible(panel)
      );
      if (linkedPanels.length === 1) return linkedPanels[0];
      if (linkedPanels.length > 1) {
        const dropdownRect = dropdown.getBoundingClientRect();
        const nearest = linkedPanels.reduce((best, panel) => {
          const rect = panel.getBoundingClientRect();
          const dist =
            Math.abs(rect.left - dropdownRect.left) + Math.max(0, rect.top - dropdownRect.bottom);
          return !best || dist < best.dist ? { panel, dist } : best;
        }, null);
        if (nearest) return nearest.panel;
      }
    }

    const panels = [...IRCTCExt.Wait.queryAll('.ap-dropdown-panel'), ...IRCTCExt.Wait.queryAll('.ui-dropdown-panel')].filter(
      (panel) => IRCTCExt.Wait.isVisible(panel)
    );
    if (!panels.length) return null;
    if (panels.length === 1) return panels[0];

    const dropdownRect = dropdown.getBoundingClientRect();
    return (
      panels.find((panel) => {
        const rect = panel.getBoundingClientRect();
        return Math.abs(rect.left - dropdownRect.left) < 24 && rect.top >= dropdownRect.top - 8;
      }) || panels[0]
    );
  },

  dropdownOptionsInPanel(panel) {
    return Array.from(
      panel.querySelectorAll('li[role="option"], li.ui-dropdown-item, .ui-dropdown-item')
    ).filter((item) => IRCTCExt.Wait.isVisible(item));
  },

  visiblePassengerDropdownOptions(panel = null) {
    if (panel) return IRCTCExt.Passengers.dropdownOptionsInPanel(panel);

    const panels = [
      ...IRCTCExt.Wait.queryAll('.ap-dropdown-panel'),
      ...IRCTCExt.Wait.queryAll('.ui-dropdown-panel')
    ].filter((item) => IRCTCExt.Wait.isVisible(item));

    const items = panels.flatMap((item) => IRCTCExt.Passengers.dropdownOptionsInPanel(item));

    if (items.length) return items;
    return IRCTCExt.Wait.queryAll(IRCTCExt.SELECTORS.passengers.passengerDropdownItem).filter((item) =>
      IRCTCExt.Wait.isVisible(item)
    );
  },

  findDropdownOption(options, labelText) {
    const target = IRCTCExt.Passengers.normalizeDropdownText(labelText);
    const token = IRCTCExt.Passengers.berthToken(labelText);
    return (
      options.find(
        (opt) => IRCTCExt.Passengers.normalizeDropdownText(opt.getAttribute('aria-label')) === target
      ) ||
      options.find(
        (opt) => IRCTCExt.Passengers.normalizeDropdownText(opt.textContent) === target
      ) ||
      options.find((opt) => {
        const text = IRCTCExt.Passengers.normalizeDropdownText(opt.textContent);
        return text === target || text.startsWith(`${target} `) || text.endsWith(` ${target}`);
      }) ||
      options.find((opt) =>
        IRCTCExt.Passengers.segmentMatches(opt.textContent, token)
      ) ||
      options.find((opt) => IRCTCExt.Events.optionMatches(opt, labelText))
    );
  },

  findDropdownOptionInPanel(panel, labelText) {
    if (!panel) return null;
    return IRCTCExt.Passengers.findDropdownOption(
      IRCTCExt.Passengers.dropdownOptionsInPanel(panel),
      labelText
    );
  },

  clickDropdownOption(option) {
    IRCTCExt.Events.clickPrimeDropdownItem(option);
  },

  getDropdownOpenTrigger(dropdown) {
    return (
      dropdown?.querySelector('.ui-dropdown-trigger-icon.pi-chevron-down') ||
      dropdown?.querySelector('.ui-dropdown-trigger-icon') ||
      dropdown?.querySelector('.ui-dropdown-trigger') ||
      dropdown
    );
  },

  async waitForDropdownValue(dropdown, labelText, timeout = 2000) {
    const matched = await IRCTCExt.Wait.poll(
      () => {
        const shown = IRCTCExt.Passengers.getDropdownShownValue(dropdown);
        return IRCTCExt.Passengers.dropdownValueMatches(shown, labelText) ? shown : null;
      },
      { timeout, interval: 100 }
    );
    return !!matched;
  },

  async ensureDropdownOpen(dropdown) {
    if (IRCTCExt.Passengers.isDropdownOpen(dropdown)) return true;

    const clickTarget = IRCTCExt.Passengers.getDropdownOpenTrigger(dropdown);
    IRCTCExt.Events.clickWithMouse(clickTarget);
    await IRCTCExt.Wait.delay(400);
    return IRCTCExt.Passengers.isDropdownOpen(dropdown);
  },

  async selectDropdownOptionFromPanel(dropdown, panel, labelText) {
    const match = IRCTCExt.Passengers.findDropdownOptionInPanel(panel, labelText);
    if (!match) return false;

    const hiddenInput = dropdown.querySelector('.ui-helper-hidden-accessible input, input[role="listbox"]');
    hiddenInput?.focus();

    IRCTCExt.Passengers.clickDropdownOption(match);
    if (await IRCTCExt.Passengers.waitForDropdownValue(dropdown, labelText)) return true;

    IRCTCExt.Passengers.clickDropdownOption(match);
    if (await IRCTCExt.Passengers.waitForDropdownValue(dropdown, labelText)) return true;

    return await IRCTCExt.Passengers.selectDropdownViaKeyboard(dropdown, labelText);
  },

  async selectDropdownViaKeyboard(dropdown, labelText) {
    const input = dropdown.querySelector('.ui-helper-hidden-accessible input, input[role="listbox"]');
    if (!input) return false;

    if (!(await IRCTCExt.Passengers.ensureDropdownOpen(dropdown))) return false;

    const panel = IRCTCExt.Passengers.getDropdownPanel(dropdown);
    const options = panel ? IRCTCExt.Passengers.dropdownOptionsInPanel(panel) : [];
    const target = IRCTCExt.Passengers.normalizeDropdownText(labelText);
    const targetIndex = options.findIndex((opt) => {
      const aria = IRCTCExt.Passengers.normalizeDropdownText(opt.getAttribute('aria-label'));
      const text = IRCTCExt.Passengers.normalizeDropdownText(opt.textContent);
      return aria === target || text === target;
    });
    if (targetIndex < 0) return false;

    input.focus();
    IRCTCExt.Events.pressKey(input, 'Home');
    await IRCTCExt.Wait.delay(80);

    for (let i = 0; i <= targetIndex; i += 1) {
      if (i > 0) {
        IRCTCExt.Events.pressKey(input, 'ArrowDown');
        await IRCTCExt.Wait.delay(80);
      }
    }

    IRCTCExt.Events.pressKey(input, 'Enter');
    return await IRCTCExt.Passengers.waitForDropdownValue(dropdown, labelText);
  },

  async selectBerthPreference(root, passenger) {
    const labels = IRCTCExt.Passengers.berthLabelsToTry(passenger?.berth);
    if (!labels.length) return true;

    const sel = IRCTCExt.SELECTORS.passengers;
    const berthTrigger = IRCTCExt.Wait.queryOne(sel.newPassengerBerth, root);
    if (!berthTrigger || !IRCTCExt.Wait.isVisible(berthTrigger)) return false;

    const dropdown = berthTrigger.closest('p-dropdown') || berthTrigger;
    const current = IRCTCExt.Passengers.getDropdownShownValue(dropdown);
    if (labels.some((label) => IRCTCExt.Passengers.dropdownValueMatches(current, label))) {
      return true;
    }

    for (const label of labels) {
      const selected = await IRCTCExt.Passengers.selectDropdownIn(root, sel.newPassengerBerth, label);
      if (selected) return true;
    }

    return false;
  },

  async selectDropdownIn(root, triggerSelectors, labelText) {
    const trigger = IRCTCExt.Wait.queryOne(triggerSelectors, root);
    if (!trigger || !IRCTCExt.Wait.isVisible(trigger)) return false;

    const dropdown = trigger.closest('p-dropdown') || trigger;
    const shown = IRCTCExt.Passengers.getDropdownShownValue(dropdown);
    if (IRCTCExt.Passengers.dropdownValueMatches(shown, labelText)) return true;

    const trySelect = async () => {
      if (!(await IRCTCExt.Passengers.ensureDropdownOpen(dropdown))) return false;

      const panel = await IRCTCExt.Wait.poll(
        () => IRCTCExt.Passengers.getDropdownPanel(dropdown),
        { timeout: 8000, interval: 150 }
      );
      if (!panel) return false;

      return IRCTCExt.Passengers.selectDropdownOptionFromPanel(dropdown, panel, labelText);
    };

    if (await trySelect()) return true;
    if (await IRCTCExt.Passengers.selectDropdownViaKeyboard(dropdown, labelText)) return true;

    const clickTarget = IRCTCExt.Passengers.getDropdownOpenTrigger(dropdown) || trigger;
    if (IRCTCExt.Passengers.isDropdownOpen(dropdown)) {
      IRCTCExt.Events.clickWithMouse(clickTarget);
      await IRCTCExt.Wait.delay(250);
    }

    if (await trySelect()) return true;
    if (await IRCTCExt.Passengers.selectDropdownViaKeyboard(dropdown, labelText)) return true;

    return IRCTCExt.Passengers.dropdownValueMatches(
      IRCTCExt.Passengers.getDropdownShownValue(dropdown),
      labelText
    );
  },

  visiblePassengerAutocompleteOptions() {
    const sel = IRCTCExt.SELECTORS.passengers;
    const panels = IRCTCExt.Wait.queryAll(sel.newPassengerAutocompletePanel).filter((item) =>
      IRCTCExt.Wait.isVisible(item)
    );
    if (panels.length) return panels;

    return IRCTCExt.Wait.queryAll(IRCTCExt.SELECTORS.autocompletePanel).filter((item) =>
      IRCTCExt.Wait.isVisible(item)
    );
  },

  nameInputMatches(nameInput, passengerName) {
    const actual = IRCTCExt.Passengers.normalizeName(nameInput?.value || '');
    const expected = IRCTCExt.Passengers.normalizeName(passengerName);
    return actual === expected;
  },

  async pickPassengerNameAutocomplete(nameInput, passengerName) {
    const options = IRCTCExt.Passengers.visiblePassengerAutocompleteOptions();
    if (!options.length) return false;

    const match =
      options.find((opt) =>
        IRCTCExt.Passengers.normalizeName(opt.textContent) ===
        IRCTCExt.Passengers.normalizeName(passengerName)
      ) || options.find((opt) => IRCTCExt.Events.optionMatches(opt, passengerName));

    if (!match) return false;

    IRCTCExt.Events.click(match.querySelector('span') || match);
    await IRCTCExt.Wait.delay(200);
    return IRCTCExt.Passengers.nameInputMatches(nameInput, passengerName);
  },

  async fillPassengerNameAutocomplete(nameInput, passengerName) {
    const name = String(passengerName || '').trim();
    if (!name) return false;

    nameInput.focus();
    IRCTCExt.Events.setInputValue(nameInput, name, { blur: false });
    await IRCTCExt.Wait.delay(200);

    if (IRCTCExt.Passengers.nameInputMatches(nameInput, name)) return true;

    const pickedAfterSet = await IRCTCExt.Wait.poll(
      async () => {
        if (await IRCTCExt.Passengers.pickPassengerNameAutocomplete(nameInput, name)) return true;
        return null;
      },
      { timeout: 2000, interval: 150 }
    );
    if (pickedAfterSet) return true;

    const prefix = name.slice(0, Math.min(4, name.length));
    if (prefix) {
      IRCTCExt.Events.setInputValue(nameInput, '', { blur: false });
      await IRCTCExt.Events.typeSlowly(nameInput, prefix, 25);
      await IRCTCExt.Wait.delay(250);
      if (await IRCTCExt.Passengers.pickPassengerNameAutocomplete(nameInput, name)) return true;
    }

    IRCTCExt.Events.setInputValue(nameInput, name, { blur: false });
    await IRCTCExt.Wait.delay(200);
    if (IRCTCExt.Passengers.nameInputMatches(nameInput, name)) return true;

    return await IRCTCExt.Passengers.pickPassengerNameAutocomplete(nameInput, name);
  },

  readNewPassengerForm(modalRoot) {
    const sel = IRCTCExt.SELECTORS.passengers;
    const nameInput = IRCTCExt.Wait.queryOne(sel.newPassengerName, modalRoot);
    const ageInput = IRCTCExt.Wait.queryOne(sel.newPassengerAge, modalRoot);

    const genderTrigger = IRCTCExt.Wait.queryOne(sel.newPassengerGender, modalRoot);
    const berthTrigger = IRCTCExt.Wait.queryOne(sel.newPassengerBerth, modalRoot);
    const foodTrigger = IRCTCExt.Wait.queryOne(sel.newPassengerFood, modalRoot);

    const genderDropdown = genderTrigger?.closest('p-dropdown') || genderTrigger;
    const berthDropdown = berthTrigger?.closest('p-dropdown') || berthTrigger;
    const foodDropdown = foodTrigger?.closest('p-dropdown') || foodTrigger;

    return {
      name: (nameInput?.value || '').replace(/\s+/g, ' ').trim(),
      age: String(ageInput?.value || '').trim(),
      gender: genderDropdown ? IRCTCExt.Passengers.getDropdownShownValue(genderDropdown) : '',
      berth: berthDropdown ? IRCTCExt.Passengers.getDropdownShownValue(berthDropdown) : '',
      food: foodDropdown ? IRCTCExt.Passengers.getDropdownShownValue(foodDropdown) : ''
    };
  },

  verifyNewPassengerForm(passenger, modalRoot) {
    const form = IRCTCExt.Passengers.readNewPassengerForm(modalRoot);
    const mismatches = [];

    if (
      IRCTCExt.Passengers.normalizeName(form.name) !==
      IRCTCExt.Passengers.normalizeName(passenger.name)
    ) {
      mismatches.push(`name (expected "${passenger.name}", got "${form.name}")`);
    }

    if (passenger.age && String(form.age).trim() !== String(passenger.age).trim()) {
      mismatches.push(`age (expected "${passenger.age}", got "${form.age}")`);
    }

    const genderLabel = IRCTCExt.Passengers.genderLabel(passenger.gender);
    if (
      passenger.gender &&
      form.gender &&
      !IRCTCExt.Passengers.segmentMatches(form.gender, IRCTCExt.Passengers.genderToken(passenger.gender)) &&
      !IRCTCExt.Passengers.dropdownValueMatches(form.gender, genderLabel)
    ) {
      mismatches.push(`gender (expected "${genderLabel}", got "${form.gender}")`);
    }

    const berthLabel = IRCTCExt.Passengers.berthLabel(passenger.berth);
    if (berthLabel) {
      const berthMatches =
        IRCTCExt.Passengers.segmentMatches(form.berth, IRCTCExt.Passengers.berthToken(passenger.berth)) ||
        IRCTCExt.Passengers.berthLabelsToTry(passenger.berth).some((label) =>
          IRCTCExt.Passengers.dropdownValueMatches(form.berth, label)
        );
      if (!berthMatches) {
        mismatches.push(`berth (expected "${berthLabel}", got "${form.berth || 'Select'}")`);
      }
    }

    const foodLabel = IRCTCExt.Passengers.foodLabel(passenger.food);
    if (foodLabel && form.food) {
      if (
        !IRCTCExt.Passengers.segmentMatches(form.food, IRCTCExt.Passengers.foodToken(passenger.food)) &&
        !IRCTCExt.Passengers.dropdownValueMatches(form.food, foodLabel)
      ) {
        mismatches.push(`food (expected "${foodLabel}", got "${form.food}")`);
      }
    }

    return { ok: mismatches.length === 0, mismatches, form };
  },

  hasNewPassengerValidationErrors(modalRoot) {
    const sel = IRCTCExt.SELECTORS.passengers;
    const errors = IRCTCExt.Wait.queryAll(sel.newPassengerValidationError, modalRoot).filter((el) => {
      if (!IRCTCExt.Wait.isVisible(el)) return false;
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      return text.length > 0;
    });
    return errors.length > 0;
  },

  async waitForNewPassengerFormReady(modalRoot) {
    const sel = IRCTCExt.SELECTORS.passengers;
    const ready = await IRCTCExt.Wait.poll(
      () => {
        const addBtn = IRCTCExt.Wait.queryOne(sel.newPassengerAddBtn, modalRoot);
        if (!addBtn || !IRCTCExt.Wait.isVisible(addBtn) || addBtn.disabled) return null;
        if (IRCTCExt.Passengers.hasNewPassengerValidationErrors(modalRoot)) return null;
        return addBtn;
      },
      { timeout: 5000, interval: 150 }
    );
    return !!ready;
  },

  async refillNewPassengerFields(passenger, modalRoot, fields) {
    const sel = IRCTCExt.SELECTORS.passengers;

    if (fields.includes('name')) {
      const nameInput = IRCTCExt.Wait.queryOne(sel.newPassengerName, modalRoot);
      if (!nameInput) throw new Error('Passenger name field not found');
      const nameOk = await IRCTCExt.Passengers.fillPassengerNameAutocomplete(nameInput, passenger.name);
      if (!nameOk) throw new Error(`Could not set passenger name: ${passenger.name}`);
    }

    if (fields.includes('age')) {
      const ageInput = IRCTCExt.Wait.queryOne(sel.newPassengerAge, modalRoot);
      if (!ageInput) throw new Error('Passenger age field not found');
      IRCTCExt.Events.setInputValue(ageInput, String(passenger.age || '').trim());
    }

    if (fields.includes('gender')) {
      const genderLabel = IRCTCExt.Passengers.genderLabel(passenger.gender);
      const genderOk = await IRCTCExt.Passengers.selectDropdownIn(
        modalRoot,
        sel.newPassengerGender,
        genderLabel
      );
      if (!genderOk) throw new Error(`Could not select gender: ${genderLabel}`);
    }

    if (fields.includes('berth')) {
      const berthOk = await IRCTCExt.Passengers.selectBerthPreference(modalRoot, passenger);
      if (!berthOk) {
        throw new Error(`Could not select berth: ${IRCTCExt.Passengers.berthLabel(passenger.berth)}`);
      }
    }

    if (fields.includes('food')) {
      const foodLabel = IRCTCExt.Passengers.foodLabel(passenger.food);
      if (foodLabel) {
        const foodDropdown = IRCTCExt.Wait.queryOne(sel.newPassengerFood, modalRoot);
        if (foodDropdown && IRCTCExt.Wait.isVisible(foodDropdown)) {
          const foodOk = await IRCTCExt.Passengers.selectDropdownIn(modalRoot, sel.newPassengerFood, foodLabel);
          if (!foodOk) throw new Error(`Could not select food: ${foodLabel}`);
        }
      }
    }
  },

  mismatchFieldsFromVerification(mismatches) {
    const fields = new Set();
    for (const item of mismatches) {
      if (item.startsWith('name')) fields.add('name');
      else if (item.startsWith('age')) fields.add('age');
      else if (item.startsWith('gender')) fields.add('gender');
      else if (item.startsWith('berth')) fields.add('berth');
      else if (item.startsWith('food')) fields.add('food');
    }
    return [...fields];
  },

  async fillNewPassengerForm(passenger, modalRoot, overlay) {
    const sel = IRCTCExt.SELECTORS.passengers;

    await IRCTCExt.Passengers.refillNewPassengerFields(passenger, modalRoot, [
      'name',
      'age',
      'gender',
      'berth'
    ]);

    const nationalityDropdown = IRCTCExt.Wait.queryOne(sel.newPassengerNationality, modalRoot);
    if (nationalityDropdown && IRCTCExt.Wait.isVisible(nationalityDropdown)) {
      const dropdown = nationalityDropdown.closest('p-dropdown') || nationalityDropdown;
      const current = IRCTCExt.Passengers.getDropdownShownValue(dropdown);
      if (!IRCTCExt.Passengers.dropdownValueMatches(current, 'India')) {
        await IRCTCExt.Passengers.selectDropdownIn(modalRoot, sel.newPassengerNationality, 'India');
      }
    }

    const foodLabel = IRCTCExt.Passengers.foodLabel(passenger.food);
    if (foodLabel) {
      const foodDropdown = IRCTCExt.Wait.queryOne(sel.newPassengerFood, modalRoot);
      if (foodDropdown && IRCTCExt.Wait.isVisible(foodDropdown)) {
        await IRCTCExt.Passengers.selectDropdownIn(modalRoot, sel.newPassengerFood, foodLabel);
      }
    }

    let verification = IRCTCExt.Passengers.verifyNewPassengerForm(passenger, modalRoot);
    if (!verification.ok) {
      overlay?.setStatus(`Re-checking passenger details for ${passenger.name}...`);
      const retryFields = IRCTCExt.Passengers.mismatchFieldsFromVerification(verification.mismatches);
      if (retryFields.length) {
        await IRCTCExt.Passengers.refillNewPassengerFields(passenger, modalRoot, retryFields);
      }
      verification = IRCTCExt.Passengers.verifyNewPassengerForm(passenger, modalRoot);
    }

    if (!verification.ok) {
      throw new Error(`Passenger form mismatch: ${verification.mismatches.join('; ')}`);
    }

    return true;
  },

  async submitNewPassenger(passenger, modalRoot, expectedMinCount) {
    const sel = IRCTCExt.SELECTORS.passengers;

    const verification = IRCTCExt.Passengers.verifyNewPassengerForm(passenger, modalRoot);
    if (!verification.ok) {
      throw new Error(`Cannot add passenger — form mismatch: ${verification.mismatches.join('; ')}`);
    }

    const formReady = await IRCTCExt.Passengers.waitForNewPassengerFormReady(modalRoot);
    if (!formReady) {
      throw new Error('Add Passenger form still has validation errors');
    }

    const addBtn = IRCTCExt.Wait.queryOne(sel.newPassengerAddBtn, modalRoot);
    if (!addBtn) throw new Error('Add button not found in new passenger modal');

    IRCTCExt.Events.click(addBtn);

    await IRCTCExt.Wait.poll(
      () => (IRCTCExt.Passengers.isNewPassengerModalOpen() ? null : true),
      { timeout: 12000, interval: 200 }
    );

    return IRCTCExt.Passengers.waitForPassengerCount(expectedMinCount);
  },

  async addNewPassenger(passenger, overlay, expectedMinCount) {
    overlay.setStatus(`Adding new passenger: ${passenger.name}...`);
    const modal = await IRCTCExt.Passengers.openNewPassengerModal(overlay);
    await IRCTCExt.Passengers.fillNewPassengerForm(passenger, modal, overlay);
    return IRCTCExt.Passengers.submitNewPassenger(passenger, modal, expectedMinCount);
  },

  async addOneFromExistingModal(passenger, overlay, expectedMinCount) {
    const sel = IRCTCExt.SELECTORS.passengers;
    const modal = await IRCTCExt.Passengers.openExistingPassengerModal(overlay);
    const rows = IRCTCExt.Wait.queryAll(sel.existingPassengerRow, modal);
    const row = IRCTCExt.Passengers.findExistingRowStrict(rows, passenger);

    if (!row) {
      if (IRCTCExt.Passengers.isExistingModalOpen()) {
        await IRCTCExt.Passengers.closeModalCancel(
          sel.existingPassengerCancelBtn,
          IRCTCExt.Passengers.isExistingModalOpen
        );
      }
      return false;
    }

    overlay.setStatus(`Adding ${passenger.name} from existing list...`);
    IRCTCExt.Passengers.toggleRowCheckbox(row);
    await IRCTCExt.Wait.delay(200);

    const addBtn = IRCTCExt.Wait.queryOne(sel.existingPassengerAddBtn, modal);
    if (!addBtn) throw new Error('Existing passenger Add button not found');
    IRCTCExt.Events.click(addBtn);

    await IRCTCExt.Passengers.waitForPassengerCount(expectedMinCount);

    if (IRCTCExt.Passengers.isExistingModalOpen()) {
      await IRCTCExt.Passengers.closeModalCancel(
        sel.existingPassengerCancelBtn,
        IRCTCExt.Passengers.isExistingModalOpen
      );
    }

    return true;
  },

  async addOnePassenger(passenger, overlay, expectedMinCount) {
    if (IRCTCExt.Passengers.passengerAlreadyOnList(passenger)) {
      return 'skipped';
    }

    const fromExisting = await IRCTCExt.Passengers.addOneFromExistingModal(
      passenger,
      overlay,
      expectedMinCount
    );
    if (fromExisting) return 'existing';

    await IRCTCExt.Passengers.addNewPassenger(passenger, overlay, expectedMinCount);
    return 'new';
  },

  async addPassengers(config, overlay) {
    overlay.setStep('Passengers');
    await IRCTCExt.Storage.updateState({ currentStep: 'passengers' });

    const passengers = (config.passengers || []).filter((p) => p.name && String(p.name).trim());
    if (!passengers.length) throw new Error('No passengers configured with names');

    for (let i = 0; i < passengers.length; i += 1) {
      const passenger = passengers[i];
      overlay.setStatus(`Adding passenger ${i + 1}/${passengers.length}: ${passenger.name}...`);
      const expectedCount = IRCTCExt.Passengers.countPassengerListCards() + 1;
      await IRCTCExt.Passengers.addOnePassenger(passenger, overlay, expectedCount);
    }

    await IRCTCExt.Passengers.verifyAndReconcilePassengerList(config, overlay);
    overlay.setStatus(`Verified ${passengers.length} passenger(s)`);
    return true;
  },

  async selectExistingPassengers(config, overlay) {
    return IRCTCExt.Passengers.addPassengers(config, overlay);
  }
};

;
(function (root) {
  root.IRCTCExt = root.IRCTCExt || {};
  if (IRCTCExt.NgetPassengersFlow) return;

  function passengersLib() {
    const lib = IRCTCExt.Passengers;
    if (!lib) throw new Error('Passenger helpers not loaded. Reload the extension.');
    return lib;
  }

  IRCTCExt.NgetPassengersFlow = {
    getSelectors() {
      return IRCTCExt.SELECTORS?.passengers || IRCTCExt.NgetSelectors.passengers;
    },

    getPassengerRows() {
      const sel = IRCTCExt.NgetPassengersFlow.getSelectors();
      return IRCTCExt.Wait.queryAll(sel.passengerRow).filter((row) => IRCTCExt.Wait.isVisible(row));
    },

    getRowBlock(row) {
      if (!row) return null;
      let block = row.parentElement;
      while (block && block !== document.body) {
        const deleteBtn = IRCTCExt.Wait.queryOne(
          IRCTCExt.NgetPassengersFlow.getSelectors().deletePassengerBtn,
          block
        );
        if (deleteBtn && block.contains(row)) return block;
        if (block.matches?.('p-panel, .ui-panel-content')) break;
        block = block.parentElement;
      }
      return row.parentElement || row;
    },

    getNameInput(row) {
      const sel = IRCTCExt.NgetPassengersFlow.getSelectors();
      return IRCTCExt.Wait.queryOne(sel.passengerName, row);
    },

    isPlaceholderGender(value) {
      const text = String(value || '').replace(/\s+/g, ' ').trim();
      return !text || /^(gender|select|choose)$/i.test(text);
    },

    readGenderValueFromElement(el) {
      if (!el) return '';

      if (el.tagName === 'SELECT') {
        const selected = el.options[el.selectedIndex];
        const text = (selected?.textContent || '').replace(/\s+/g, ' ').trim();
        if (!IRCTCExt.NgetPassengersFlow.isPlaceholderGender(text)) return text;
        if (el.value) return passengersLib().genderLabel(el.value);
        return '';
      }

      if (el.tagName === 'INPUT') {
        return (el.value || el.textContent || '').replace(/\s+/g, ' ').trim();
      }

      const dropdown = el.closest('p-dropdown') || el;
      return passengersLib().getDropdownShownValue(dropdown) || '';
    },

    getGenderElements(row) {
      if (!row) return [];
      const seen = new Set();
      const elements = [
        ...row.querySelectorAll('input[formcontrolname="passengerGender"]'),
        ...row.querySelectorAll('select[formcontrolname="passengerGender"]'),
        ...row.querySelectorAll('p-dropdown[formcontrolname="passengerGender"]')
      ];

      return elements.filter((el) => {
        if (!el || seen.has(el)) return false;
        seen.add(el);
        return el.tagName === 'INPUT' || IRCTCExt.Wait.isVisible(el);
      });
    },

    readGenderFromRow(row) {
      const elements = IRCTCExt.NgetPassengersFlow.getGenderElements(row);
      for (const el of elements) {
        const value = IRCTCExt.NgetPassengersFlow.readGenderValueFromElement(el);
        if (!IRCTCExt.NgetPassengersFlow.isPlaceholderGender(value)) return value;
      }
      return '';
    },

    findEditableGenderElement(row) {
      const select = row.querySelector('select[formcontrolname="passengerGender"]');
      if (select && IRCTCExt.Wait.isVisible(select)) return select;

      const input = row.querySelector('input[formcontrolname="passengerGender"]');
      if (input && !input.readOnly && IRCTCExt.Wait.isVisible(input)) return input;

      const dropdown = row.querySelector('p-dropdown[formcontrolname="passengerGender"]');
      if (dropdown && IRCTCExt.Wait.isVisible(dropdown)) return dropdown;

      return null;
    },

    genderMatchesPassenger(genderValue, passenger) {
      if (!passenger?.gender || IRCTCExt.NgetPassengersFlow.isPlaceholderGender(genderValue)) {
        return false;
      }
      return passengersLib().segmentMatches(genderValue, passengersLib().genderToken(passenger.gender));
    },

    parsePassengerRow(row) {
      const sel = IRCTCExt.NgetPassengersFlow.getSelectors();
      const nameInput = IRCTCExt.Wait.queryOne(sel.passengerName, row);
      const ageInput = IRCTCExt.Wait.queryOne(sel.passengerAge, row);
      const berthSelect = IRCTCExt.Wait.queryOne(sel.passengerBerth, row);
      const gender = IRCTCExt.NgetPassengersFlow.readGenderFromRow(row);

      let berth = '';
      if (berthSelect?.tagName === 'SELECT') {
        const selected = berthSelect.options[berthSelect.selectedIndex];
        berth = (selected?.textContent || berthSelect.value || '').replace(/\s+/g, ' ').trim();
      }

      return {
        name: (nameInput?.value || '').replace(/\s+/g, ' ').trim(),
        age: String(ageInput?.value || '').trim(),
        gender,
        berth
      };
    },

    isRowEmpty(row) {
      const parsed = IRCTCExt.NgetPassengersFlow.parsePassengerRow(row);
      if (!parsed.name) return true;

      const sel = IRCTCExt.NgetPassengersFlow.getSelectors();
      const errors = IRCTCExt.Wait.queryAll(sel.validationError, row).filter((el) => {
        if (!IRCTCExt.Wait.isVisible(el)) return false;
        const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
        return /valid name|name is required/i.test(text);
      });
      return errors.length > 0;
    },

    rowMatchesPassenger(row, passenger) {
      const details = IRCTCExt.NgetPassengersFlow.parsePassengerRow(row);
      if (passengersLib().normalizeName(details.name) !== passengersLib().normalizeName(passenger.name)) return false;
      if (passenger.age && String(details.age).trim() !== String(passenger.age).trim()) return false;
      if (
        passenger.gender &&
        details.gender &&
        !passengersLib().segmentMatches(details.gender, passengersLib().genderToken(passenger.gender))
      ) {
        return false;
      }
      return true;
    },

    findAddPassengerLink() {
      const spans = IRCTCExt.Wait.queryAll(IRCTCExt.NgetPassengersFlow.getSelectors().addPassengerLink);
      for (const span of spans) {
        const text = (span.textContent || '').replace(/\s+/g, ' ').trim();
        if (/^\+?\s*add passenger/i.test(text)) {
          const link = span.closest('a') || span;
          if (IRCTCExt.Wait.isVisible(link)) return link;
        }
      }
      return null;
    },

    async clickAddPassenger() {
      const before = IRCTCExt.NgetPassengersFlow.getPassengerRows().length;
      const link = IRCTCExt.NgetPassengersFlow.findAddPassengerLink();
      if (!link) throw new Error('"+ Add Passenger" link not found');

      IRCTCExt.Events.click(link);

      const increased = await IRCTCExt.Wait.poll(
        () => {
          const count = IRCTCExt.NgetPassengersFlow.getPassengerRows().length;
          return count > before ? count : null;
        },
        { timeout: 10000, interval: 200 }
      );
      if (!increased) throw new Error('Passenger row was not added after clicking "+ Add Passenger"');
      return increased;
    },

    async ensurePassengerRows(count) {
      let rows = IRCTCExt.NgetPassengersFlow.getPassengerRows();
      while (rows.length < count) {
        await IRCTCExt.NgetPassengersFlow.clickAddPassenger();
        rows = IRCTCExt.NgetPassengersFlow.getPassengerRows();
      }
      return rows;
    },

    async deletePassengerRow(row, overlay) {
      const parsed = IRCTCExt.NgetPassengersFlow.parsePassengerRow(row);
      overlay?.setStatus(`Deleting passenger: ${parsed.name || 'empty row'}...`);

      const block = IRCTCExt.NgetPassengersFlow.getRowBlock(row);
      const deleteBtn = IRCTCExt.Wait.queryOne(
        IRCTCExt.NgetPassengersFlow.getSelectors().deletePassengerBtn,
        block
      );
      if (!deleteBtn || !IRCTCExt.Wait.isVisible(deleteBtn)) {
        throw new Error(`Delete button not found for ${parsed.name || 'passenger row'}`);
      }

      IRCTCExt.Events.click(deleteBtn);
      await IRCTCExt.Wait.delay(400);
      await passengersLib().confirmPassengerDeleteIfNeeded();

      const removed = await IRCTCExt.Wait.poll(
        () => (!document.contains(row) ? true : null),
        { timeout: 10000, interval: 200 }
      );
      if (!removed) throw new Error(`Passenger row was not removed: ${parsed.name || 'unknown'}`);
      return true;
    },

    visibleAutocompleteOptions() {
      const sel = IRCTCExt.NgetPassengersFlow.getSelectors();
      return IRCTCExt.Wait.queryAll(sel.autocompleteOptions).filter((item) =>
        IRCTCExt.Wait.isVisible(item)
      );
    },

    parseAutocompleteOption(li) {
      const name = (li.querySelector('strong')?.textContent || '').replace(/\s+/g, ' ').trim();
      const parts = (li.textContent || '')
        .replace(/\s+/g, ' ')
        .split('|')
        .map((part) => part.trim())
        .filter(Boolean);

      let age = '';
      let gender = '';
      if (parts.length >= 2) {
        const agePart = parts.find((part) => /\d+\s*yrs?/i.test(part)) || parts[1];
        age = agePart.replace(/\s*yrs?/i, '').trim();
      }
      if (parts.length >= 3) {
        gender = parts[parts.length - 1].replace(/fa-check-circle.*/i, '').trim();
      }

      if (!gender && parts.length >= 2) {
        const last = parts[parts.length - 1];
        if (!/\d/.test(last)) gender = last.replace(/fa-check-circle.*/i, '').trim();
      }

      return { name, age, gender };
    },

    shouldSkipAutocompleteOption(li, passenger, currentRow) {
      if (!li.querySelector('.fa-check-circle')) return false;
      const rows = IRCTCExt.NgetPassengersFlow.getPassengerRows();
      return rows.some(
        (row) =>
          row !== currentRow && IRCTCExt.NgetPassengersFlow.rowMatchesPassenger(row, passenger)
      );
    },

    optionMatchesPassenger(li, passenger) {
      const parsed = IRCTCExt.NgetPassengersFlow.parseAutocompleteOption(li);
      if (passengersLib().normalizeName(parsed.name) !== passengersLib().normalizeName(passenger.name)) return false;
      if (passenger.age && String(parsed.age).trim() !== String(passenger.age).trim()) return false;
      if (
        passenger.gender &&
        parsed.gender &&
        !passengersLib().segmentMatches(parsed.gender, passengersLib().genderToken(passenger.gender))
      ) {
        return false;
      }
      return true;
    },

    nameInputMatches(nameInput, passengerName) {
      return passengersLib().normalizeName(nameInput?.value || '') === passengersLib().normalizeName(passengerName);
    },

    async pickMasterListOption(nameInput, passenger) {
      const options = IRCTCExt.NgetPassengersFlow.visibleAutocompleteOptions();
      if (!options.length) return false;

      const currentRow = nameInput.closest('app-passenger');
      const match = options.find(
        (opt) =>
          !IRCTCExt.NgetPassengersFlow.shouldSkipAutocompleteOption(opt, passenger, currentRow) &&
          IRCTCExt.NgetPassengersFlow.optionMatchesPassenger(opt, passenger)
      );
      if (!match) return false;

      IRCTCExt.Events.click(match.querySelector('strong') || match);
      await IRCTCExt.Wait.delay(400);
      const row = nameInput.closest('app-passenger');
      return row
        ? IRCTCExt.NgetPassengersFlow.isRowIdentityComplete(row, passenger)
        : IRCTCExt.NgetPassengersFlow.nameInputMatches(nameInput, passenger.name);
    },

    isRowIdentityComplete(row, passenger) {
      if (!IRCTCExt.NgetPassengersFlow.rowMatchesPassenger(row, passenger)) return false;
      const parsed = IRCTCExt.NgetPassengersFlow.parsePassengerRow(row);
      if (passenger.age && !parsed.age) return false;
      if (passenger.gender && !parsed.gender) return false;
      return true;
    },

    async fillPassengerName(nameInput, passenger, row) {
      const name = String(passenger.name || '').trim();
      if (!name) return false;

      if (IRCTCExt.NgetPassengersFlow.isRowIdentityComplete(row, passenger)) {
        return true;
      }

      nameInput.focus();
      IRCTCExt.Events.setInputValue(nameInput, name, { blur: false });
      await IRCTCExt.Wait.delay(200);

      if (IRCTCExt.NgetPassengersFlow.isRowIdentityComplete(row, passenger)) {
        return true;
      }

      const pickedAfterSet = await IRCTCExt.Wait.poll(
        async () => {
          if (await IRCTCExt.NgetPassengersFlow.pickMasterListOption(nameInput, passenger)) return true;
          return null;
        },
        { timeout: 2000, interval: 150 }
      );
      if (pickedAfterSet) return true;

      const prefix = name.slice(0, Math.min(4, name.length));
      if (prefix) {
        IRCTCExt.Events.setInputValue(nameInput, '', { blur: false });
        await IRCTCExt.Events.typeSlowly(nameInput, prefix, 25);
        await IRCTCExt.Wait.delay(250);
        if (await IRCTCExt.NgetPassengersFlow.pickMasterListOption(nameInput, passenger)) return true;
      }

      IRCTCExt.Events.setInputValue(nameInput, name, { blur: false });
      await IRCTCExt.Wait.delay(200);
      if (await IRCTCExt.NgetPassengersFlow.pickMasterListOption(nameInput, passenger)) return true;

      return await IRCTCExt.NgetPassengersFlow.fillPassengerNameManual(nameInput, passenger, row);
    },

    async fillPassengerNameManual(nameInput, passenger, row) {
      const sel = IRCTCExt.NgetPassengersFlow.getSelectors();
      const name = String(passenger.name || '').trim();

      IRCTCExt.Events.setInputValue(nameInput, name, { blur: false });

      const ageInput = IRCTCExt.Wait.queryOne(sel.passengerAge, row);
      if (ageInput && !ageInput.readOnly && passenger.age) {
        IRCTCExt.Events.setInputValue(ageInput, String(passenger.age).trim());
      }

      const genderOk = await IRCTCExt.NgetPassengersFlow.selectGenderOnRow(row, passenger);
      if (!genderOk && passenger.gender) {
        throw new Error(`Could not select gender: ${passengersLib().genderLabel(passenger.gender)}`);
      }

      await IRCTCExt.Wait.delay(200);
      return IRCTCExt.NgetPassengersFlow.isRowIdentityComplete(row, passenger);
    },

    genderSelectValue(gender) {
      const token = String(gender || '').trim();
      const map = {
        M: 'M',
        F: 'F',
        T: 'T',
        Male: 'M',
        Female: 'F',
        Transgender: 'T'
      };
      if (map[token]) return map[token];
      const label = passengersLib().genderLabel(token);
      return map[label] || token;
    },

    async selectNativeSelectOption(select, passenger) {
      const targetValue = IRCTCExt.NgetPassengersFlow.genderSelectValue(passenger.gender);
      const option = [...select.options].find(
        (opt) =>
          opt.value === targetValue ||
          passengersLib().segmentMatches(opt.textContent, passengersLib().genderToken(passenger.gender))
      );
      if (!option) return false;

      select.focus();
      IRCTCExt.Events.click(select);
      select.value = option.value;
      select.selectedIndex = option.index;
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
      select.dispatchEvent(new Event('blur', { bubbles: true }));
      await IRCTCExt.Wait.delay(150);

      if (select.value === option.value) return true;

      IRCTCExt.Events.click(select);
      await IRCTCExt.Wait.delay(100);
      select.value = option.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      await IRCTCExt.Wait.delay(150);
      return select.value === option.value;
    },

    async selectGenderOnRow(row, passenger) {
      if (!passenger?.gender) return true;

      const currentGender = IRCTCExt.NgetPassengersFlow.readGenderFromRow(row);
      if (IRCTCExt.NgetPassengersFlow.genderMatchesPassenger(currentGender, passenger)) {
        return true;
      }

      const genderEl = IRCTCExt.NgetPassengersFlow.findEditableGenderElement(row);
      if (!genderEl) {
        return IRCTCExt.NgetPassengersFlow.genderMatchesPassenger(
          IRCTCExt.NgetPassengersFlow.readGenderFromRow(row),
          passenger
        );
      }

      const genderLabel = passengersLib().genderLabel(passenger.gender);
      const sel = IRCTCExt.NgetPassengersFlow.getSelectors();

      if (genderEl.tagName === 'SELECT') {
        const selected = await IRCTCExt.NgetPassengersFlow.selectNativeSelectOption(
          genderEl,
          passenger
        );
        if (selected) return true;
        return IRCTCExt.NgetPassengersFlow.genderMatchesPassenger(
          IRCTCExt.NgetPassengersFlow.readGenderFromRow(row),
          passenger
        );
      }

      if (genderEl.tagName === 'INPUT' && !genderEl.readOnly) {
        IRCTCExt.Events.setInputValue(genderEl, genderLabel);
        return IRCTCExt.NgetPassengersFlow.genderMatchesPassenger(
          IRCTCExt.NgetPassengersFlow.readGenderFromRow(row),
          passenger
        );
      }

      if (genderEl.closest?.('p-dropdown') || genderEl.matches?.('p-dropdown')) {
        const selected = await passengersLib().selectDropdownIn(row, sel.passengerGender, genderLabel);
        return (
          selected ||
          IRCTCExt.NgetPassengersFlow.genderMatchesPassenger(
            IRCTCExt.NgetPassengersFlow.readGenderFromRow(row),
            passenger
          )
        );
      }

      return false;
    },

    berthSelectValue(berth) {
      const label = String(berth || '').trim();
      const map = {
        Upper: 'UB',
        Lower: 'LB',
        Middle: 'MB',
        'Side Lower': 'SL',
        'Side Upper': 'SU',
        'No Preference': '',
        '': ''
      };
      return map[label] ?? map[label.replace(/\s+/g, ' ')] ?? '';
    },

    async selectBerthOnRow(row, passenger) {
      const labels = passengersLib().berthLabelsToTry(passenger?.berth);
      if (!labels.length) return true;

      const sel = IRCTCExt.NgetPassengersFlow.getSelectors();
      const berthSelect = IRCTCExt.Wait.queryOne(sel.passengerBerth, row);
      if (!berthSelect || berthSelect.tagName !== 'SELECT') return false;

      const targetValue = IRCTCExt.NgetPassengersFlow.berthSelectValue(passenger.berth);
      const current = berthSelect.value;
      if (current === targetValue) return true;

      const option = [...berthSelect.options].find(
        (opt) =>
          opt.value === targetValue ||
          labels.some((label) => passengersLib().dropdownValueMatches(opt.textContent, label))
      );
      if (!option) return false;

      berthSelect.value = option.value;
      berthSelect.dispatchEvent(new Event('input', { bubbles: true }));
      berthSelect.dispatchEvent(new Event('change', { bubbles: true }));
      await IRCTCExt.Wait.delay(150);
      return berthSelect.value === option.value;
    },

    rowBerthMatches(row, passenger) {
      const labels = passengersLib().berthLabelsToTry(passenger?.berth);
      if (!labels.length) return true;

      const parsed = IRCTCExt.NgetPassengersFlow.parsePassengerRow(row);
      return labels.some((label) => passengersLib().dropdownValueMatches(parsed.berth, label));
    },

    async fillPassengerRow(row, passenger, overlay) {
      const sel = IRCTCExt.NgetPassengersFlow.getSelectors();
      const nameInput = IRCTCExt.Wait.queryOne(sel.passengerName, row);
      if (!nameInput) throw new Error('Passenger name field not found');

      overlay?.setStatus(`Filling passenger: ${passenger.name}...`);
      const nameOk = await IRCTCExt.NgetPassengersFlow.fillPassengerName(nameInput, passenger, row);
      if (!nameOk) throw new Error(`Could not set passenger name: ${passenger.name}`);

      const berthOk = await IRCTCExt.NgetPassengersFlow.selectBerthOnRow(row, passenger);
      if (!berthOk && passengersLib().berthLabelsToTry(passenger?.berth).length) {
        throw new Error(`Could not select berth: ${passengersLib().berthLabel(passenger.berth)}`);
      }

      if (!IRCTCExt.NgetPassengersFlow.rowMatchesPassenger(row, passenger)) {
        const parsed = IRCTCExt.NgetPassengersFlow.parsePassengerRow(row);
        throw new Error(
          `Passenger row mismatch for ${passenger.name} (got name="${parsed.name}", age="${parsed.age}", gender="${parsed.gender}")`
        );
      }

      return true;
    },

    findEmptyRow(usedRows = new Set()) {
      const rows = IRCTCExt.NgetPassengersFlow.getPassengerRows();
      return rows.find((row) => !usedRows.has(row) && IRCTCExt.NgetPassengersFlow.isRowEmpty(row)) || null;
    },

    findMatchingRow(passenger, usedRows = new Set()) {
      const rows = IRCTCExt.NgetPassengersFlow.getPassengerRows();
      return (
        rows.find(
          (row) =>
            !usedRows.has(row) &&
            !IRCTCExt.NgetPassengersFlow.isRowEmpty(row) &&
            IRCTCExt.NgetPassengersFlow.rowMatchesPassenger(row, passenger)
        ) || null
      );
    },

    partitionRows(passengers) {
      const rows = IRCTCExt.NgetPassengersFlow.getPassengerRows();
      const matched = [];
      const unmatchedPassengers = [];
      const usedRows = new Set();

      for (const passenger of passengers) {
        const row = IRCTCExt.NgetPassengersFlow.findMatchingRow(passenger, usedRows);
        if (row) {
          matched.push({ passenger, row });
          usedRows.add(row);
        } else {
          unmatchedPassengers.push(passenger);
        }
      }

      const extraRows = rows.filter((row) => !usedRows.has(row));
      return { matched, unmatchedPassengers, extraRows };
    },

    async getOrCreateEmptyRow(usedRows) {
      let empty = IRCTCExt.NgetPassengersFlow.findEmptyRow(usedRows);
      if (empty) return empty;

      await IRCTCExt.NgetPassengersFlow.clickAddPassenger();
      empty = IRCTCExt.NgetPassengersFlow.findEmptyRow(usedRows);
      if (!empty) throw new Error('Could not find empty passenger row after adding');
      return empty;
    },

    findRowByName(passenger, usedRows = new Set()) {
      const configName = passengersLib().normalizeName(passenger.name);
      const rows = IRCTCExt.NgetPassengersFlow.getPassengerRows();
      return (
        rows.find((row) => {
          if (usedRows.has(row) || IRCTCExt.NgetPassengersFlow.isRowEmpty(row)) return false;
          const parsed = IRCTCExt.NgetPassengersFlow.parsePassengerRow(row);
          return passengersLib().normalizeName(parsed.name) === configName;
        }) || null
      );
    },

    passengerRowIsCorrect(row, passenger) {
      return (
        IRCTCExt.NgetPassengersFlow.rowMatchesPassenger(row, passenger) &&
        IRCTCExt.NgetPassengersFlow.rowBerthMatches(row, passenger)
      );
    },

    getFailingPassengers(passengers) {
      return passengers.filter((passenger) => {
        const row = IRCTCExt.NgetPassengersFlow.findMatchingRow(passenger);
        return !row || !IRCTCExt.NgetPassengersFlow.passengerRowIsCorrect(row, passenger);
      });
    },

    async fixPassengerRow(passenger, overlay, usedRows = new Set()) {
      overlay.setStatus(`Fixing passenger: ${passenger.name}...`);

      const matchingRow = IRCTCExt.NgetPassengersFlow.findMatchingRow(passenger, usedRows);
      if (matchingRow && IRCTCExt.NgetPassengersFlow.passengerRowIsCorrect(matchingRow, passenger)) {
        usedRows.add(matchingRow);
        return matchingRow;
      }

      const nameRow = IRCTCExt.NgetPassengersFlow.findRowByName(passenger, usedRows);
      if (nameRow) {
        await IRCTCExt.NgetPassengersFlow.deletePassengerRow(nameRow, overlay);
      } else if (matchingRow) {
        await IRCTCExt.NgetPassengersFlow.deletePassengerRow(matchingRow, overlay);
      }

      const row = await IRCTCExt.NgetPassengersFlow.getOrCreateEmptyRow(usedRows);
      usedRows.add(row);
      await IRCTCExt.NgetPassengersFlow.fillPassengerRow(row, passenger, overlay);
      return row;
    },

    async reviewPassengers(config, overlay) {
      return IRCTCExt.NgetPassengersFlow.verifyAndReconcilePassengerList(config, overlay);
    },

    async verifyAndReconcilePassengerList(config, overlay) {
      const passengers = (config.passengers || []).filter((p) => p.name && String(p.name).trim());
      const maxPasses = 3;

      for (let pass = 1; pass <= maxPasses; pass += 1) {
        overlay.setStatus(`Verifying passenger list (${pass}/${maxPasses})...`);
        await IRCTCExt.Wait.delay(400);

        let changed = false;
        let { matched, unmatchedPassengers, extraRows } =
          IRCTCExt.NgetPassengersFlow.partitionRows(passengers);

        for (const row of extraRows) {
          const parsed = IRCTCExt.NgetPassengersFlow.parsePassengerRow(row);
          if (!parsed.name && IRCTCExt.NgetPassengersFlow.isRowEmpty(row)) {
            if (IRCTCExt.NgetPassengersFlow.getPassengerRows().length > passengers.length) {
              await IRCTCExt.NgetPassengersFlow.deletePassengerRow(row, overlay);
              changed = true;
            }
            continue;
          }
          overlay.setStatus(`Removing extra passenger: ${parsed.name || 'unknown'}...`);
          await IRCTCExt.NgetPassengersFlow.deletePassengerRow(row, overlay);
          changed = true;
        }

        if (changed) {
          ({ matched, unmatchedPassengers, extraRows } =
            IRCTCExt.NgetPassengersFlow.partitionRows(passengers));
        }

        for (const { passenger, row } of matched) {
          if (!IRCTCExt.NgetPassengersFlow.rowBerthMatches(row, passenger)) {
            overlay.setStatus(`Updating berth for ${passenger.name}...`);
            const berthOk = await IRCTCExt.NgetPassengersFlow.selectBerthOnRow(row, passenger);
            if (!berthOk) {
              throw new Error(`Could not update berth for ${passenger.name}`);
            }
            changed = true;
          }
        }

        const usedRows = new Set(matched.map((item) => item.row));
        for (const passenger of unmatchedPassengers) {
          overlay.setStatus(`Adding missing passenger: ${passenger.name}...`);
          const row = await IRCTCExt.NgetPassengersFlow.getOrCreateEmptyRow(usedRows);
          usedRows.add(row);
          await IRCTCExt.NgetPassengersFlow.fillPassengerRow(row, passenger, overlay);
          changed = true;
        }

        if (!changed) {
          const finalRows = IRCTCExt.NgetPassengersFlow.getPassengerRows().filter(
            (row) => !IRCTCExt.NgetPassengersFlow.isRowEmpty(row)
          );
          if (finalRows.length !== passengers.length) {
            throw new Error(`Expected ${passengers.length} passenger(s), found ${finalRows.length}`);
          }

          const failingPassengers = IRCTCExt.NgetPassengersFlow.getFailingPassengers(passengers);

          if (failingPassengers.length) {
            if (pass === maxPasses) {
              throw new Error(`Could not verify passenger: ${failingPassengers[0]?.name || 'unknown'}`);
            }
            const usedRows = new Set();
            for (const passenger of failingPassengers) {
              await IRCTCExt.NgetPassengersFlow.fixPassengerRow(passenger, overlay, usedRows);
            }
            changed = true;
          } else {
            overlay.setStatus(`Verified ${passengers.length} passenger(s)`);
            return true;
          }
        }
      }

      throw new Error('Passenger list verification failed after multiple attempts');
    },

    async addPassengers(config, overlay) {
      overlay.setStep('Passengers');
      await IRCTCExt.Storage.updateState({ currentStep: 'passengers' });

      const passengers = (config.passengers || []).filter((p) => p.name && String(p.name).trim());
      if (!passengers.length) throw new Error('No passengers configured with names');

      await IRCTCExt.NgetPassengersFlow.ensurePassengerRows(1);

      const usedRows = new Set();
      for (let i = 0; i < passengers.length; i += 1) {
        const passenger = passengers[i];
        overlay.setStatus(`Adding passenger ${i + 1}/${passengers.length}: ${passenger.name}...`);

        let row = IRCTCExt.NgetPassengersFlow.findMatchingRow(passenger, usedRows);
        if (!row) {
          row = await IRCTCExt.NgetPassengersFlow.getOrCreateEmptyRow(usedRows);
          await IRCTCExt.NgetPassengersFlow.fillPassengerRow(row, passenger, overlay);
        } else {
          if (!IRCTCExt.NgetPassengersFlow.rowBerthMatches(row, passenger)) {
            await IRCTCExt.NgetPassengersFlow.selectBerthOnRow(row, passenger);
          }
        }

        usedRows.add(row);
      }

      await IRCTCExt.NgetPassengersFlow.verifyAndReconcilePassengerList(config, overlay);
      overlay.setStatus(`Verified ${passengers.length} passenger(s)`);
      return true;
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);

;
(function (root) {
  root.IRCTCExt = root.IRCTCExt || {};
  if (IRCTCExt.NgetPsgnPreferencesFlow) return;

  const sharedPrefs = () => IRCTCExt.PsgnPreferences;

  IRCTCExt.NgetPsgnPreferencesFlow = {
    getSelectors() {
      return IRCTCExt.SELECTORS?.psgnPreferences || IRCTCExt.NgetSelectors.psgnPreferences;
    },

    findPaymentPanel() {
      const titles = IRCTCExt.Wait.queryAll(IRCTCExt.NgetPsgnPreferencesFlow.getSelectors().paymentPanelTitle);
      for (const title of titles) {
        if (!IRCTCExt.Wait.isVisible(title)) continue;
        const text = (title.textContent || '').replace(/\s+/g, ' ').trim();
        if (/payment\s*mode/i.test(text)) {
          return title.closest('p-panel') || title.closest('.ui-panel') || title.parentElement;
        }
      }
      return null;
    },

    findPaymentInput(method) {
      const sel = IRCTCExt.NgetPsgnPreferencesFlow.getSelectors();
      const value = method === 'upi' ? '2' : '3';
      const selectors = method === 'upi' ? sel.paymentTypeUpi : sel.paymentTypeCards;
      const panel = IRCTCExt.NgetPsgnPreferencesFlow.findPaymentPanel();
      const root = panel || document;

      const input = IRCTCExt.Wait.queryOne(selectors, root);
      if (input) return input;

      return IRCTCExt.Wait.queryOne(`input[name="paymentType"][value="${value}"]`, root);
    },

    findPaymentOption(method) {
      const input = IRCTCExt.NgetPsgnPreferencesFlow.findPaymentInput(method);
      if (!input) return null;

      return (
        input.closest('tr') ||
        input.closest('label') ||
        input.closest('p-radiobutton') ||
        sharedPrefs()?.findOptionRow?.(input) ||
        input.parentElement
      );
    },

    isPaymentOptionSelected(method) {
      const input = IRCTCExt.NgetPsgnPreferencesFlow.findPaymentInput(method);
      if (!input) return false;

      const optionRow = IRCTCExt.NgetPsgnPreferencesFlow.findPaymentOption(method);
      if (optionRow && sharedPrefs()?.isOptionSelected?.(optionRow)) return true;

      if (input.checked) return true;

      const box = input.closest('p-radiobutton')?.querySelector('.ui-radiobutton-box, [role="radio"]');
      return !!(
        box?.classList.contains('ui-state-active') || box?.getAttribute('aria-checked') === 'true'
      );
    },

    async selectPaymentMethod(config, overlay) {
      const method = config.preferences?.paymentMethod || 'cards';
      overlay.setStatus(
        method === 'upi' ? 'Selecting BHIM/UPI payment...' : 'Selecting Cards/Net Banking payment...'
      );

      const panel = await IRCTCExt.Wait.poll(
        () => IRCTCExt.NgetPsgnPreferencesFlow.findPaymentPanel(),
        { timeout: 15000, interval: 200 }
      );
      if (!panel) throw new Error('Payment Mode section not found');

      const optionRow = await IRCTCExt.Wait.poll(
        () => {
          const row = IRCTCExt.NgetPsgnPreferencesFlow.findPaymentOption(method);
          return row && IRCTCExt.Wait.isVisible(row) ? row : null;
        },
        { timeout: 10000, interval: 200 }
      );
      if (!optionRow) throw new Error(`Payment option not found: ${method}`);

      const selected = await sharedPrefs().selectRadioWithRetry(optionRow, method);
      if (!selected) throw new Error(`Could not select payment option: ${method}`);

      await IRCTCExt.Wait.delay(400);
      return true;
    },

    findContinueButton() {
      const sel = IRCTCExt.NgetPsgnPreferencesFlow.getSelectors();
      const candidates = IRCTCExt.Wait.queryAll(sel.continueBtn);
      for (const btn of candidates) {
        if (!IRCTCExt.Wait.isVisible(btn)) continue;
        const text = (btn.textContent || '').replace(/\s+/g, ' ').trim();
        if (/^\s*continue\s*$/i.test(text)) return btn;
      }

      const buttons = Array.from(document.querySelectorAll('button.train_Search.btnDefault'));
      return (
        buttons.find((btn) => {
          if (!IRCTCExt.Wait.isVisible(btn)) return false;
          const text = (btn.textContent || '').replace(/\s+/g, ' ').trim();
          return /^\s*continue\s*$/i.test(text);
        }) || null
      );
    },

    isContinueEnabled(btn) {
      if (!btn || !IRCTCExt.Wait.isVisible(btn)) return false;
      if (btn.disabled) return false;
      if (btn.classList.contains('disabled')) return false;
      if (btn.getAttribute('aria-disabled') === 'true') return false;
      return true;
    },

    hasLeftPsgninput() {
      const path = location.pathname;
      if (!path.includes('psgninput')) return true;
      if (IRCTCExt.NgetPaths.isReviewPath(path)) return true;
      if (IRCTCExt.NgetPaths.isPaymentPath(path)) return true;
      return false;
    },

    async clickContinue(overlay) {
      overlay.setStatus('Waiting for Continue button...');

      const btn = await IRCTCExt.Wait.poll(
        () => {
          const candidate = IRCTCExt.NgetPsgnPreferencesFlow.findContinueButton();
          return candidate && IRCTCExt.NgetPsgnPreferencesFlow.isContinueEnabled(candidate)
            ? candidate
            : null;
        },
        { timeout: 20000, interval: 250 }
      );
      if (!btn) throw new Error('Continue button not found or still disabled');

      overlay.setStatus('Clicking Continue...');
      sharedPrefs().clickTarget(btn);
      await IRCTCExt.Wait.delay(800);

      const navigated = await IRCTCExt.Wait.poll(
        () => (IRCTCExt.NgetPsgnPreferencesFlow.hasLeftPsgninput() ? true : null),
        { timeout: 30000, interval: 300 }
      );
      if (!navigated) throw new Error('Did not leave passenger page after clicking Continue');
      return true;
    },

    async configure(config, overlay) {
      overlay.setStep('Review');
      await IRCTCExt.Wait.delay(600);

      await IRCTCExt.NgetPassengersFlow.reviewPassengers(config, overlay);
      await IRCTCExt.Wait.delay(400);

      await IRCTCExt.NgetPsgnPreferencesFlow.selectPaymentMethod(config, overlay);
      await IRCTCExt.Wait.delay(400);

      await IRCTCExt.NgetPsgnPreferencesFlow.clickContinue(overlay);
      overlay.setStatus('Passenger review complete — continuing...');
      return true;
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);

;
window.IRCTCExt = window.IRCTCExt || {};

IRCTCExt.PsgnPreferences = {
  isOptionSelected(optionRow) {
    if (!optionRow) return false;
    const box = optionRow.querySelector('.ui-radiobutton-box, [role="radio"]');
    if (box?.classList.contains('ui-state-active')) return true;
    if (box?.getAttribute('aria-checked') === 'true') return true;
    if (optionRow.classList.contains('loyalty-option-active')) return true;
    if (optionRow.classList.contains('selected')) return true;
    const input = optionRow.querySelector('input[type="radio"]');
    return !!input?.checked;
  },

  findLoyaltySkipOption(section) {
    const options = section.querySelectorAll('.loyalty-option');
    for (const option of options) {
      const label = option.querySelector('.loyalty-label, label');
      if (label && /^\s*skip\s*$/i.test(label.textContent || '')) return option;
    }

    const skipInput = section.querySelector('input[name="loyalityOperationType"][value="3"]');
    if (skipInput) return skipInput.closest('.loyalty-option');

    const skipLabel = section.querySelector('label[for="lo-3"]');
    if (skipLabel) return skipLabel.closest('.loyalty-option');

    return null;
  },

  findPaymentOption(section, method) {
    const options = section.querySelectorAll('.payment-option');
    for (const option of options) {
      const label = option.querySelector('.payment-label');
      const text = (label?.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      if (method === 'upi') {
        if (/bhim\/?upi|pay through bhim/.test(text)) return option;
      } else if (/credit.*debit|net banking|wallets|rewards and others/.test(text)) {
        return option;
      }
    }

    const value = method === 'upi' ? '2' : '3';
    const input = section.querySelector(`input[name="payment"][value="${value}"]`);
    if (input) return input.closest('.payment-option');

    const id = method === 'upi' ? 'payment-option-1' : 'payment-option-0';
    const byId = section.querySelector(`#${id}`);
    if (byId) return byId.closest('.payment-option');

    return null;
  },

  findOptionRow(inputEl) {
    if (!inputEl) return null;
    return inputEl.closest('.loyalty-option, .payment-option');
  },

  clickTarget(el) {
    if (!el) return;
    el.scrollIntoView({ block: 'center', inline: 'nearest' });
    IRCTCExt.Events.click(el);
  },

  clickPrimeNgRadio(optionEl) {
    if (!optionEl) return;
    optionEl.scrollIntoView({ block: 'center', inline: 'nearest' });

    const label = optionEl.querySelector('.loyalty-label, .payment-label, label');
    const box = optionEl.querySelector('.ui-radiobutton-box, [role="radio"]');
    const icon = optionEl.querySelector('.ui-radiobutton-icon');
    const input = optionEl.querySelector('input[type="radio"]');

    if (label) this.clickTarget(label);
    if (box) this.clickTarget(box);
    if (icon) this.clickTarget(icon);

    if (input) {
      this.clickTarget(input);
      if (!input.checked) {
        input.checked = true;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    this.clickTarget(optionEl);
  },

  async selectRadioWithRetry(optionRow, label, maxAttempts = 6) {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      if (this.isOptionSelected(optionRow)) return true;
      this.clickPrimeNgRadio(optionRow);
      await IRCTCExt.Wait.delay(350);
    }
    return this.isOptionSelected(optionRow);
  },

  async selectLoyaltySkip(overlay) {
    const sel = IRCTCExt.SELECTORS.psgnPreferences;
    overlay.setStatus('Selecting loyalty option: Skip...');

    const section = await IRCTCExt.Wait.waitFor(sel.loyaltySection, { timeout: 15000, visible: true });
    if (!section) throw new Error('IRCTC Co-branded Card Benefits section not found');

    const optionRow = await IRCTCExt.Wait.poll(
      () => {
        const row = this.findLoyaltySkipOption(section);
        return row && IRCTCExt.Wait.isVisible(row) ? row : null;
      },
      { timeout: 10000, interval: 200 }
    );
    if (!optionRow) throw new Error('Loyalty Skip option not found');

    const selected = await this.selectRadioWithRetry(optionRow, 'Skip');
    if (!selected) throw new Error('Could not select loyalty Skip option');
  },

  async selectPaymentMethod(config, overlay) {
    const sel = IRCTCExt.SELECTORS.psgnPreferences;
    const method = config.preferences?.paymentMethod || 'cards';
    overlay.setStatus(method === 'upi' ? 'Selecting BHIM/UPI payment...' : 'Selecting Cards/Net Banking payment...');

    const section = await IRCTCExt.Wait.waitFor(sel.paymentSection, { timeout: 15000, visible: true });
    if (!section) throw new Error('Payment Options section not found');

    const optionRow = await IRCTCExt.Wait.poll(
      () => {
        const row = this.findPaymentOption(section, method);
        return row && IRCTCExt.Wait.isVisible(row) ? row : null;
      },
      { timeout: 10000, interval: 200 }
    );
    if (!optionRow) throw new Error(`Payment option not found: ${method}`);

    const selected = await this.selectRadioWithRetry(optionRow, method);
    if (!selected) throw new Error(`Could not select payment option: ${method}`);

    await IRCTCExt.Wait.delay(400);
  },

  findCalculateFareButton() {
    const sel = IRCTCExt.SELECTORS.psgnPreferences;
    const direct = IRCTCExt.Wait.queryOne(sel.calculateFareBtn);
    if (direct && IRCTCExt.Wait.isVisible(direct)) return direct;

    const buttons = Array.from(document.querySelectorAll('button'));
    return (
      buttons.find((btn) => /calculate fare/i.test(btn.textContent || '') && IRCTCExt.Wait.isVisible(btn)) ||
      null
    );
  },

  isCalculateFareEnabled(btn) {
    if (!btn) return false;
    if (btn.disabled) return false;
    if (btn.classList.contains('disabled')) return false;
    if (btn.getAttribute('aria-disabled') === 'true') return false;
    return IRCTCExt.Wait.isVisible(btn);
  },

  isCalculateFareProcessing(btn) {
    if (!btn || !IRCTCExt.Wait.isVisible(btn)) return false;
    const text = (btn.textContent || '').trim();
    if (/processing|calculating/i.test(text)) return true;
    if (btn.classList.contains('ui-button-loading')) return true;
    if (btn.querySelector('.pi-spin, .spinner, [class*="loading"]')) return true;
    const parent = btn.closest('.review-actions, .cta-row, button');
    if (parent?.querySelector?.('.pi-spin, .spinner, [class*="loading"]')) return true;
    if ((btn.disabled || btn.getAttribute('aria-disabled') === 'true') && /calculate fare/i.test(text)) {
      return true;
    }
    return false;
  },

  getPostCalculateFareDestination() {
    if (location.pathname.includes('bkgPaymentOptions')) return 'payment';
    if (location.pathname.includes('reviewBooking')) return 'review';
    return null;
  },

  async waitForPostCalculateFarePage(overlay, timeout = 60000) {
    const existing = this.getPostCalculateFareDestination();
    if (existing) return existing;

    overlay.setStatus('Waiting for review or payment page...');
    const destination = await IRCTCExt.Wait.poll(
      () => this.getPostCalculateFareDestination(),
      { timeout, interval: 500 }
    );
    if (!destination) {
      throw new Error('Did not reach review booking or payment page after Calculate Fare');
    }
    return destination;
  },

  readAvailabilityStatus() {
    const sel = IRCTCExt.SELECTORS.psgnPreferences;
    const el = IRCTCExt.Wait.queryOne(sel.availabilityStatus);
    if (!el || !IRCTCExt.Wait.isVisible(el)) return '';
    return (el.textContent || '').replace(/\s+/g, ' ').trim();
  },

  isSessionRestoreModal(host) {
    if (!host) return false;
    const sel = IRCTCExt.SELECTORS.psgnPreferences;
    const title = IRCTCExt.Wait.queryOne(sel.reviewConfirmTitle, host);
    if (!title) return false;
    return /session\s*restore/i.test(title.textContent || '');
  },

  findReviewConfirmModal() {
    const sel = IRCTCExt.SELECTORS.psgnPreferences;

    for (const host of IRCTCExt.Wait.queryAll(sel.reviewConfirmHost)) {
      if (!IRCTCExt.Wait.isVisible(host)) continue;
      if (this.isSessionRestoreModal(host)) continue;

      const card = IRCTCExt.Wait.queryOne(sel.reviewConfirmCard, host);
      if (card && IRCTCExt.Wait.isVisible(card)) return { host, card };
    }

    const dialogs = document.querySelectorAll('[role="dialog"], .ui-dialog, .p-dialog, .bc-overlay');
    for (const dialog of dialogs) {
      if (!IRCTCExt.Wait.isVisible(dialog)) continue;
      const buttons = Array.from(dialog.querySelectorAll('button'));
      const hasContinue = buttons.some(
        (btn) => /continue\s*(to\s*)?payment/i.test(btn.textContent || '') && IRCTCExt.Wait.isVisible(btn)
      );
      if (hasContinue) return { host: dialog, card: dialog };
    }

    return null;
  },

  findReviewConfirmContinueButton(root = document) {
    const sel = IRCTCExt.SELECTORS.psgnPreferences;
    const direct = IRCTCExt.Wait.queryOne(sel.reviewConfirmContinue, root);
    if (direct && IRCTCExt.Wait.isVisible(direct) && !direct.disabled) return direct;

    const buttons = Array.from(root.querySelectorAll('button'));
    return (
      buttons.find(
        (btn) =>
          /continue\s*(to\s*)?payment/i.test(btn.textContent || '') &&
          IRCTCExt.Wait.isVisible(btn) &&
          !btn.disabled
      ) || null
    );
  },

  async waitForReviewConfirmModal(overlay, timeout = 20000) {
    overlay.setStatus('Waiting for booking review confirmation...');
    const modal = await IRCTCExt.Wait.poll(() => this.findReviewConfirmModal(), {
      timeout,
      interval: 250
    });
    if (!modal) throw new Error('Booking review confirmation popup did not appear');
    return modal;
  },

  async clickReviewConfirmContinue(overlay, modalRoot) {
    const root = modalRoot?.card || modalRoot?.host || document;
    const btn = await IRCTCExt.Wait.poll(() => this.findReviewConfirmContinueButton(root), {
      timeout: 10000,
      interval: 250
    });
    if (!btn) throw new Error('Continue to payment button not found in confirmation popup');

    overlay.setStatus('Confirming booking review...');
    this.clickTarget(btn);
    await IRCTCExt.Wait.delay(500);
  },

  async waitForPaymentPage(overlay, timeout = 60000) {
    if (location.pathname.includes('bkgPaymentOptions')) return true;

    overlay.setStatus('Waiting for payment page...');
    const reached = await IRCTCExt.Wait.poll(
      () => (location.pathname.includes('bkgPaymentOptions') ? true : null),
      { timeout, interval: 500 }
    );
    if (!reached) throw new Error('Did not reach payment page after review confirmation');
    return true;
  },

  async clickCalculateFare(overlay) {
    const destination = this.getPostCalculateFareDestination();
    if (destination) return destination;

    const existing = this.findCalculateFareButton();
    if (existing && this.isCalculateFareProcessing(existing)) {
      overlay.setStatus('Calculate Fare is processing...');
      return this.waitForPostCalculateFarePage(overlay);
    }

    overlay.setStatus('Waiting for Calculate Fare button...');

    const btn = await IRCTCExt.Wait.poll(
      () => {
        const candidate = this.findCalculateFareButton();
        if (!candidate) return null;
        if (this.isCalculateFareProcessing(candidate)) return 'processing';
        if (this.isCalculateFareEnabled(candidate)) return candidate;
        return null;
      },
      { timeout: 20000, interval: 250 }
    );

    if (btn === 'processing') {
      overlay.setStatus('Calculate Fare is processing...');
      return this.waitForPostCalculateFarePage(overlay);
    }
    if (!btn) throw new Error('Calculate Fare button not found or still disabled');

    overlay.setStatus('Clicking Calculate Fare...');
    this.clickTarget(btn);
    return this.waitForPostCalculateFarePage(overlay);
  },

  findContinueToPaymentButton() {
    const sel = IRCTCExt.SELECTORS.psgnPreferences;
    const direct = IRCTCExt.Wait.queryOne(sel.continueToPaymentBtn);
    if (direct && IRCTCExt.Wait.isVisible(direct)) return direct;

    const buttons = Array.from(document.querySelectorAll('button'));
    return (
      buttons.find(
        (btn) => /continue\s*to\s*payment/i.test(btn.textContent || '') && IRCTCExt.Wait.isVisible(btn)
      ) || null
    );
  },

  isContinueToPaymentEnabled(btn) {
    if (!btn) return false;
    if (btn.disabled) return false;
    if (btn.classList.contains('disabled')) return false;
    if (btn.getAttribute('aria-disabled') === 'true') return false;
    return IRCTCExt.Wait.isVisible(btn);
  },

  async clickContinueToPayment(overlay) {
    if (location.pathname.includes('bkgPaymentOptions')) {
      return this.waitForPaymentPage(overlay);
    }

    overlay.setStep('Review');

    const availability = this.readAvailabilityStatus();
    if (availability) {
      overlay.setStatus(`Availability: ${availability}`);
      await IRCTCExt.Wait.delay(400);
    }

    overlay.setStatus('Waiting for Continue To Payment button...');

    const btn = await IRCTCExt.Wait.poll(
      () => {
        const candidate = this.findContinueToPaymentButton();
        return candidate && this.isContinueToPaymentEnabled(candidate) ? candidate : null;
      },
      { timeout: 20000, interval: 250 }
    );
    if (!btn) throw new Error('Continue To Payment button not found or still disabled');

    overlay.setStatus('Clicking Continue To Payment...');
    this.clickTarget(btn);
    await IRCTCExt.Wait.delay(800);

    const afterClick = await IRCTCExt.Wait.poll(
      () => {
        if (location.pathname.includes('bkgPaymentOptions')) return 'payment';
        const modal = this.findReviewConfirmModal();
        if (modal) return modal;
        return null;
      },
      { timeout: 20000, interval: 250 }
    );

    if (afterClick === 'payment') {
      return this.waitForPaymentPage(overlay);
    }
    if (!afterClick) throw new Error('Booking review confirmation popup did not appear');

    await this.clickReviewConfirmContinue(overlay, afterClick);
    await this.waitForPaymentPage(overlay);
  },

  async configure(config, overlay) {
    overlay.setStep('Review');
    await IRCTCExt.Wait.delay(600);
    await this.selectLoyaltySkip(overlay);
    await IRCTCExt.Wait.delay(400);
    await this.selectPaymentMethod(config, overlay);
    await IRCTCExt.Wait.delay(500);
    const destination = await this.clickCalculateFare(overlay);
    overlay.setStatus(
      destination === 'payment' ? 'Fare calculated — on payment page.' : 'Fare calculated.'
    );
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

IRCTCExt.Bot = {
  running: false,
  unwatchPath: null,
  MAX_AUTO_RESTARTS: 3,
  RESTART_FLAG: 'irctc-ext-restart-pending',
  STOP_FLAG: 'irctc-ext-stop-pending',

  async getSite(config) {
    const site = IRCTCExt.SiteRegistry.get(config);
    if (!site?.flows) {
      throw new Error('Booking site profile not loaded. Reload the app.');
    }
    if (site.selectors) IRCTCExt.SELECTORS = site.selectors;
    return site;
  },

  async waitForSiteReady(config, { timeout = 15000 } = {}) {
    const site = await IRCTCExt.Wait.poll(
      () => {
        const profile = IRCTCExt.SiteRegistry.get(config);
        return profile?.flows ? profile : null;
      },
      { timeout, interval: 100 }
    );
    if (!site) throw new Error('Booking site profile not loaded. Reload the app.');
    return site;
  },

  isContentScriptReady() {
    const sites = IRCTCExt.SiteRegistry?.SITES || {};
    const onNget = location.pathname.includes('/nget/');
    const onEticket = location.pathname.includes('/eticket/');
    if (onNget) return !!sites.nget?.flows;
    if (onEticket) return !!sites.eticket?.flows;
    return !!(sites.eticket?.flows || sites.nget?.flows);
  },

  isWebViewHost() {
    return typeof chrome === 'undefined' || !chrome.runtime?.sendMessage;
  },

  isAutoPayAvailable() {
    return !!IRCTCExt.BkgPayment?.handleCardsPayment;
  },

  async handleErrorPageIfNeeded(overlay) {
    const config = await IRCTCExt.Storage.get();
    const site = await IRCTCExt.Bot.getSite(config);
    if (!site.isErrorPage()) return false;

    if (!config.state.running || config.state.paused) return false;
    if (IRCTCExt.Bot._errorRestartInFlight) return true;

    const count = config.state.autoRestartCount || 0;
    if (count >= IRCTCExt.Bot.MAX_AUTO_RESTARTS) {
      overlay?.setError(`IRCTC error page appeared ${count} times. Auto-restart limit reached.`);
      overlay?.setStatus('Stopped after repeated IRCTC errors.');
      overlay?.setStep('Error');
      await IRCTCExt.Storage.updateState({ running: false, status: 'error' });
      IRCTCExt.Bot.running = false;
      return true;
    }

    IRCTCExt.Bot._errorRestartInFlight = true;
    try {
      overlay?.setError('');
      overlay?.setStatus(
        `IRCTC error page detected. Restarting (${count + 1}/${IRCTCExt.Bot.MAX_AUTO_RESTARTS})...`
      );
      overlay?.setStep('Restart');
      await IRCTCExt.Storage.updateState({ autoRestartCount: count + 1 });
      await IRCTCExt.Bot.restart();
    } finally {
      IRCTCExt.Bot._errorRestartInFlight = false;
    }
    return true;
  },

  async shouldContinue() {
    const config = await IRCTCExt.Storage.get();
    return config.state.running && !config.state.paused;
  },

  async isRunning() {
    const config = await IRCTCExt.Storage.get();
    return !!config.state.running && config.state.status !== 'stopped';
  },

  async wasStopped() {
    const config = await IRCTCExt.Storage.get();
    return !config.state.running || config.state.status === 'stopped';
  },

  async checkControlState() {
    const config = await IRCTCExt.Storage.get();
    if (!config.state.running) return 'stopped';
    if (config.state.paused) return 'paused';
    return null;
  },

  async waitUntilResumedOrStopped({ interval = 300 } = {}) {
    while (true) {
      const state = await IRCTCExt.Bot.checkControlState();
      if (state === 'stopped') return 'stopped';
      if (!state) return 'resumed';
      await IRCTCExt.Wait.delay(interval);
    }
  },

  async stop() {
    this.running = false;
    sessionStorage.removeItem(this.RESTART_FLAG);
    sessionStorage.setItem(this.STOP_FLAG, '1');

    await IRCTCExt.Storage.updateState({
      running: false,
      paused: false,
      status: 'stopped',
      currentStep: 'init'
    });

    IRCTCExt.PlatformBridge?.sendMessage('BOOKING_STOPPED', {});
    location.reload();
  },

  async runLoginIfNeeded(config, overlay, site) {
    if (await site.flows.LoginFlow.isLoggedIn()) return;
    try {
      await site.flows.LoginFlow.run(config, overlay);
    } catch (err) {
      console.warn('[IRCTC-Bot] Login step:', err);
      overlay.setStatus('Continuing (login not completed)');
    }
  },

  async ensureTokenForPayment(overlay, config) {
    if (config.state?.tokenConsumed) return true;

    const usageKey = config.state?.bookingSessionId || crypto.randomUUID();
    if (!config.state?.bookingSessionId) {
      await IRCTCExt.Storage.updateState({ bookingSessionId: usageKey });
      config.state.bookingSessionId = usageKey;
    }

    const result = await IRCTCExt.PlatformBridge
      .sendMessage('CONSUME_TOKEN', { usageKey })
      .catch(() => null);

    if (!result?.ok) {
      overlay?.setError(result?.message || 'No booking tokens remaining.');
      overlay?.setStatus('Booking blocked — no tokens left for payment step.');
      overlay?.setStep('Access');
      await IRCTCExt.Storage.updateState({ running: false, status: 'idle', currentStep: 'access' });
      return false;
    }

    await IRCTCExt.Storage.updateState({ tokenConsumed: true });
    config.state.tokenConsumed = true;
    return true;
  },

  async handlePaymentPage(overlay, config, site) {
    if (config.state.paymentDone) return 'done';

    overlay.setStep('Payment');

    const autoPayEnabled = !!config.preferences?.autoPayEnabled;
    const canAutoPay = IRCTCExt.Bot.isAutoPayAvailable();

    if (!autoPayEnabled || !canAutoPay) {
      const reason = !autoPayEnabled
        ? 'Auto pay disabled — complete payment manually.'
        : 'Auto pay is not available in this host — complete payment manually.';
      overlay.setStatus(reason);
      await IRCTCExt.Storage.updateState({ paymentDone: true });
      await site.flows.BookingFlow.showPaymentReview(overlay);
      IRCTCExt.PlatformBridge?.sendMessage('BOOKING_STATUS', { status: 'payment_manual' });
      return 'done';
    }

    const sitePayment = site.flows?.BookingFlow?.handlePayment;
    if (sitePayment) {
      const result = await sitePayment(config, overlay);
      if (result?.awaitingGateway) {
        await IRCTCExt.Storage.updateState({ currentStep: 'gateway' });
        overlay.setStep('Gateway');
        IRCTCExt.PlatformBridge?.sendMessage('BOOKING_STATUS', {
          status: 'awaiting_gateway',
          step: 'gateway',
          gateway: result.gateway
        });
        return 'wait';
      }
      overlay.setStatus('Payment flow started. Complete payment on gateway.');
    } else {
      const method = config.preferences?.paymentMethod || 'cards';

      if (method === 'upi') {
        await IRCTCExt.BkgPayment.handleUpiPayment(config, overlay);
        overlay.setStatus('Payment provider selected. Complete payment on IRCTC.');
      } else if (method === 'cards') {
        const result = await IRCTCExt.BkgPayment.handleCardsPayment(config, overlay);
        if (result?.awaitingGateway) {
          await IRCTCExt.Storage.updateState({ currentStep: 'gateway' });
          overlay.setStep('Gateway');
          IRCTCExt.PlatformBridge?.sendMessage('BOOKING_STATUS', {
            status: 'awaiting_gateway',
            step: 'gateway',
            gateway: result.gateway
          });
          return 'wait';
        }
        overlay.setStatus('Cards payment flow started. Complete payment on gateway.');
      } else {
        throw new Error(`Unsupported payment method: ${method}`);
      }
    }

    await IRCTCExt.Storage.updateState({ paymentDone: true });
    await site.flows.BookingFlow.showPaymentReview(overlay);
    IRCTCExt.PlatformBridge?.sendMessage('BOOKING_STATUS', { status: 'done' });
    return 'done';
  },

  async runForCurrentPath(overlay) {
    const config = await IRCTCExt.Storage.get();
    const site = await IRCTCExt.Bot.getSite(config);
    const path = location.pathname;

    if (site.isErrorPage(path)) {
      await IRCTCExt.Bot.handleErrorPageIfNeeded(overlay);
      return 'wait';
    }

    const step = site.syncStepFromPath(path, config.state);
    await IRCTCExt.Storage.updateState({ currentStep: step });
    overlay.setStep(step);
    IRCTCExt.PlatformBridge?.sendMessage('BOOKING_STATUS', { step, status: config.state.status });

    if (site.isPaymentPath(path)) {
      const canPay = await IRCTCExt.Bot.ensureTokenForPayment(overlay, config);
      if (!canPay) return 'done';
      return IRCTCExt.Bot.handlePaymentPage(overlay, config, site);
    }

    if (site.isReviewPath(path)) {
      await site.flows.BookingFlow.clickContinueToPayment(overlay);
      if (site.isPaymentPath(location.pathname)) return 'continue';
      overlay.setStatus('Waiting for payment page...');
      return 'wait';
    }

    if (site.isPassengerPath(path)) {
      if (!config.state.passengersDone) {
        await site.flows.BookingFlow.fillPassengers(config, overlay);
        await IRCTCExt.Storage.updateState({ passengersDone: true, currentStep: 'review' });
        return 'continue';
      }
      await site.flows.BookingFlow.configurePsgninputOptions(config, overlay);
      if (site.isPaymentPath(location.pathname)) return 'continue';
      if (site.isReviewPath(location.pathname)) return 'continue';
      overlay.setStatus('Waiting for review or payment page...');
      return 'wait';
    }

    if (site.isTrainListPath(path)) {
      overlay.setStatus('Train list loaded — starting booking...');
      await site.TrainList.bookTrain(config, overlay);
      return 'continue';
    }

    if (site.isTrainSearchPath(path)) {
      await site.flows.LoginFlow.runWithRetry(config, overlay);
      await site.flows.SearchFlow.run(config, overlay);
      if (site.isTrainListPath(location.pathname)) return 'continue';
      overlay.setStatus('Waiting for train list...');
      return 'wait';
    }

    await IRCTCExt.Bot.runLoginIfNeeded(config, overlay, site);
    overlay.setStatus('Waiting for next booking page...');
    return 'wait';
  },

  async start() {
    if (this.running) return;

    const config = await IRCTCExt.Storage.get();
    if (await IRCTCExt.Bot.wasStopped()) return;

    await IRCTCExt.Bot.waitForSiteReady(config);
    if (await IRCTCExt.Bot.wasStopped()) return;

    const access = await IRCTCExt.PlatformBridge
      .sendMessage('CHECK_ACCESS', { forceRefresh: false })
      .catch(() => null);

    if (!access?.allowed) {
      const overlay = await IRCTCExt.Overlay.show().catch(() => null);
      const message =
        access?.tier === 'none'
          ? 'No access yet. Link your Buy Me a Coffee email in the app.'
          : access?.message || 'Access expired. Link your Buy Me a Coffee email.';
      overlay?.setError(message);
      overlay?.setStatus('Booking blocked — access not active.');
      overlay?.setStep('Access');
      await IRCTCExt.Storage.updateState({ running: false, status: 'idle', currentStep: 'access' });
      return;
    }

    if (await IRCTCExt.Bot.wasStopped()) return;

    this.running = true;

    const overlay = await IRCTCExt.Overlay.show();
    if (!overlay || typeof overlay.startTimer !== 'function') {
      this.running = false;
      throw new Error('Overlay failed to initialize');
    }
    overlay.startTimer();
    overlay.setError('');
    overlay.setStep('Starting');

    IRCTCExt.Modals.dismissSessionRestore();

    if (await IRCTCExt.Bot.wasStopped()) {
      this.running = false;
      return;
    }

    await IRCTCExt.Storage.updateState({
      running: true,
      paused: false,
      status: 'running',
      lastRun: new Date().toISOString(),
      passengersDone: false,
      paymentDone: false,
      paymentPhase: null,
      paymentGateway: null,
      awaitingGateway: false,
      bookingSessionId: crypto.randomUUID(),
      tokenConsumed: false
    });

    try {
      let attempts = 0;
      const maxRetries = 3;

      while (await IRCTCExt.Bot.isRunning()) {
        if (!(await IRCTCExt.Bot.shouldContinue())) {
          overlay.setStatus('Paused');
          overlay.setStep('Paused');
          const resumed = await IRCTCExt.Bot.waitUntilResumedOrStopped();
          if (resumed === 'stopped') break;
          overlay.setStatus('Resumed');
          continue;
        }

        try {
          const result = await IRCTCExt.Bot.runForCurrentPath(overlay);
          if (result === 'done') break;
          if (result === 'wait') break;
          if (result === 'continue') continue;
        } catch (err) {
          if (err.code === 'BOOKING_STOPPED' || err.message === 'Booking stopped') break;
          attempts += 1;
          console.error('[IRCTC-Bot]', err);
          overlay.setError(err.message || String(err));
          if (attempts >= maxRetries) throw err;
          overlay.setStatus(`Retry ${attempts}/${maxRetries}...`);
          await IRCTCExt.Wait.delay(1500);
        }
      }

      const finalConfig = await IRCTCExt.Storage.get();
      if (finalConfig.state.currentStep === 'done' || finalConfig.state.status === 'done') {
        overlay.setStatus('Automation sequence completed.');
        overlay.setStep('Done');
        IRCTCExt.PlatformBridge?.sendMessage('BOOKING_STATUS', { status: 'done' });
      } else if (finalConfig.state.running) {
        overlay.setStatus(`Waiting at step: ${finalConfig.state.currentStep}`);
        overlay.setStep(finalConfig.state.currentStep);
      }
    } catch (err) {
      console.error('[IRCTC-Bot] Fatal:', err);
      overlay.setError(err.message || String(err));
      overlay.setStatus('Failed: ' + (err.message || err));
      overlay.setStep('Error');
      await IRCTCExt.Storage.updateState({ status: 'error', running: false, message: err.message });
      IRCTCExt.PlatformBridge?.sendMessage('BOOKING_STATUS', { status: 'error', message: err.message });
    } finally {
      this.running = false;
    }
  },

  async resumeIfNeeded() {
    const overlay = await IRCTCExt.Overlay.show().catch(() => null);
    if (await IRCTCExt.Bot.handleErrorPageIfNeeded(overlay)) return;

    const config = await IRCTCExt.Storage.get();
    if (!config.state.running || config.state.paused || config.state.status === 'stopped' || this.running) return;
    try {
      await IRCTCExt.Bot.start();
    } catch (err) {
      console.error('[IRCTC-Bot] Resume failed:', err);
    }
  },

  async restart() {
    const config = await IRCTCExt.Storage.get();
    const site = IRCTCExt.SiteRegistry.get(config);

    this.running = false;

    const overlay = await IRCTCExt.Overlay.show();
    const pausePanel = document.getElementById('irctc-ext-pause-panel');
    if (pausePanel) pausePanel.style.display = 'none';
    overlay.setError('');
    overlay.setStatus('Restarting from train search...');
    overlay.setStep('Restart');
    overlay.startTimer();

    sessionStorage.setItem(IRCTCExt.Bot.RESTART_FLAG, '1');

    await IRCTCExt.Storage.updateState({
      currentStep: 'init',
      running: true,
      paused: false,
      status: 'running',
      passengersDone: false,
      paymentDone: false,
      paymentPhase: null,
      paymentGateway: null,
      awaitingGateway: false,
      autoRestartCount: 0,
      bookingSessionId: crypto.randomUUID(),
      tokenConsumed: false
    });

    if (site.isTrainSearchPath(location.pathname)) {
      location.reload();
    } else {
      location.assign(site.trainSearchUrl);
    }
  },

  init() {
    if (window.__irctcBotInitDone) return;
    window.__irctcBotInitDone = true;

    IRCTCExt.Wait.installIrctcNoiseFilter?.();

    IRCTCExt.Modals.init();
    IRCTCExt.Overlay.init().catch((err) => console.warn('[IRCTC-Bot] Overlay init:', err));

    this.unwatchPath = IRCTCExt.Wait.watchPath(async () => {
      const overlay = await IRCTCExt.Overlay.show().catch(() => null);
      if (await IRCTCExt.Bot.handleErrorPageIfNeeded(overlay)) return;

      const config = await IRCTCExt.Storage.get();
      if (!config.state.running || config.state.paused) return;

      await IRCTCExt.Bot.resumeIfNeeded();
    });

    const handleMessage = (msg, sendResponse) => {
      if (msg.type === 'PING') {
        sendResponse({ ok: true, ready: IRCTCExt.Bot.isContentScriptReady() });
        return true;
      }

      if (msg.type === 'START_BOOKING') {
        (async () => {
          const config = await IRCTCExt.Storage.get();
          if (await IRCTCExt.Bot.wasStopped()) return;

          await IRCTCExt.Bot.waitForSiteReady(config);
          if (await IRCTCExt.Bot.wasStopped()) return;

          if (!IRCTCExt.Bot.running) {
            await IRCTCExt.Bot.start();
          }
        })().catch((err) => console.error('[IRCTC-Bot] Start failed:', err));
        sendResponse({ ok: true });
        return true;
      }

      if (msg.type === 'GET_STATUS') {
        IRCTCExt.Storage.get().then((c) => sendResponse({ state: c.state }));
        return true;
      }

      if (msg.type === 'STOP_BOOKING') {
        IRCTCExt.Bot.stop().catch((err) => console.error('[IRCTC-Bot] Stop failed:', err));
        sendResponse({ ok: true });
        return true;
      }

      if (msg.type === 'CONTINUE_BOOKING') {
        IRCTCExt.Storage.updateState({ paused: false }).then(() => sendResponse({ ok: true }));
        return true;
      }

      if (msg.type === 'PAUSE_BOOKING') {
        IRCTCExt.Storage.updateState({ paused: true }).then(() => sendResponse({ ok: true }));
        return true;
      }

      return false;
    };

    if (IRCTCExt.PlatformBridge?.onMessage) {
      IRCTCExt.PlatformBridge.onMessage(handleMessage);
    }

    IRCTCExt.Wait.poll(() => document.body, { timeout: 10000, interval: 50 }).then(async () => {
      if (sessionStorage.getItem(IRCTCExt.Bot.STOP_FLAG) === '1') {
        sessionStorage.removeItem(IRCTCExt.Bot.STOP_FLAG);
        IRCTCExt.Bot.running = false;
        const overlay = await IRCTCExt.Overlay.show().catch(() => null);
        overlay?.setStatus('Stopped');
        overlay?.setStep('Idle');
        overlay?.setError('');
        overlay?.stopTimer();
        return;
      }

      if (sessionStorage.getItem(IRCTCExt.Bot.RESTART_FLAG) === '1') {
        sessionStorage.removeItem(IRCTCExt.Bot.RESTART_FLAG);
        IRCTCExt.Bot.running = false;
        try {
          await IRCTCExt.Bot.start();
        } catch (err) {
          console.error('[IRCTC-Bot] Restart resume failed:', err);
        }
        return;
      }
      await IRCTCExt.Bot.resumeIfNeeded();
    });
  }
};

IRCTCExt.Bot.init();
