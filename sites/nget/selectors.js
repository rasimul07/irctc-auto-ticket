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
  ]
};
