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
