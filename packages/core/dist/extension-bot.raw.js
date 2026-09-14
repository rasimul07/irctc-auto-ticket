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
    await IRCTCExt.PaymentReviewOverlay.show();
    overlay.setStep('Payment');
    overlay.showPause('Complete payment manually on IRCTC.');
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
      'Side Lower': 'window side',
      'Side Upper': 'side upper'
    };
    return (map[berth] || berth || '').toLowerCase();
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
      const card = IRCTCExt.Passengers.findListCardForPassenger(cards, passenger, usedCards);
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

    const berth = (passenger.berth || '').trim();
    if (berth && berth !== 'No Preference') {
      const berthDropdown = IRCTCExt.Wait.queryOne(sel.newPassengerBerth, modal);
      if (berthDropdown && IRCTCExt.Wait.isVisible(berthDropdown)) {
        const berthOk = await IRCTCExt.Passengers.selectDropdownIn(modal, sel.newPassengerBerth, berth);
        if (!berthOk) throw new Error(`Could not set berth for ${passenger.name}`);
      }
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

      for (const { passenger, card } of matched) {
        const mismatch = IRCTCExt.Passengers.getMismatchType(card, passenger);
        if (!mismatch) continue;

        if (mismatch === 'name' || mismatch === 'age') {
          await IRCTCExt.Passengers.deletePassengerCard(card, overlay);
          const expectedCount = IRCTCExt.Passengers.countPassengerListCards() + 1;
          await IRCTCExt.Passengers.addNewPassenger(passenger, overlay, expectedCount);
        } else {
          await IRCTCExt.Passengers.editPassengerCard(card, passenger, overlay);
        }
        changed = true;
      }

      for (const passenger of unmatchedPassengers) {
        const expectedCount = IRCTCExt.Passengers.countPassengerListCards() + 1;
        await IRCTCExt.Passengers.addNewPassenger(passenger, overlay, expectedCount);
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
          const card = IRCTCExt.Passengers.findListCardForPassenger(
            finalCards,
            passenger,
            usedCards
          );
          if (!card || !IRCTCExt.Passengers.cardMatchesPassenger(card, passenger)) {
            return false;
          }
          usedCards.add(card);
          return true;
        });

        if (!allMatch) {
          const failing = passengers.find((passenger) => {
            const card = IRCTCExt.Passengers.findListCardForPassenger(
              finalCards,
              passenger,
              new Set()
            );
            return !card || !IRCTCExt.Passengers.cardMatchesPassenger(card, passenger);
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

  visiblePassengerDropdownOptions() {
    const panels = [
      ...IRCTCExt.Wait.queryAll('.ap-dropdown-panel'),
      ...IRCTCExt.Wait.queryAll('.ui-dropdown-panel')
    ].filter((panel) => IRCTCExt.Wait.isVisible(panel));

    const items = panels.flatMap((panel) =>
      Array.from(
        panel.querySelectorAll('li.ui-dropdown-item, .ui-dropdown-item, li[role="option"]')
      ).filter((item) => IRCTCExt.Wait.isVisible(item))
    );

    if (items.length) return items;
    return IRCTCExt.Wait.queryAll(IRCTCExt.SELECTORS.passengers.passengerDropdownItem).filter((item) =>
      IRCTCExt.Wait.isVisible(item)
    );
  },

  findDropdownOption(options, labelText) {
    const target = IRCTCExt.Passengers.normalizeDropdownText(labelText);
    return (
      options.find(
        (opt) => IRCTCExt.Passengers.normalizeDropdownText(opt.textContent) === target
      ) ||
      options.find((opt) => {
        const text = IRCTCExt.Passengers.normalizeDropdownText(opt.textContent);
        return text === target || text.startsWith(`${target} `) || text.endsWith(` ${target}`);
      }) ||
      options.find((opt) => IRCTCExt.Events.optionMatches(opt, labelText))
    );
  },

  async selectDropdownIn(root, triggerSelectors, labelText) {
    const trigger = IRCTCExt.Wait.queryOne(triggerSelectors, root);
    if (!trigger || !IRCTCExt.Wait.isVisible(trigger)) return false;

    const dropdown = trigger.closest('p-dropdown') || trigger;
    const shown = IRCTCExt.Passengers.getDropdownShownValue(dropdown);
    if (IRCTCExt.Passengers.dropdownValueMatches(shown, labelText)) return true;

    const clickTarget = dropdown.querySelector('.ui-dropdown-trigger') || trigger;
    IRCTCExt.Events.click(clickTarget);
    await IRCTCExt.Wait.delay(400);

    const options = await IRCTCExt.Wait.poll(
      () => {
        const list = IRCTCExt.Passengers.visiblePassengerDropdownOptions();
        return list.length ? list : null;
      },
      { timeout: 8000, interval: 150 }
    );
    if (!options?.length) return false;

    const match = IRCTCExt.Passengers.findDropdownOption(options, labelText);
    if (!match) return false;

    IRCTCExt.Events.click(match.querySelector('span') || match);
    await IRCTCExt.Wait.delay(300);

    let updated = IRCTCExt.Passengers.getDropdownShownValue(dropdown);
    if (IRCTCExt.Passengers.dropdownValueMatches(updated, labelText)) return true;

    IRCTCExt.Events.click(clickTarget);
    await IRCTCExt.Wait.delay(300);
    const retryOptions = IRCTCExt.Passengers.visiblePassengerDropdownOptions();
    const retryMatch = IRCTCExt.Passengers.findDropdownOption(retryOptions, labelText);
    if (!retryMatch) return false;
    IRCTCExt.Events.click(retryMatch.querySelector('span') || retryMatch);
    await IRCTCExt.Wait.delay(300);

    updated = IRCTCExt.Passengers.getDropdownShownValue(dropdown);
    return IRCTCExt.Passengers.dropdownValueMatches(updated, labelText);
  },

  async fillNewPassengerForm(passenger, modalRoot) {
    const sel = IRCTCExt.SELECTORS.passengers;

    const nameInput = IRCTCExt.Wait.queryOne(sel.newPassengerName, modalRoot);
    if (!nameInput) throw new Error('Passenger name field not found');
    await IRCTCExt.Events.typeSlowly(nameInput, passenger.name.trim(), 40);
    await IRCTCExt.Wait.delay(300);

    const ageInput = IRCTCExt.Wait.queryOne(sel.newPassengerAge, modalRoot);
    if (!ageInput) throw new Error('Passenger age field not found');
    IRCTCExt.Events.setInputValue(ageInput, String(passenger.age || '').trim());

    const genderLabel = IRCTCExt.Passengers.genderLabel(passenger.gender);
    const genderOk = await IRCTCExt.Passengers.selectDropdownIn(
      modalRoot,
      sel.newPassengerGender,
      genderLabel
    );
    if (!genderOk) throw new Error(`Could not select gender: ${genderLabel}`);

    const nationalityDropdown = IRCTCExt.Wait.queryOne(sel.newPassengerNationality, modalRoot);
    if (nationalityDropdown && IRCTCExt.Wait.isVisible(nationalityDropdown)) {
      const dropdown = nationalityDropdown.closest('p-dropdown') || nationalityDropdown;
      const current = IRCTCExt.Passengers.getDropdownShownValue(dropdown);
      if (!IRCTCExt.Passengers.dropdownValueMatches(current, 'India')) {
        await IRCTCExt.Passengers.selectDropdownIn(modalRoot, sel.newPassengerNationality, 'India');
      }
    }

    const berth = (passenger.berth || '').trim();
    if (berth && berth !== 'No Preference') {
      const berthDropdown = IRCTCExt.Wait.queryOne(sel.newPassengerBerth, modalRoot);
      if (berthDropdown && IRCTCExt.Wait.isVisible(berthDropdown)) {
        await IRCTCExt.Passengers.selectDropdownIn(modalRoot, sel.newPassengerBerth, berth);
      }
    }

    const foodLabel = IRCTCExt.Passengers.foodLabel(passenger.food);
    if (foodLabel) {
      const foodDropdown = IRCTCExt.Wait.queryOne(sel.newPassengerFood, modalRoot);
      if (foodDropdown && IRCTCExt.Wait.isVisible(foodDropdown)) {
        await IRCTCExt.Passengers.selectDropdownIn(modalRoot, sel.newPassengerFood, foodLabel);
      }
    }

    return true;
  },

  async submitNewPassenger(modalRoot, expectedMinCount) {
    const sel = IRCTCExt.SELECTORS.passengers;
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
    await IRCTCExt.Passengers.fillNewPassengerForm(passenger, modal);
    return IRCTCExt.Passengers.submitNewPassenger(modal, expectedMinCount);
  },

  async addPassengers(config, overlay) {
    const sel = IRCTCExt.SELECTORS.passengers;
    overlay.setStep('Passengers');
    await IRCTCExt.Storage.updateState({ currentStep: 'passengers' });

    const passengers = (config.passengers || []).filter((p) => p.name && String(p.name).trim());
    if (!passengers.length) throw new Error('No passengers configured with names');

    const startCount = IRCTCExt.Passengers.countPassengerListCards();
    let expectedCount = startCount;

    overlay.setStatus(`Matching ${passengers.length} passenger(s) in existing list...`);
    const existingModal = await IRCTCExt.Passengers.openExistingPassengerModal(overlay);
    const rows = IRCTCExt.Wait.queryAll(sel.existingPassengerRow, existingModal);
    const { matched, unmatched } = IRCTCExt.Passengers.partitionPassengers(rows, passengers);

    if (matched.length) {
      expectedCount += matched.length;
      await IRCTCExt.Passengers.addMatchedFromExisting(existingModal, matched, overlay, expectedCount);
    }

    if (IRCTCExt.Passengers.isExistingModalOpen()) {
      await IRCTCExt.Passengers.closeModalCancel(
        sel.existingPassengerCancelBtn,
        IRCTCExt.Passengers.isExistingModalOpen
      );
    }

    for (const passenger of unmatched) {
      expectedCount += 1;
      await IRCTCExt.Passengers.addNewPassenger(passenger, overlay, expectedCount);
    }

    const finalCount = IRCTCExt.Passengers.countPassengerListCards();
    if (finalCount < startCount + passengers.length) {
      throw new Error(`Expected ${passengers.length} passenger(s), found ${finalCount - startCount}`);
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
    return !!(sites.eticket?.flows && sites.nget?.flows);
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
    return !!config.state.running;
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
    overlay.setStep('Payment');
    overlay.setStatus('Complete payment manually on IRCTC.');
    await IRCTCExt.Storage.updateState({ paymentDone: true, status: 'done', currentStep: 'done' });
    IRCTCExt.PlatformBridge?.sendMessage('BOOKING_STATUS', { status: 'payment_manual' });
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
    await IRCTCExt.Bot.waitForSiteReady(config);

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
    if (!config.state.running || config.state.paused || this.running) return;
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
          await IRCTCExt.Bot.waitForSiteReady(config);
          await IRCTCExt.Storage.updateState({
            currentStep: 'init',
            running: true,
            paused: false,
            status: 'running',
            passengersDone: false,
            paymentDone: false,
            autoRestartCount: 0,
            paymentPhase: null,
            paymentGateway: null,
            awaitingGateway: false
          });
          IRCTCExt.Bot.running = false;
          await IRCTCExt.Bot.start();
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
