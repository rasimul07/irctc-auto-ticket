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
    highLoadClose: ['.fa.fa-close', 'span.fa-close', '.fa-close'],
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
