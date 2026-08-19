window.IRCTCExt = window.IRCTCExt || {};

IRCTCExt.SELECTORS = {
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
    '.station-search-input',
    '.custom-dropdown-panel input',
    '.custom-dropdown-panel .field-input',
    'input.station-search-input',
    'div.field-box[aria-expanded="true"] input',
    'input[placeholder*="Station"]',
    'input[placeholder*="station"]',
    'input[placeholder*="Search"]',
    'input[placeholder*="Type"]'
  ],
  customStationOptions: [
    '.custom-dropdown-panel .custom-option',
    '[role="listbox"] [role="option"]',
    '.custom-option'
  ],
  customQuotaOptions: [
    '.custom-dropdown-panel-quota .custom-option'
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
    'ul.ui-dropdown-items li'
  ],
  trainList: {
    container: ['.train-list-container', 'app-train-list-panel', 'app-train-list'],
    trainCard: ['app-train-avl-enq'],
    trainNumber: ['.train-number'],
    trainName: ['.train-name'],
    availabilityBtn: ['button.btn-availability'],
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
  ]
};
