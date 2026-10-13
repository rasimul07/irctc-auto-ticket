"use strict";
(() => {
  // dist/extension-gateway.raw.js
  (function(root) {
    root.IRCTCExt = root.IRCTCExt || {};
    IRCTCExt.NgetConfig = {
      id: "nget",
      label: "Classic \u2014 nget",
      homeUrl: "https://www.irctc.co.in/nget",
      trainSearchUrl: "https://www.irctc.co.in/nget/train-search",
      trainSearchPath: "/nget/train-search",
      urlPattern: "https://*.irctc.co.in/nget/*",
      trainSearchUrlPattern: "https://*.irctc.co.in/nget/train-search*",
      gatewayUrl: "https://pg.irctcpayments.com/",
      gatewayHost: "pg.irctcpayments.com",
      gatewayUrlPattern: "https://pg.irctcpayments.com/*",
      gatewayAuthRedirectPath: "/pg/api/v2/authRedirect",
      thirdPartyGatewayHosts: ["pg.irctcpayments.com", "irctcipay.com", "phonepe.com"],
      errorPagePath: "/nget/error"
    };
  })(typeof globalThis !== "undefined" ? globalThis : window);
  window.IRCTCExt = window.IRCTCExt || {};
  IRCTCExt.NgetPaths = {
    isGatewayHost(hostname = location.hostname) {
      const host = IRCTCExt.NgetConfig?.gatewayHost || "pg.irctcpayments.com";
      return hostname.includes(host) || hostname.includes("irctcpayments.com");
    },
    isGatewayPath(path = location.pathname, hostname = location.hostname) {
      return IRCTCExt.NgetPaths.isGatewayHost(hostname);
    },
    isGatewayAuthRedirectPath(path = location.pathname, hostname = location.hostname) {
      if (!IRCTCExt.NgetPaths.isGatewayHost(hostname)) return false;
      const authPath = IRCTCExt.NgetConfig?.gatewayAuthRedirectPath || "/pg/api/v2/authRedirect";
      return path.includes(authPath) || path.includes("/authRedirect");
    },
    isPaymentPath(path = location.pathname) {
      return path.includes("bkgPaymentOptions") || /\/payment(?:\/|$)/i.test(path);
    },
    isReviewPath(path = location.pathname) {
      return path.includes("reviewBooking") || /\/review(?:\/|$)/i.test(path);
    },
    syncStepFromPath(path, state = {}) {
      if (IRCTCExt.NgetPaths.isGatewayPath(path)) return "gateway";
      if (state.awaitingGateway && state.paymentPhase === "gateway") return "gateway";
      if (IRCTCExt.NgetPaths.isPaymentPath(path)) return "payment";
      if (IRCTCExt.NgetPaths.isReviewPath(path)) return "review";
      if (path.includes("psgninput")) {
        if (state.psgnPaymentContinueClicked) return "review";
        return state.passengersDone ? "review" : "passengers";
      }
      if (path.includes("train-list")) return "train-list";
      if (path.includes("train-search")) {
        if (IRCTCExt.NgetLanguageFlow?.isLanguageModalVisible?.()) return "language";
        if (IRCTCExt.NgetLoginFlow?.needsLogin?.()) return "login";
        return "search";
      }
      return "init";
    },
    syncProgressFromPath(path = location.pathname, state = {}) {
      const updates = {};
      if (IRCTCExt.NgetPaths.isReviewPath(path) || IRCTCExt.NgetPaths.isPaymentPath(path)) {
        updates.passengersDone = true;
        updates.psgnPaymentContinueClicked = false;
      }
      if (IRCTCExt.NgetPaths.isGatewayPath(path)) {
        if (state.paymentPhase === "gateway" || state.awaitingGateway) {
          updates.awaitingGateway = true;
          updates.paymentPhase = "gateway";
        }
      }
      return updates;
    },
    isErrorPage(path = location.pathname) {
      if (path.includes(IRCTCExt.NgetConfig.errorPagePath)) return true;
      if (IRCTCExt.Modals?.detectWafOrServerError?.()) return true;
      return false;
    },
    isTrainListPath(path = location.pathname) {
      return path.includes("train-list");
    },
    isTrainSearchPath(path = location.pathname) {
      return path.includes("train-search");
    },
    isPassengerPath(path = location.pathname) {
      return path.includes("psgninput");
    }
  };
  window.IRCTCExt = window.IRCTCExt || {};
  IRCTCExt.EticketSelectors = {
    loginHeaderBtn: [
      "button.btn-login",
      "button.btn-login.ng-star-inserted",
      ".btn-login",
      "nav button.btn-login",
      ".navbar-actions button.btn-login",
      "header button.btn-login",
      ".header button.btn-login",
      'button[aria-label*="Login" i]',
      "a.btn-login",
      "a.loginText"
    ],
    loginModal: [
      "#newLogin",
      ".login-dialog",
      ".login-wrapper",
      ".login-slider-viewport",
      ".login-slider",
      ".login-panel:not(.login-panel--inactive)",
      ".login-form:not(.agent-panel)",
      "form:has(.login-wrapper)",
      "form:has(#username)",
      'form:has(input[formcontrolname="userid"])'
    ],
    loginUserTab: [
      ".login-tab.active",
      ".login-tab"
    ],
    loginUsername: [
      "#username",
      'input[formcontrolname="userid"]',
      'input[autocomplete="username"]',
      ".username-field input",
      "#agentUsername",
      'input[formcontrolname="agentUserid"]',
      '.login-panel:not(.login-panel--inactive) input[formcontrolname*="userid" i]',
      '.login-panel:not(.login-panel--inactive) input[placeholder*="User" i]',
      ".login-panel:not(.login-panel--inactive) .username-field input",
      '.login-form input[placeholder*="Username" i]',
      '.login-form input[placeholder*="username" i]',
      'input[placeholder*="User" i]',
      'input[name="userId"]'
    ],
    loginPassword: [
      "#password",
      'input[formcontrolname="password"]',
      'input[autocomplete="current-password"]',
      ".password-field input",
      "#agentPassword",
      'input[formcontrolname="agentPassword"]',
      '.login-panel:not(.login-panel--inactive) input[formcontrolname*="password" i]',
      '.login-panel:not(.login-panel--inactive) input[type="password"]',
      ".login-panel:not(.login-panel--inactive) .password-field input",
      '.login-form input[type="password"]',
      'input[type="password"]'
    ],
    loginCaptcha: [
      '.login-panel:not(.login-panel--inactive) input[placeholder*="Captcha" i]',
      '.login-panel:not(.login-panel--inactive) input[placeholder*="OTP" i]',
      '.login-panel:not(.login-panel--inactive) input[formcontrolname*="captcha" i]',
      '.login-panel:not(.login-panel--inactive) input[formcontrolname*="otp" i]',
      '.login-form input[placeholder*="Captcha"]',
      '.login-form input[placeholder*="CAPTCHA"]',
      'input[formcontrolname="captcha"]',
      'input[placeholder*="Captcha"]',
      'input[placeholder*="CAPTCHA"]'
    ],
    loginSubmit: [
      '.actions-row button[type="submit"]',
      ".actions-row button.button-primary",
      ".actions-row button",
      'button.button-primary[type="submit"]',
      "button.button-primary",
      'button[type="submit"]',
      ".login-panel:not(.login-panel--inactive) button.button-primary",
      '.login-panel:not(.login-panel--inactive) button[type="submit"]',
      ".login-panel:not(.login-panel--inactive) .actions-row button",
      ".login-form button.button-primary",
      '.login-form button[type="submit"]',
      ".login-wrapper button.button-primary",
      '.login-wrapper button[type="submit"]',
      "button.agent-submit-btn",
      ".agent-panel button.agent-submit-btn",
      ".agent-panel button.btn-login",
      "button.search_btn",
      'button[type="submit"].search_btn',
      "a.search_btn.loginText"
    ],
    loggedInProfile: [
      ".profile-name",
      "span.profile-name",
      ".profile-logo",
      "img.profile-logo",
      'img[alt="profile logo"]',
      'img[alt*="profile logo" i]',
      'img[src*="verified-user"]',
      "button.nav-link-1 .profile-name",
      "button.nav-link-1:has(.profile-name)",
      "button.nav-link-1:has(.profile-logo)",
      "button:has(.profile-name)",
      "button:has(.profile-logo)",
      "button.nav-link-1.nav-link--active",
      "button.nav-link-1",
      ".profile-menu-arrow-img",
      'a[href*="logout" i]',
      'button[aria-label*="Logout" i]',
      ".user-profile",
      ".profile-icon",
      ".user-name",
      '[aria-label*="user profile" i]'
    ],
    searchFrom: [
      'div.field-box[aria-label="From station"]',
      "p-autocomplete#origin input",
      'input[placeholder="FROM *"]'
    ],
    searchTo: [
      'div.field-box[aria-label="To station"]',
      "p-autocomplete#destination input",
      'input[placeholder="TO *"]'
    ],
    searchDate: [
      'div.field-box[aria-label="Select travel date"]',
      "p-calendar#journeyDate input",
      'input[placeholder="DD/MM/YYYY *"]'
    ],
    searchClass: [
      'p-dropdown[formcontrolname="journeyClass"]',
      'p-dropdown[formcontrolname="journeyClass"] .ui-dropdown-trigger'
    ],
    searchQuota: [
      'div.field-box[aria-label="Quota"]',
      "p-dropdown#journeyQuota",
      'p-dropdown[formcontrolname="journeyQuota"]',
      'p-dropdown[formcontrolname="journeyQuota"] .ui-dropdown-trigger'
    ],
    searchButton: [
      'app-jp-input button.search-btn[type="submit"]',
      'button.search-btn[type="submit"]',
      "button.search_btn",
      'button[type="submit"].search_btn'
    ],
    stationSearchInput: [
      'div.field-box[aria-expanded="true"] input',
      'div.field-box[aria-expanded="true"] .field-input',
      ".custom-dropdown-panel .station-search-input",
      ".custom-dropdown-panel input",
      ".custom-dropdown-panel .field-input",
      "input.station-search-input",
      'input[placeholder*="Station"]',
      'input[placeholder*="station"]',
      'input[placeholder*="Search"]',
      'input[placeholder*="Type"]'
    ],
    customStationPanel: [
      ".custom-dropdown-panel"
    ],
    customStationOptions: [
      ".custom-dropdown-panel .custom-option",
      '[role="listbox"] [role="option"]',
      ".custom-option"
    ],
    customQuotaOptions: [
      ".custom-dropdown-panel-quota .custom-option",
      ".custom-dropdown-panel .custom-option",
      '[role="listbox"] [role="option"]',
      'div.field-box[aria-label="Quota"][aria-expanded="true"] + .custom-dropdown-panel .custom-option'
    ],
    calendarPanel: [
      ".custom-calendar-panel .ui-datepicker",
      ".ui-datepicker"
    ],
    autocompletePanel: [
      ".custom-dropdown-panel .custom-option",
      ".ui-autocomplete-panel li",
      "ul.ui-autocomplete-items li",
      ".p-autocomplete-panel li"
    ],
    dropdownPanel: [
      ".custom-dropdown-panel-quota .custom-option",
      ".custom-dropdown-panel .custom-option",
      ".ui-dropdown-panel li",
      ".p-dropdown-panel li",
      "ul.ui-dropdown-items li",
      ".ap-dropdown-panel li",
      ".ap-dropdown-panel .ui-dropdown-item"
    ],
    trainList: {
      container: [".train-list-container", "app-train-list-panel", "app-train-list", "app-train-avl-enq .train-listing"],
      trainCard: ["app-train-avl-enq"],
      trainListing: [".train-listing"],
      trainCardMain: [".train-card__main"],
      trainNumber: [".train-number"],
      trainName: [".train-name"],
      dateBadge: [".train-dates .date-badge"],
      availabilityBtn: ["button.btn-availability"],
      refreshAvailabilityBtn: [
        "button.btn-availability.btn-availability--outline",
        "button.btn-availability"
      ],
      classRefreshIcon: [
        ".class-card .sync-icon.fa-repeat",
        '[aria-label="Refresh availability"]'
      ],
      availableClasses: [".available-classes"],
      classCard: [".class-card"],
      classCode: [".class-code"],
      classStatus: [".class-status"],
      bookBtn: ["button.btn-book"],
      scrollNext: [".btn-scroll-next"],
      trainHeading: [".train-heading strong"],
      classCell: ["div.pre-avl"],
      bookNowBtn: ["button.train_Search"],
      bookNowEnabled: ["button.train_Search:not(.disable-book)"]
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
      "button.train_Search",
      "button.search_btn",
      'button[type="submit"]'
    ],
    paymentOptions: [
      ".bank-type",
      ".payment-opt",
      'input[type="radio"]'
    ],
    termsCheckbox: [
      'input[type="checkbox"]',
      ".ui-chkbox input"
    ],
    passengers: {
      bookConfirmOverlay: [".bc-overlay", "app-book-now-confirmation .bc-card"],
      bookConfirmContinue: [".bc-btn-continue", "button.bc-btn-continue"],
      existingPassengerBtn: ["button.btn-existing"],
      existingModal: [".ep-modal-mask", 'section.ep-modal-panel[role="dialog"]'],
      existingModalTitle: ["#existingPassengerTitle.ep-title", ".ep-title"],
      existingPassengerRow: [".ep-passenger-row:not(.ep-passenger-row--disabled)"],
      existingPassengerCheckbox: [".ep-passenger-row .ui-chkbox-box", '.ep-passenger-row input[type="checkbox"]'],
      existingPassengerName: [".ep-passenger-name"],
      existingPassengerDetails: [".ep-passenger-details"],
      existingPassengerAddBtn: ["button.ep-add-btn", "button.ep-add-btn.app-modal-button--primary"],
      existingPassengerCancelBtn: ["button.app-modal-button--cancel"],
      passengerListContainer: [".passenger-list", "app-passenger-list"],
      passengerListCard: [".passenger-list .passenger-card", "app-passenger-list .passenger-card"],
      passengerCardName: [".passenger-name"],
      passengerCardDetails: [".passenger-detail-row"],
      passengerEditBtn: ['.action-icons img[alt="Edit"]', '.action-icon[alt="Edit"]'],
      passengerDeleteBtn: ['.action-icons img[alt="Delete"]', '.action-icon[alt="Delete"]'],
      passengerDeleteConfirmBtn: ["button.app-modal-button--primary", "button.ui-button-danger"],
      editPassengerModal: [".add-passenger-dialog .ap-container", ".ap-container"],
      editPassengerSaveBtn: ["button.ap-add-btn.app-modal-button--primary", "button.ap-add-btn"],
      newPassengerBtn: ["button.btn-new-passenger"],
      newPassengerModal: [".ap-container", ".ui-dialog-content .ap-container"],
      newPassengerTitle: [".ap-title"],
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
        ".ap-dropdown-panel .ui-dropdown-item",
        ".ap-dropdown-panel li.ui-dropdown-item",
        ".ui-dropdown-panel .ui-dropdown-item",
        ".ui-dropdown-panel li.ui-dropdown-item"
      ],
      newPassengerAutocompletePanel: [
        ".ui-autocomplete-panel li",
        "ul.ui-autocomplete-items li",
        ".p-autocomplete-panel li"
      ],
      newPassengerValidationError: [".ap-validation-messages small"],
      newPassengerAddBtn: [
        ".ap-dialog-actions button.ap-add-btn",
        "button.ap-add-btn.app-modal-button--primary",
        "button.ap-add-btn"
      ],
      newPassengerCancelBtn: [".ap-dialog-actions button.app-modal-button--cancel"]
    },
    psgnPreferences: {
      otherPreferencesHeader: [
        'div.section-header[aria-controls="bookingPreferencesBody"]',
        'div.section-header[role="button"][aria-controls="bookingPreferencesBody"]',
        'div[role="button"][aria-controls="bookingPreferencesBody"]',
        "div.section-header:has(.pref-collapse-button)",
        'div.section-header:has([aria-controls="bookingPreferencesBody"])',
        "div.section-header:has(.section-title)",
        ".section-header:has(.pref-collapse-button)",
        ".section-header"
      ],
      otherPreferencesToggle: [
        'div.section-header[aria-controls="bookingPreferencesBody"]',
        'div[role="button"][aria-controls="bookingPreferencesBody"]',
        "div.section-header",
        "button.pref-collapse-button",
        'button[aria-controls="bookingPreferencesBody"]',
        'button[aria-label*="Toggle Other Preferences" i]',
        'button[aria-label*="Other Preferences" i]',
        ".pref-collapse-button"
      ],
      otherPreferencesBody: [
        "#bookingPreferencesBody",
        '[id="bookingPreferencesBody"]',
        ".pref-body",
        'div[aria-labelledby*="bookingPreferences"]'
      ],
      bookOnlyIfCnfCheckbox: [
        'p-checkbox[formcontrolname="bookOnlyIfCnf"]',
        'p-checkbox[name="confirmBerth"]',
        'input[name="confirmBerth"]'
      ],
      loyaltySection: ["app-loyalty-selection"],
      loyaltySkip: ["#lo-3", 'label[for="lo-3"]', 'input[name="loyalityOperationType"][value="3"]'],
      paymentSection: ["app-booking-payment-preferences"],
      paymentCards: ["#payment-option-0", 'input[name="payment"][value="3"]'],
      paymentUpi: ["#payment-option-1", 'input[name="payment"][value="2"]'],
      calculateFareBtn: ["button.btn-calc-fare", ".review-actions button.btn-calc-fare"],
      continueToPaymentBtn: ["button.btn-payment", ".cta-row button.btn-payment"],
      availabilityStatus: [".availability-status-group .available-count", ".availability-status-group .AVAILABLE"],
      reviewConfirmHost: ["app-book-now-confirmation"],
      reviewConfirmCard: ["app-book-now-confirmation .bc-card", ".bc-card"],
      reviewConfirmContinue: [".bc-btn-continue", "button.bc-btn-continue"],
      reviewConfirmTitle: [".bc-title"]
    },
    modals: {
      sessionRestoreHost: ["app-book-now-confirmation"],
      sessionRestoreOverlay: ["app-book-now-confirmation .bc-overlay", ".bc-overlay"],
      sessionRestoreCard: [".bc-card", "app-book-now-confirmation .bc-card"],
      sessionRestoreTitle: [".bc-title"],
      sessionRestoreMessage: [".bc-section-label"],
      tourSkipBtn: [".home-tour-actions .home-tour-skip", "button.home-tour-skip", ".home-tour-skip"]
    },
    payment: {
      bookingReviewBlock: [".booking-review-block"],
      excludeFromClone: [".payment-action-row", ".header-icon-btn", "button.btn-payment"],
      paymentWrapper: ["app-payment", ".payment-wrapper"],
      ipayClickToPay: ["button.ipay-qr-button"],
      ipayCard: [".ipay-card", ".payment-card.ipay-card"],
      bankCell: [".bank-cell"],
      bankCard: [".bank-card"],
      bankLogo: ["img.bank-logo"],
      payAndBookBtn: ["button.btn-payment", "button.btn.btn-payment"]
    },
    irctcIpayGateway: {
      paymentNavs: ["#paymentNavs", "#autoDebit"],
      autoDebitTab: ["#autoDebitLi"],
      debitRadio: ["#mandateDCOTM"],
      creditRadio: ["#mandateCCOTM"],
      upiMandateRadio: ["#mandateUPI"],
      upiMandatePanel: ["#upiMandate_wrapper", "#qrUpiZone_mndt"],
      upiTab: ["#upiLi"],
      upiPanel: ["#upiCC"],
      cardMandatePanel: ["#cardMandate_wrapper", "#cardNumLineForRed"],
      cardNumber: ["#cardNumLineForRed", "#mndtCardNo"],
      expiry: ["#paymentDate", "#mandateDate"],
      cvv: ["#cvvNumber", "#mandateCvv"],
      cardName: ["#cardName", "#mandateName"],
      cardFieldErrors: [
        "#mndtEmptyCardNo",
        "#mndtInvalidCardNo",
        "#mndtCardNotSupported",
        "#mndtRupayCardNo",
        "#mndtEmptyExpiry",
        "#mndtInvalidExpiry",
        "#mndtEmptyCvv",
        "#mndtInvalidCvv",
        "#mndtEmptyName",
        "#mndtInvalidName",
        "#emptyCardNo",
        "#invalidCardNo",
        "#emptyExpiry",
        "#invalidExpiry",
        "#emptyCvv",
        "#invalidCvv",
        "#emptyName",
        "#invalidName"
      ],
      autoDebitPayBtn: ["#confirm-purchase", "#autoDebitBtn"],
      qrTrigger: ["#PayByQrButton", "#PayByQrButton span"],
      autopayQrTrigger: ["#PayByQrButton_mndt", "#PayByQrButton_mndt span"],
      altCardNumber: ["#cardNumLineForRed"],
      altExpiry: ["#paymentDate"],
      altCvv: ["#cvvNumber"],
      altCardName: ["#cardName"],
      altPayBtn: ["#confirm-purchase"]
    },
    irctcPaymentsGateway: {
      cardAccordionBtn: ["#cardAccordionBtn", "button.accordion-button.explore-btn"],
      cardAccordionPanel: ["#collapseOne", "#cardAccordionBtn + .accordion-collapse"],
      cardForm: ["#inputForm", 'form[name="inputForm"]', "#collapseOne form"],
      cardNumberMasked: ["#cardNoMasked", 'input[name="cardNoMasked"]', '#collapseOne input[placeholder*="XXXX"]'],
      expiryMonth: ["#month", 'select[name="expiry-month1"]', '#collapseOne select[name*="month" i]'],
      expiryYear: ["#year", 'select[name="expiry-year1"]', '#collapseOne select[name*="year" i]'],
      cvv: ["#cvv", 'input[name="cvv"]'],
      nameOnCard: ["#nameOnCard", 'input[name="nameOnCard"]'],
      smartPayToggle: ["#cardSmartPayToggle", "#collapseOne #cardSmartPayToggle"],
      upiBhimAccordionBtn: ["#upiAccordionBtn", 'button[data-bs-target="#collapseUpi"]'],
      upiBhimAccordionPanel: ["#collapseUpi"],
      upiBhimQrRadio: ["#qr-click", 'input[data-click="toggleQR"]'],
      upiBhimQrSection: ["#show-qr-div", ".showQRDiv"],
      upiCcClAccordionBtn: ["#upiCcClAccordionBtn"],
      upiCcClAccordionPanel: ["#collapseCcCl", "#upiCcClAccordionBtn + .accordion-collapse"],
      upiCcClQrRadio: ["#qr-click-cccl"],
      upiCcClQrSection: ["#show-qr-div-cccl"],
      upiQrModal: [".modal.show", ".modal.fade.show", '[role="dialog"].show'],
      upiShowQrBtn: ["#irctc-generate-qr-btn", 'button[data-click="showUpiQR"]'],
      upiQrImage: ["#irctc-qr-code", "canvas", 'img[src*="qr" i]', ".qr-code img"],
      payNowBtn: ["button.pay-now-btn", ".pay-now-btn", "button.btn-primary"],
      cardErrors: ["#cardErrFld", "#cardMonthErr", "#cardYearErr", "#cardcvvFld", "#cardErrFld1"]
    },
    phonepeGateway: {
      paymentOptionsTitle: ["Payment Options"],
      upiInstrument: ["#upi-instrument", '[id*="upi-instrument"]'],
      cardInstrument: ["#card-instrument"],
      cardNumber: ["#card-number"],
      cardName: ["#card-name"],
      cardExpiry: ["#card-validity"],
      cardCvv: ["#card-cvv"],
      proceedBtn: ["#proceed-btn"],
      fieldErrorVisible: ["#input-error-text._show_1gbm9_37"],
      paymentOptionItem: ['[id$="-instrument"]', "._paymentOptionItemContainer_1cewd_1"],
      qrCode: ["canvas", 'img[alt*="QR" i]', 'img[src*="qr" i]']
    }
  };
  IRCTCExt.SELECTORS = IRCTCExt.EticketSelectors;
  window.IRCTCExt = window.IRCTCExt || {};
  IRCTCExt.Wait = {
    async delay(ms) {
      const step = 200;
      let elapsed = 0;
      while (elapsed < ms) {
        const control = await IRCTCExt.Bot?.checkControlState?.();
        if (control === "stopped") {
          const err = new Error("Booking stopped");
          err.code = "BOOKING_STOPPED";
          throw err;
        }
        if (control === "paused") {
          await IRCTCExt.Bot.waitUntilResumedOrStopped();
          if (!await IRCTCExt.Bot?.isRunning?.()) {
            const err = new Error("Booking stopped");
            err.code = "BOOKING_STOPPED";
            throw err;
          }
        }
        const slice = Math.min(step, ms - elapsed);
        await new Promise((resolve) => setTimeout(resolve, slice));
        elapsed += slice;
      }
    },
    queryOne(selectors, root = document, { visible = false } = {}) {
      if (visible) return IRCTCExt.Wait.queryVisibleOne(selectors, root);
      const list = Array.isArray(selectors) ? selectors : [selectors];
      for (const selector of list) {
        const el = root.querySelector(selector);
        if (el) return el;
      }
      return null;
    },
    queryVisibleOne(selectors, root = document) {
      const list = Array.isArray(selectors) ? selectors : [selectors];
      for (const selector of list) {
        const nodes = root.querySelectorAll(selector);
        for (const node of nodes) {
          if (IRCTCExt.Wait.isVisible(node)) return node;
        }
      }
      return null;
    },
    queryAll(selectors, root = document, { visible = false } = {}) {
      const list = Array.isArray(selectors) ? selectors : [selectors];
      for (const selector of list) {
        const nodes = root.querySelectorAll(selector);
        if (nodes.length) {
          const arr = Array.from(nodes);
          if (visible) {
            const vis = arr.filter((n) => IRCTCExt.Wait.isVisible(n));
            if (vis.length) return vis;
          } else {
            return arr;
          }
        }
      }
      return [];
    },
    async waitFor(selectors, { timeout = 15e3, root = document, visible = false } = {}) {
      const start = Date.now();
      while (Date.now() - start < timeout) {
        const el = visible ? IRCTCExt.Wait.queryVisibleOne(selectors, root) : IRCTCExt.Wait.queryOne(selectors, root);
        if (el) return el;
        await IRCTCExt.Wait.delay(100);
      }
      return null;
    },
    isVisible(el) {
      if (!el) return false;
      if (el.closest?.('.login-panel--inactive, [inert], .login-panel[aria-hidden="true"]')) {
        return false;
      }
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) {
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
      window.addEventListener("popstate", check);
      const interval = setInterval(check, 300);
      return () => {
        window.removeEventListener("popstate", check);
        clearInterval(interval);
      };
    },
    async poll(fn, { interval = 100, timeout = 15e3 } = {}) {
      const start = Date.now();
      while (Date.now() - start < timeout) {
        const control = await IRCTCExt.Bot?.checkControlState?.();
        if (control === "stopped") {
          const err = new Error("Booking stopped");
          err.code = "BOOKING_STOPPED";
          throw err;
        }
        if (control === "paused") {
          await IRCTCExt.Bot.waitUntilResumedOrStopped();
          if (!await IRCTCExt.Bot?.isRunning?.()) {
            const err = new Error("Booking stopped");
            err.code = "BOOKING_STOPPED";
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
      window.addEventListener("unhandledrejection", (event) => {
        const reason = event.reason;
        const message = reason?.message || reason?.name || String(reason || "");
        if (/pointer\s*lock|requestpointerlock|wrongdocumenterror/i.test(message)) {
          event.preventDefault();
        }
      });
    }
  };
  IRCTCExt.Wait.installIrctcNoiseFilter();
  window.IRCTCExt = window.IRCTCExt || {};
  IRCTCExt.Events = {
    mouseEventOpts(el) {
      const rect = el.getBoundingClientRect();
      const jitterX = rect.width > 6 ? (Math.random() - 0.5) * (rect.width * 0.4) : 0;
      const jitterY = rect.height > 6 ? (Math.random() - 0.5) * (rect.height * 0.4) : 0;
      const clientX = Math.round(rect.left + rect.width / 2 + jitterX);
      const clientY = Math.round(rect.top + rect.height / 2 + jitterY);
      const screenX = (window.screenX || 0) + clientX;
      const screenY = (window.screenY || 0) + clientY;
      return {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX,
        clientY,
        screenX,
        screenY,
        buttons: 1
      };
    },
    clickWithMouse(el) {
      if (!el) return;
      el.scrollIntoView({ block: "nearest", inline: "nearest" });
      const opts = IRCTCExt.Events.mouseEventOpts(el);
      el.dispatchEvent(new MouseEvent("mousedown", opts));
      el.dispatchEvent(new MouseEvent("mouseup", opts));
      el.dispatchEvent(new MouseEvent("click", opts));
    },
    clickPrimeDropdownItem(option) {
      if (!option) return false;
      const li = option.matches?.('li[role="option"], li.ui-dropdown-item') ? option : option.closest?.('li[role="option"], li.ui-dropdown-item');
      const span = li?.querySelector("span") || option.querySelector?.("span");
      const host = li?.closest?.("p-dropdownitem") || option.closest?.("p-dropdownitem");
      const targets = [li, span, host, option].filter(Boolean);
      for (const target of targets) {
        target.scrollIntoView({ block: "nearest", inline: "nearest" });
        const opts = IRCTCExt.Events.mouseEventOpts(target);
        target.dispatchEvent(new MouseEvent("mousedown", opts));
        target.dispatchEvent(new MouseEvent("mouseup", opts));
        target.dispatchEvent(new MouseEvent("click", opts));
      }
      return true;
    },
    click(el) {
      if (!el) return;
      el.scrollIntoView({ block: "center", inline: "nearest" });
      const opts = IRCTCExt.Events.mouseEventOpts(el);
      try {
        window.dispatchEvent(new MouseEvent("mousemove", opts));
        el.dispatchEvent(new MouseEvent("mousemove", opts));
        el.dispatchEvent(new MouseEvent("mouseover", opts));
        el.dispatchEvent(new MouseEvent("mousedown", opts));
        el.dispatchEvent(new MouseEvent("mouseup", { ...opts, buttons: 0 }));
      } catch (_) {
      }
      if (typeof el.click === "function") {
        el.click();
        return;
      }
      try {
        el.dispatchEvent(new MouseEvent("click", { ...opts, buttons: 0 }));
      } catch (_) {
      }
    },
    setNativeValue(el, value) {
      if (!el) return;
      let proto = HTMLInputElement.prototype;
      if (el instanceof HTMLTextAreaElement) proto = HTMLTextAreaElement.prototype;
      else if (el instanceof HTMLSelectElement) proto = HTMLSelectElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
      if (setter) setter.call(el, value);
      else el.value = value;
    },
    setInputValue(el, value, { blur = true } = {}) {
      if (!el) return;
      el.focus();
      IRCTCExt.Events.setNativeValue(el, value);
      el.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: true, data: value, inputType: "insertFromPaste" }));
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      if (blur) el.dispatchEvent(new Event("blur", { bubbles: true }));
    },
    keyCodeFor(key) {
      const map = {
        Enter: "Enter",
        Home: "Home",
        ArrowDown: "ArrowDown",
        ArrowUp: "ArrowUp",
        Escape: "Escape",
        Tab: "Tab",
        " ": "Space"
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
      IRCTCExt.Events.keyEvent(el, "keydown", key);
      IRCTCExt.Events.keyEvent(el, "keyup", key);
    },
    async typeSlowly(el, text, delayMs = 80) {
      if (!el) return;
      el.focus();
      IRCTCExt.Events.setNativeValue(el, "");
      el.dispatchEvent(new InputEvent("input", { bubbles: true, data: "", inputType: "deleteContentBackward" }));
      el.dispatchEvent(new Event("input", { bubbles: true }));
      for (const ch of String(text)) {
        IRCTCExt.Events.keyEvent(el, "keydown", ch);
        IRCTCExt.Events.keyEvent(el, "keypress", ch);
        IRCTCExt.Events.setNativeValue(el, el.value + ch);
        el.dispatchEvent(new InputEvent("input", { bubbles: true, data: ch, inputType: "insertText" }));
        el.dispatchEvent(new Event("input", { bubbles: true }));
        IRCTCExt.Events.keyEvent(el, "keyup", ch);
        await IRCTCExt.Wait.delay(delayMs);
      }
      el.dispatchEvent(new Event("change", { bubbles: true }));
    },
    openFieldBox(fieldBox) {
      if (!fieldBox) return;
      fieldBox.scrollIntoView({ block: "center", inline: "nearest" });
      fieldBox.focus();
      IRCTCExt.Events.click(fieldBox);
      if (fieldBox.getAttribute("aria-expanded") !== "true") {
        const inner = fieldBox.querySelector(".field-inner");
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
      const fromPanels = visiblePanels.flatMap(
        (panel) => Array.from(panel.querySelectorAll(".custom-option")).filter((opt) => IRCTCExt.Wait.isVisible(opt))
      );
      if (fromPanels.length) return fromPanels;
      return IRCTCExt.Wait.queryAll(IRCTCExt.SELECTORS.customStationOptions).filter(
        (opt) => IRCTCExt.Wait.isVisible(opt)
      );
    },
    optionMatches(el, text) {
      const needle = String(text).trim().toLowerCase();
      if (!needle) return false;
      const name = el.querySelector(".option-name")?.textContent?.trim().toLowerCase() || "";
      const code = el.querySelector(".option-code")?.textContent?.trim().toLowerCase() || "";
      const full = (el.textContent || "").trim().toLowerCase();
      return name.includes(needle) || code.includes(needle) || full.includes(needle) || needle.includes(code) || needle.includes(name);
    },
    async pickCustomOption(panelSelector, text, { requireMatch = false, getOptions } = {}) {
      const options = await IRCTCExt.Wait.poll(
        () => {
          const list = getOptions ? getOptions() : IRCTCExt.Wait.queryAll(panelSelector).filter((opt) => IRCTCExt.Wait.isVisible(opt));
          return list.length ? list : null;
        },
        { timeout: 8e3, interval: 150 }
      );
      if (!options?.length) return false;
      const match = options.find((opt) => IRCTCExt.Events.optionMatches(opt, text)) || options.find(
        (opt) => (opt.textContent || "").toLowerCase().includes(String(text).toLowerCase().slice(0, 3))
      );
      if (requireMatch && !match) return false;
      const chosen = match || options[0];
      IRCTCExt.Events.click(chosen);
      await IRCTCExt.Wait.delay(300);
      return true;
    },
    stationAlreadySelected(fieldBox, text) {
      const placeholder = fieldBox?.querySelector(".select-placeholder");
      if (!placeholder?.classList.contains("has-value")) return false;
      const shown = IRCTCExt.Stations.normalizeStationText(placeholder.textContent);
      const needles = IRCTCExt.Stations.stationSearchTerms(text).map(
        (term) => IRCTCExt.Stations.normalizeStationText(term)
      );
      return needles.some(
        (needle) => needle.length >= 2 && (shown.includes(needle) || needle.includes(shown.split("|")[0]?.trim() || shown))
      );
    },
    findStationInput(fieldBox) {
      const local = fieldBox?.querySelector("input, textarea, .field-input");
      if (local && IRCTCExt.Wait.isVisible(local)) return local;
      if (fieldBox?.getAttribute("aria-expanded") === "true") {
        const expandedInput = fieldBox.querySelector("input, textarea, .field-input");
        if (expandedInput && IRCTCExt.Wait.isVisible(expandedInput)) return expandedInput;
      }
      const panels = IRCTCExt.Wait.queryAll(IRCTCExt.SELECTORS.customStationPanel);
      const visiblePanel = panels.find((panel) => IRCTCExt.Wait.isVisible(panel));
      if (visiblePanel) {
        const panelInput = visiblePanel.querySelector(".station-search-input, input, textarea, .field-input");
        if (panelInput && IRCTCExt.Wait.isVisible(panelInput)) return panelInput;
      }
      const all = IRCTCExt.Wait.queryAll(IRCTCExt.SELECTORS.stationSearchInput);
      return all.find((el) => IRCTCExt.Wait.isVisible(el) && !el.closest(".login-form, #newLogin")) || null;
    },
    async waitForFieldExpanded(fieldBox, timeout = 5e3) {
      return IRCTCExt.Wait.poll(
        () => fieldBox?.getAttribute("aria-expanded") === "true" ? true : null,
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
        fieldBox?.querySelector(".select-placeholder")?.textContent
      );
      const target = IRCTCExt.Stations.normalizeQuota(quota);
      return shown === target;
    },
    quotaOptionMatches(el, quota) {
      const text = IRCTCExt.Stations.normalizeQuota(el?.textContent);
      const target = IRCTCExt.Stations.normalizeQuota(quota);
      if (!text || !target) return false;
      if (target === "TATKAL") return text === "TATKAL";
      if (target === "GENERAL") return text === "GENERAL";
      if (target === "LADIES") return text === "LADIES";
      return text === target || text.includes(target);
    },
    async pickQuotaOption(quota) {
      const targetText = IRCTCExt.Stations.quotaOptionText(quota);
      const options = await IRCTCExt.Wait.poll(
        () => {
          const list = IRCTCExt.Wait.queryAll(IRCTCExt.SELECTORS.customQuotaOptions);
          return list.length ? list : null;
        },
        { timeout: 8e3, interval: 150 }
      );
      if (!options?.length) return false;
      const match = options.find((opt) => IRCTCExt.Events.quotaOptionMatches(opt, quota)) || options.find(
        (opt) => IRCTCExt.Stations.normalizeQuota(opt.textContent) === IRCTCExt.Stations.normalizeQuota(targetText)
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
        () => fieldBox.getAttribute("aria-expanded") === "true" ? true : null,
        { timeout: 3e3, interval: 100 }
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
      await IRCTCExt.Events.waitForFieldExpanded(fieldBox, 5e3);
      await IRCTCExt.Wait.delay(250);
      const input = await IRCTCExt.Wait.poll(() => IRCTCExt.Events.findStationInput(fieldBox), {
        timeout: 8e3,
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
      if (input.matches?.("div.field-box") || input.classList?.contains("field-box")) {
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
      const trigger = await IRCTCExt.Wait.waitFor(triggerSelectors, { timeout: 5e3 });
      if (!trigger) return false;
      IRCTCExt.Events.click(trigger);
      await IRCTCExt.Wait.delay(400);
      return IRCTCExt.Events.pickCustomOption(IRCTCExt.SELECTORS.dropdownPanel, labelText);
    },
    parseDdMmYyyy(dateStr) {
      const parts = String(dateStr).split("/");
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
      const panel = await IRCTCExt.Wait.waitFor(IRCTCExt.SELECTORS.calendarPanel, { timeout: 5e3, visible: true });
      if (!panel) return false;
      const monthNames = [
        "january",
        "february",
        "march",
        "april",
        "may",
        "june",
        "july",
        "august",
        "september",
        "october",
        "november",
        "december"
      ];
      for (let i = 0; i < 24; i += 1) {
        const title = (panel.querySelector(".ui-datepicker-title")?.textContent || "").toLowerCase();
        const monthOk = title.includes(monthNames[parsed.month]);
        const yearOk = title.includes(String(parsed.year));
        if (monthOk && yearOk) break;
        const titleDate = new Date(parsed.year, parsed.month, 1);
        const shownYear = Number((title.match(/\d{4}/) || [])[0]);
        const shownMonth = monthNames.findIndex((m) => title.includes(m));
        const goNext = Number.isNaN(shownYear) || shownMonth < 0 ? true : new Date(shownYear, shownMonth, 1) < titleDate;
        const nav = panel.querySelector(goNext ? ".ui-datepicker-next" : ".ui-datepicker-prev");
        if (!nav) break;
        IRCTCExt.Events.click(nav);
        await IRCTCExt.Wait.delay(200);
      }
      const day = String(parsed.day);
      const cells = Array.from(
        panel.querySelectorAll(".ui-datepicker-calendar td a, .ui-datepicker-calendar td span, .p-datepicker-calendar td span")
      ).filter((c) => !c.closest("td")?.classList.contains("ui-datepicker-other-month"));
      const cell = cells.find((c) => c.textContent.trim() === day);
      if (!cell) return false;
      IRCTCExt.Events.click(cell);
      await IRCTCExt.Wait.delay(200);
      return true;
    },
    async setCalendarDate(input, dateStr) {
      if (!input || !dateStr) return false;
      if (input.matches?.("div.field-box") || input.classList?.contains("field-box")) {
        IRCTCExt.Events.openFieldBox(input);
        await IRCTCExt.Wait.delay(250);
        return IRCTCExt.Events.pickCustomCalendarDate(dateStr);
      }
      IRCTCExt.Events.setInputValue(input, dateStr);
      await IRCTCExt.Wait.delay(200);
      IRCTCExt.Events.click(input);
      await IRCTCExt.Wait.delay(300);
      const parts = dateStr.split("/");
      if (parts.length === 3) {
        const day = String(parseInt(parts[0], 10));
        const cells = Array.from(document.querySelectorAll(".ui-datepicker-calendar td a, .p-datepicker-calendar td span"));
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
  window.IRCTCExt = window.IRCTCExt || {};
  IRCTCExt.BkgPayment = {
    normalizeProviderName(name) {
      return String(name || "").trim().toLowerCase();
    },
    isIpayProvider(providerName) {
      const normalized = IRCTCExt.BkgPayment.normalizeProviderName(providerName);
      return normalized === "irctc ipay" || normalized === "ipay";
    },
    getPaymentProvider(config) {
      const method = config.preferences?.paymentMethod || "cards";
      if (method === "upi") {
        return config.preferences?.upiProvider || "IRCTC iPay";
      }
      if (method === "cards") {
        return config.preferences?.cardsProvider || "PhonePe";
      }
      return "IRCTC iPay";
    },
    clickTarget(el) {
      if (!el) return;
      el.scrollIntoView({ block: "center", inline: "nearest" });
      IRCTCExt.Events.click(el);
    },
    getBankCellLabel(cell) {
      const span = cell.querySelector("span");
      const logo = cell.querySelector("img.bank-logo");
      return (span?.textContent || logo?.getAttribute("alt") || "").trim();
    },
    isProviderSelected(cell) {
      if (!cell) return false;
      const sel = IRCTCExt.SELECTORS.payment;
      const card = cell.querySelector(sel.bankCard?.[0] || ".bank-card");
      if (card?.classList.contains("bank-selected")) return true;
      if (cell.classList.contains("bank-selected")) return true;
      return false;
    },
    getBankCellClickTargets(cell) {
      const sel = IRCTCExt.SELECTORS.payment;
      const targets = [cell];
      const card = cell.querySelector(sel.bankCard?.[0] || ".bank-card");
      const logo = cell.querySelector(sel.bankLogo?.[0] || "img.bank-logo");
      const label = cell.querySelector("span");
      if (card) targets.push(card);
      if (logo) targets.push(logo);
      if (label) targets.push(label);
      return targets;
    },
    findBankCell(providerName) {
      const target = IRCTCExt.BkgPayment.normalizeProviderName(providerName);
      if (!target) return null;
      const sel = IRCTCExt.SELECTORS.payment;
      const cells = document.querySelectorAll(sel.bankCell?.[0] || ".bank-cell");
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
      return !!card?.classList.contains("bank-selected");
    },
    async ensureIpayCardSelected(maxAttempts = 6) {
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        if (IRCTCExt.BkgPayment.isIpayCardSelected()) return true;
        const card = IRCTCExt.BkgPayment.findIpayCard();
        if (!card) throw new Error("IRCTC iPay card not found");
        IRCTCExt.BkgPayment.clickTarget(card);
        await IRCTCExt.Wait.delay(350);
      }
      if (!IRCTCExt.BkgPayment.isIpayCardSelected()) {
        throw new Error("Could not select IRCTC iPay card");
      }
      return true;
    },
    findIpayClickToPayButton() {
      const sel = IRCTCExt.SELECTORS.payment;
      const buttons = document.querySelectorAll(sel.ipayClickToPay?.[0] || "button.ipay-qr-button");
      for (const btn of buttons) {
        if (IRCTCExt.Wait.isVisible(btn) && /click\s*to\s*pay/i.test(btn.textContent || "")) {
          return btn;
        }
      }
      return null;
    },
    async clickIpay(overlay) {
      const sel = IRCTCExt.SELECTORS.payment;
      overlay?.setStatus("Selecting IRCTC iPay...");
      await IRCTCExt.Wait.waitFor(sel.paymentWrapper, { timeout: 15e3, visible: true });
      await IRCTCExt.BkgPayment.ensureIpayCardSelected();
      const clickBtn = await IRCTCExt.Wait.poll(
        () => IRCTCExt.BkgPayment.findIpayClickToPayButton(),
        { timeout: 15e3, interval: 200 }
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
        timeout: 15e3,
        visible: true
      });
      const cell = await IRCTCExt.Wait.poll(
        () => IRCTCExt.BkgPayment.findBankCell(providerName),
        { timeout: 15e3, interval: 200 }
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
      if (btn.classList.contains("disabled")) return false;
      if (btn.getAttribute("aria-disabled") === "true") return false;
      return IRCTCExt.Wait.isVisible(btn);
    },
    findPayAndBookButton(root = document) {
      const sel = IRCTCExt.SELECTORS.payment;
      const roots = [
        root.querySelector(sel.paymentWrapper?.[0] || "app-payment"),
        root.querySelector(".payment-wrapper"),
        root
      ].filter(Boolean);
      for (const searchRoot of roots) {
        const buttons = searchRoot.querySelectorAll(sel.payAndBookBtn?.[0] || "button.btn-payment");
        for (const btn of buttons) {
          if (IRCTCExt.BkgPayment.isPayAndBookEnabled(btn) && /pay\s*&\s*book/i.test(btn.textContent || "")) {
            return btn;
          }
        }
      }
      const fallbackButtons = root.querySelectorAll("button.btn-payment, button.btn.btn-payment");
      for (const btn of fallbackButtons) {
        if (IRCTCExt.BkgPayment.isPayAndBookEnabled(btn) && /pay\s*&\s*book/i.test(btn.textContent || "")) {
          return btn;
        }
      }
      return null;
    },
    async clickPayAndBook(overlay) {
      overlay?.setStatus("Clicking Pay & Book...");
      const payBtn = await IRCTCExt.Wait.poll(
        () => IRCTCExt.BkgPayment.findPayAndBookButton(document),
        { timeout: 15e3, interval: 200 }
      );
      if (!payBtn) throw new Error("Pay & Book button not found");
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
      overlay?.setStatus("Pay & Book clicked. Complete payment on gateway.");
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
        paymentPhase: "gateway",
        paymentGateway: IRCTCExt.BkgPayment.isIpayProvider(provider) ? "irctcIpay" : provider,
        awaitingGateway: true
      });
      overlay?.setStatus("Clicking Pay & Book...");
      await IRCTCExt.BkgPayment.clickPayAndBook(overlay);
      overlay?.setStatus("Redirecting to payment gateway...");
      return {
        awaitingGateway: true,
        gateway: IRCTCExt.BkgPayment.isIpayProvider(provider) ? "irctcIpay" : provider
      };
    },
    getAutoPaySettings(config) {
      const prefs = config.preferences || {};
      const type = prefs.autoPayType || "debit";
      return {
        enabled: !!prefs.autoPayEnabled,
        type,
        card: type === "credit" ? prefs.creditCard : type === "debit" ? prefs.debitCard : null
      };
    },
    async selectPaymentProvider(config, overlay) {
      const method = config.preferences?.paymentMethod || "cards";
      if (method === "upi") return IRCTCExt.BkgPayment.handleUpiPayment(config, overlay);
      return IRCTCExt.BkgPayment.handleCardsPayment(config, overlay);
    }
  };
  window.IRCTCExt = window.IRCTCExt || {};
  IRCTCExt.IrctcIpayGateway = {
    formatExpiry(expiry) {
      const raw = String(expiry || "").trim();
      if (!raw) return "";
      if (/^\d{2}\/\d{2}$/.test(raw)) return raw;
      const slash = raw.match(/^(\d{1,2})\/(\d{2,4})$/);
      if (slash) {
        const mm = slash[1].padStart(2, "0");
        const yy = slash[2].length === 4 ? slash[2].slice(-2) : slash[2];
        return `${mm}/${yy}`;
      }
      const digits = raw.replace(/\D/g, "");
      if (digits.length >= 4) {
        return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
      }
      return raw;
    },
    async waitForGatewayReady() {
      const sel = IRCTCExt.SELECTORS.irctcIpayGateway;
      const ready = await IRCTCExt.Wait.waitFor(sel.paymentNavs, { timeout: 2e4, visible: true });
      if (!ready) throw new Error("IRCTC iPay gateway did not load");
      await IRCTCExt.Wait.delay(300);
    },
    async finishGateway(overlay, message) {
      await IRCTCExt.Storage.updateState({
        paymentDone: true,
        paymentPhase: null,
        awaitingGateway: false,
        paymentGateway: null,
        status: "done",
        running: false,
        currentStep: "done"
      });
      overlay?.setStep("Payment");
      overlay?.setStatus(message);
      overlay?.showPause(message);
    },
    autoPayRadioLabel(type) {
      if (type === "credit") return "Credit Card";
      if (type === "qr") return "UPI";
      return "Debit Card";
    },
    autoPayRadioSelectors(type) {
      const sel = IRCTCExt.SELECTORS.irctcIpayGateway;
      if (type === "credit") return sel.creditRadio;
      if (type === "qr") return sel.upiMandateRadio;
      return sel.debitRadio;
    },
    async ensureAutopayTabActive() {
      const sel = IRCTCExt.SELECTORS.irctcIpayGateway;
      const tab = IRCTCExt.Wait.queryOne(sel.autoDebitTab);
      if (!tab) return;
      if (!tab.classList.contains("activeLi")) {
        IRCTCExt.Events.click(tab);
        await IRCTCExt.Wait.delay(350);
      }
      await IRCTCExt.Wait.waitFor(sel.paymentNavs, { timeout: 5e3, visible: true });
    },
    async selectAutoPayRadio(type) {
      const normalized = type === "upi" ? "qr" : type;
      const label = IRCTCExt.IrctcIpayGateway.autoPayRadioLabel(normalized);
      const selectors = IRCTCExt.IrctcIpayGateway.autoPayRadioSelectors(normalized);
      await IRCTCExt.IrctcIpayGateway.ensureAutopayTabActive();
      const radio = await IRCTCExt.Wait.waitFor(selectors, { timeout: 8e3, visible: true });
      if (!radio) throw new Error(`${label} auto pay option not found on gateway`);
      if (!radio.checked) {
        IRCTCExt.Events.click(radio);
        await IRCTCExt.Wait.delay(400);
      }
      if (!radio.checked) {
        const labelEl = radio.closest("label");
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
          number: ["#mndtCardNo"],
          expiry: ["#mandateDate"],
          cvv: ["#mandateCvv"],
          name: ["#mandateName"],
          payBtn: ["#autoDebitBtn"]
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
      throw new Error("Card fields not found on IRCTC iPay gateway");
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
        { timeout: 8e3, interval: 150 }
      );
      if (!fields) throw new Error("Card form not visible on IRCTC iPay gateway");
      return fields;
    },
    fieldHasInputError(el) {
      if (!el || !IRCTCExt.Wait.isVisible(el)) return true;
      if (el.classList.contains("redLine")) return true;
      return !String(el.value || "").trim();
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
        const panel = fields.numberEl?.closest(".cardNumValiWrapper, .cardNumUiNew, .mndt_wrapper, form") || fields.numberEl?.parentElement;
        if (panel) {
          for (const err of panel.querySelectorAll(".text-danger1")) {
            if (IRCTCExt.Wait.isVisible(err)) return true;
          }
        }
      }
      return false;
    },
    async clearGatewayInput(el) {
      if (!el) return;
      el.focus();
      IRCTCExt.Events.setNativeValue(el, "");
      el.dispatchEvent(
        new InputEvent("input", { bubbles: true, data: "", inputType: "deleteContentBackward" })
      );
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("keyup", { bubbles: true }));
      el.dispatchEvent(new Event("focusout", { bubbles: true }));
      el.dispatchEvent(new Event("blur", { bubbles: true }));
      await IRCTCExt.Wait.delay(200);
    },
    async fillGatewayInput(el, value, { slow = false } = {}) {
      if (!el) return;
      await IRCTCExt.IrctcIpayGateway.clearGatewayInput(el);
      const text = String(value || "");
      if (slow) {
        await IRCTCExt.Events.typeSlowly(el, text, 40);
      } else {
        IRCTCExt.Events.setInputValue(el, text, { blur: false });
        el.dispatchEvent(new Event("keyup", { bubbles: true }));
        el.dispatchEvent(new Event("focusout", { bubbles: true }));
        el.dispatchEvent(new Event("blur", { bubbles: true }));
      }
      await IRCTCExt.Wait.delay(150);
    },
    cardNumberLooksValid(el, expectedDigits) {
      if (!el) return false;
      const digits = String(el.value || "").replace(/\D/g, "");
      const expected = String(expectedDigits || "").replace(/\D/g, "");
      if (digits.length < 12) return false;
      if (expected && digits !== expected) return false;
      if (el.classList.contains("redLine")) return false;
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
      throw new Error("Could not enter card number on IRCTC iPay gateway");
    },
    async clearCardFields(fields) {
      const resolved = fields || IRCTCExt.IrctcIpayGateway.resolveCardFields();
      for (const el of [resolved.numberEl, resolved.expiryEl, resolved.cvvEl, resolved.nameEl]) {
        await IRCTCExt.IrctcIpayGateway.clearGatewayInput(el);
      }
    },
    async fillCardFields(card) {
      const fields = IRCTCExt.IrctcIpayGateway.resolveCardFields();
      const cardNumber = String(card?.number || "").replace(/\s+/g, "");
      const expiryDigits = IRCTCExt.IrctcIpayGateway.formatExpiry(card?.expiry).replace(/\D/g, "");
      await IRCTCExt.IrctcIpayGateway.fillCardNumberWithRetry(fields.numberEl, cardNumber);
      await IRCTCExt.IrctcIpayGateway.fillGatewayInput(fields.expiryEl, expiryDigits, { slow: true });
      await IRCTCExt.IrctcIpayGateway.fillGatewayInput(fields.cvvEl, card?.cvv || "");
      await IRCTCExt.IrctcIpayGateway.fillGatewayInput(fields.nameEl, card?.name || "");
      return fields;
    },
    async waitForCardFormValid(fields) {
      const resolved = fields || IRCTCExt.IrctcIpayGateway.resolveCardFields();
      const ok = await IRCTCExt.Wait.poll(
        () => {
          if (IRCTCExt.IrctcIpayGateway.hasVisibleCardFieldError(resolved)) return false;
          const payBtn = resolved.payBtn || IRCTCExt.IrctcIpayGateway.findVisibleField(IRCTCExt.SELECTORS.irctcIpayGateway.autoDebitPayBtn);
          if (!payBtn || !IRCTCExt.Wait.isVisible(payBtn)) return false;
          if (payBtn.disabled) return false;
          return true;
        },
        { timeout: 5e3, interval: 150 }
      );
      if (!ok) {
        throw new Error("Gateway rejected saved card details \u2014 check card number, expiry, CVV, and name");
      }
      return resolved;
    },
    async fillAutopayCard(overlay, card, type) {
      const label = type === "credit" ? "credit" : "debit";
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
          overlay?.setStatus("Validating card details...");
          fields = await IRCTCExt.IrctcIpayGateway.waitForCardFormValid(fields);
          const payBtn = fields.payBtn || IRCTCExt.IrctcIpayGateway.findVisibleField(IRCTCExt.SELECTORS.irctcIpayGateway.autoDebitPayBtn);
          if (!payBtn) throw new Error("Pay button not found on IRCTC iPay gateway");
          overlay?.setStatus("Submitting card payment...");
          IRCTCExt.Events.click(payBtn);
          await IRCTCExt.Wait.delay(500);
          await IRCTCExt.IrctcIpayGateway.finishGateway(
            overlay,
            "Card submitted \u2014 complete OTP/bank step manually."
          );
          return;
        } catch (err) {
          lastError = err;
          if (attempt >= maxAttempts) break;
        }
      }
      throw lastError || new Error("Gateway rejected saved card details \u2014 check card number, expiry, CVV, and name");
    },
    async clickQrTrigger(selectors) {
      const qrBtn = await IRCTCExt.Wait.poll(
        () => {
          const btn = IRCTCExt.Wait.queryOne(selectors);
          return btn && IRCTCExt.Wait.isVisible(btn) ? btn : null;
        },
        { timeout: 8e3, interval: 150 }
      );
      if (!qrBtn) return null;
      IRCTCExt.Events.click(qrBtn);
      await IRCTCExt.Wait.delay(500);
      return qrBtn;
    },
    async handleQrFlow(overlay) {
      const sel = IRCTCExt.SELECTORS.irctcIpayGateway;
      overlay?.setStatus("Selecting UPI auto pay type...");
      await IRCTCExt.IrctcIpayGateway.selectAutoPayRadio("qr");
      await IRCTCExt.Wait.waitFor(sel.upiMandatePanel, { timeout: 8e3, visible: true });
      overlay?.setStatus("Opening UPI QR on IRCTC iPay...");
      let clicked = await IRCTCExt.IrctcIpayGateway.clickQrTrigger(sel.autopayQrTrigger);
      if (!clicked) {
        const upiTab = IRCTCExt.Wait.queryOne(sel.upiTab);
        if (upiTab && IRCTCExt.Wait.isVisible(upiTab)) {
          IRCTCExt.Events.click(upiTab);
          await IRCTCExt.Wait.delay(400);
          await IRCTCExt.Wait.waitFor(sel.upiPanel, { timeout: 8e3, visible: true });
          clicked = await IRCTCExt.IrctcIpayGateway.clickQrTrigger(sel.qrTrigger);
        }
      }
      if (!clicked) throw new Error("QR pay button not found on IRCTC iPay gateway");
      await IRCTCExt.IrctcIpayGateway.finishGateway(overlay, "QR ready \u2014 scan and pay manually.");
    },
    async handle(config, overlay) {
      await IRCTCExt.IrctcIpayGateway.waitForGatewayReady();
      const autoPay = IRCTCExt.BkgPayment.getAutoPaySettings(config);
      if (!autoPay.enabled) {
        await IRCTCExt.IrctcIpayGateway.finishGateway(
          overlay,
          "Auto pay disabled \u2014 complete payment manually on gateway."
        );
        return true;
      }
      if (autoPay.type === "qr") {
        return IRCTCExt.IrctcIpayGateway.handleQrFlow(overlay);
      }
      if (autoPay.type === "credit" || autoPay.type === "debit") {
        if (!autoPay.card?.number) {
          throw new Error(`Saved ${autoPay.type} card details are missing in extension popup`);
        }
        return IRCTCExt.IrctcIpayGateway.fillAutopayCard(overlay, autoPay.card, autoPay.type);
      }
      throw new Error(`Unsupported auto pay type: ${autoPay.type}`);
    }
  };
  window.IRCTCExt = window.IRCTCExt || {};
  IRCTCExt.IrctcPaymentsGateway = {
    getSelectors() {
      return IRCTCExt.SELECTORS?.irctcPaymentsGateway || {};
    },
    async finishGateway(overlay, message) {
      await IRCTCExt.Storage.updateState({
        paymentDone: true,
        paymentPhase: null,
        awaitingGateway: false,
        paymentGateway: null,
        status: "done",
        running: false,
        currentStep: "done"
      });
      overlay?.setStep("Payment");
      overlay?.setStatus(message);
      overlay?.showPause(message);
    },
    isAuthRedirectPage() {
      return !!(IRCTCExt.NgetPaths?.isGatewayAuthRedirectPath?.() || location.pathname.includes("/authRedirect"));
    },
    resolveUpiVariant(config) {
      const method = config?.state?.gatewayPaymentMethod || config?.preferences?.paymentMethod || "cards";
      if (method === "upi") return "bhim";
      if (IRCTCExt.Wait.queryOne(IRCTCExt.IrctcPaymentsGateway.getSelectors().upiBhimAccordionBtn)) {
        return "bhim";
      }
      if (IRCTCExt.Wait.queryOne(IRCTCExt.IrctcPaymentsGateway.getSelectors().upiCcClAccordionBtn)) {
        return "cccl";
      }
      if (document.querySelector("#show-qr-div #qr-click")) return "bhim";
      return "cccl";
    },
    getUpiSelectors(variant) {
      const sel = IRCTCExt.IrctcPaymentsGateway.getSelectors();
      if (variant === "bhim") {
        return {
          accordionBtn: sel.upiBhimAccordionBtn,
          accordionPanel: sel.upiBhimAccordionPanel,
          qrRadio: sel.upiBhimQrRadio,
          qrSection: sel.upiBhimQrSection
        };
      }
      return {
        accordionBtn: sel.upiCcClAccordionBtn,
        accordionPanel: sel.upiCcClAccordionPanel,
        qrRadio: sel.upiCcClQrRadio,
        qrSection: sel.upiCcClQrSection
      };
    },
    isUpiQrSectionVisible(upiSel) {
      const section = IRCTCExt.Wait.queryOne(upiSel.qrSection);
      if (!section || !IRCTCExt.Wait.isVisible(section)) return false;
      const radio = IRCTCExt.Wait.queryOne(upiSel.qrRadio, section);
      return !!(radio && IRCTCExt.Wait.isVisible(radio));
    },
    isUpiAccordionOpen(upiSel) {
      const btn = IRCTCExt.Wait.queryOne(upiSel.accordionBtn);
      const panel = IRCTCExt.Wait.queryOne(upiSel.accordionPanel);
      if (btn?.getAttribute("aria-expanded") === "true") return true;
      if (panel?.classList?.contains("show")) return true;
      return IRCTCExt.IrctcPaymentsGateway.isUpiQrSectionVisible(upiSel);
    },
    async waitForReady(overlay) {
      const sel = IRCTCExt.IrctcPaymentsGateway.getSelectors();
      const onAuthRedirect = IRCTCExt.IrctcPaymentsGateway.isAuthRedirectPage();
      const timeout = onAuthRedirect ? 9e4 : 3e4;
      if (onAuthRedirect) {
        overlay?.setStatus?.("Payment gateway loading \u2014 waiting for card/UPI form...");
      }
      const ready = await IRCTCExt.Wait.poll(
        () => {
          const cardAccordion = IRCTCExt.Wait.queryOne(sel.cardAccordionBtn);
          const bhimAccordion = IRCTCExt.Wait.queryOne(sel.upiBhimAccordionBtn);
          const ccclAccordion = IRCTCExt.Wait.queryOne(sel.upiCcClAccordionBtn);
          if (cardAccordion && IRCTCExt.Wait.isVisible(cardAccordion)) return cardAccordion;
          if (bhimAccordion && IRCTCExt.Wait.isVisible(bhimAccordion)) return bhimAccordion;
          if (ccclAccordion && IRCTCExt.Wait.isVisible(ccclAccordion)) return ccclAccordion;
          return null;
        },
        { timeout, interval: 250 }
      );
      if (!ready) throw new Error("IRCTC Payments gateway did not load");
      overlay?.setStatus?.("Payment form ready \u2014 continuing automation...");
      await IRCTCExt.Wait.delay(300);
      return ready;
    },
    parseExpiryParts(expiry) {
      const raw = String(expiry || "").trim();
      const slash = raw.match(/^(\d{1,2})\s*\/\s*(\d{2,4})$/);
      if (slash) {
        const month = slash[1].padStart(2, "0");
        const year = slash[2].length === 4 ? slash[2] : `20${slash[2]}`;
        return { month, year };
      }
      const digits = raw.replace(/\D/g, "");
      if (digits.length >= 4) {
        const month = digits.slice(0, 2).padStart(2, "0");
        const yy = digits.slice(2, 4);
        return { month, year: `20${yy}` };
      }
      return { month: "", year: "" };
    },
    async clearGatewayInput(el) {
      if (!el) return;
      el.focus();
      IRCTCExt.Events.setNativeValue(el, "");
      el.dispatchEvent(new InputEvent("input", { bubbles: true, data: "", inputType: "deleteContentBackward" }));
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("keyup", { bubbles: true }));
      el.dispatchEvent(new Event("focusout", { bubbles: true }));
      el.dispatchEvent(new Event("blur", { bubbles: true }));
      await IRCTCExt.Wait.delay(150);
    },
    async fillGatewayInput(el, value, { slow = false } = {}) {
      if (!el) return;
      await IRCTCExt.IrctcPaymentsGateway.clearGatewayInput(el);
      const text = String(value || "");
      if (slow) {
        await IRCTCExt.Events.typeSlowly(el, text, 40);
      } else {
        IRCTCExt.Events.setInputValue(el, text, { blur: false });
        el.dispatchEvent(new Event("keyup", { bubbles: true }));
        el.dispatchEvent(new Event("focusout", { bubbles: true }));
        el.dispatchEvent(new Event("blur", { bubbles: true }));
      }
      await IRCTCExt.Wait.delay(150);
    },
    async fillSelect(select, value) {
      if (!select || !value) return;
      select.focus();
      IRCTCExt.Events.setNativeValue(select, value);
      select.dispatchEvent(new Event("change", { bubbles: true }));
      select.dispatchEvent(new Event("blur", { bubbles: true }));
      await IRCTCExt.Wait.delay(150);
    },
    getCardPanelRoot() {
      const sel = IRCTCExt.IrctcPaymentsGateway.getSelectors();
      const panel = IRCTCExt.Wait.queryOne(sel.cardAccordionPanel);
      if (panel) return panel;
      const form = IRCTCExt.Wait.queryOne(sel.cardForm);
      if (form) return form;
      return document.body || document;
    },
    isCardsAccordionOpen() {
      const sel = IRCTCExt.IrctcPaymentsGateway.getSelectors();
      const btn = IRCTCExt.Wait.queryOne(sel.cardAccordionBtn);
      const panel = IRCTCExt.Wait.queryOne(sel.cardAccordionPanel);
      if (btn?.getAttribute("aria-expanded") === "true") return true;
      if (panel?.classList?.contains("show")) return true;
      return IRCTCExt.IrctcPaymentsGateway.isCardFormVisible();
    },
    isCardFormVisible() {
      const sel = IRCTCExt.IrctcPaymentsGateway.getSelectors();
      const root = IRCTCExt.IrctcPaymentsGateway.getCardPanelRoot();
      const number = IRCTCExt.Wait.queryOne(sel.cardNumberMasked, root);
      return !!(number && IRCTCExt.Wait.isVisible(number));
    },
    async openCardsAccordion(overlay) {
      const sel = IRCTCExt.IrctcPaymentsGateway.getSelectors();
      const btn = await IRCTCExt.Wait.poll(
        () => {
          const candidate = IRCTCExt.Wait.queryOne(sel.cardAccordionBtn);
          return candidate && IRCTCExt.Wait.isVisible(candidate) ? candidate : null;
        },
        { timeout: 2e4, interval: 200 }
      );
      if (!btn) throw new Error("Cards accordion button not found on IRCTC Payments gateway");
      if (!IRCTCExt.IrctcPaymentsGateway.isCardsAccordionOpen()) {
        overlay?.setStatus("Opening Cards payment section...");
        btn.scrollIntoView({ block: "center", inline: "nearest" });
        IRCTCExt.Events.click(btn);
        await IRCTCExt.Wait.delay(500);
        if (!IRCTCExt.IrctcPaymentsGateway.isCardsAccordionOpen()) {
          IRCTCExt.Events.click(btn);
          await IRCTCExt.Wait.delay(500);
        }
      }
      const opened = await IRCTCExt.Wait.poll(
        () => IRCTCExt.IrctcPaymentsGateway.isCardFormVisible() ? true : null,
        { timeout: 15e3, interval: 200 }
      );
      if (!opened) throw new Error("Cards payment form did not open");
      overlay?.setStatus("Cards section open \u2014 filling details...");
      return true;
    },
    async ensureSmartPayEnabled() {
      const sel = IRCTCExt.IrctcPaymentsGateway.getSelectors();
      const root = IRCTCExt.IrctcPaymentsGateway.getCardPanelRoot();
      const toggle = IRCTCExt.Wait.queryOne(sel.smartPayToggle, root);
      if (!toggle) return;
      if (!toggle.checked) {
        IRCTCExt.Events.click(toggle);
        await IRCTCExt.Wait.delay(200);
      }
    },
    hasVisibleCardErrors() {
      const sel = IRCTCExt.IrctcPaymentsGateway.getSelectors();
      for (const selector of sel.cardErrors || []) {
        const el = document.querySelector(selector);
        if (!el || !IRCTCExt.Wait.isVisible(el)) continue;
        if (el.classList.contains("hideErrFld")) continue;
        const text = (el.textContent || "").replace(/\s+/g, " ").trim();
        if (text && !/^error\.{3}$/i.test(text)) return true;
        if (el.classList.contains("errorBorder")) return true;
      }
      return false;
    },
    async fillCardForm(card, overlay) {
      const sel = IRCTCExt.IrctcPaymentsGateway.getSelectors();
      const root = IRCTCExt.IrctcPaymentsGateway.getCardPanelRoot();
      const numberEl = IRCTCExt.Wait.queryOne(sel.cardNumberMasked, root);
      const monthEl = IRCTCExt.Wait.queryOne(sel.expiryMonth, root);
      const yearEl = IRCTCExt.Wait.queryOne(sel.expiryYear, root);
      const cvvEl = IRCTCExt.Wait.queryOne(sel.cvv, root);
      const nameEl = IRCTCExt.Wait.queryOne(sel.nameOnCard, root);
      if (!numberEl || !monthEl || !yearEl || !cvvEl || !nameEl) {
        throw new Error("Card form fields not found on IRCTC Payments gateway");
      }
      const cardNumber = String(card?.number || "").replace(/\s+/g, "");
      const { month, year } = IRCTCExt.IrctcPaymentsGateway.parseExpiryParts(card?.expiry);
      overlay?.setStatus("Filling card details...");
      await IRCTCExt.IrctcPaymentsGateway.fillGatewayInput(numberEl, cardNumber, { slow: true });
      await IRCTCExt.IrctcPaymentsGateway.fillSelect(monthEl, month);
      await IRCTCExt.IrctcPaymentsGateway.fillSelect(yearEl, year);
      await IRCTCExt.IrctcPaymentsGateway.fillGatewayInput(cvvEl, card?.cvv || "");
      await IRCTCExt.IrctcPaymentsGateway.fillGatewayInput(nameEl, card?.name || "");
      await IRCTCExt.Wait.delay(300);
      if (IRCTCExt.IrctcPaymentsGateway.hasVisibleCardErrors()) {
        throw new Error("Gateway rejected saved card details \u2014 check card number, expiry, CVV, and name");
      }
    },
    async openUpiAccordion(config, overlay) {
      const variant = IRCTCExt.IrctcPaymentsGateway.resolveUpiVariant(config);
      const upiSel = IRCTCExt.IrctcPaymentsGateway.getUpiSelectors(variant);
      const btn = await IRCTCExt.Wait.poll(
        () => {
          const candidate = IRCTCExt.Wait.queryOne(upiSel.accordionBtn);
          return candidate && IRCTCExt.Wait.isVisible(candidate) ? candidate : null;
        },
        { timeout: 2e4, interval: 200 }
      );
      if (!btn) throw new Error("UPI accordion button not found on IRCTC Payments gateway");
      if (!IRCTCExt.IrctcPaymentsGateway.isUpiAccordionOpen(upiSel)) {
        overlay?.setStatus("Opening UPI payment section...");
        btn.scrollIntoView({ block: "center", inline: "nearest" });
        IRCTCExt.Events.click(btn);
        await IRCTCExt.Wait.delay(500);
        if (!IRCTCExt.IrctcPaymentsGateway.isUpiAccordionOpen(upiSel)) {
          IRCTCExt.Events.click(btn);
          await IRCTCExt.Wait.delay(500);
        }
      }
      const section = await IRCTCExt.Wait.poll(
        () => IRCTCExt.IrctcPaymentsGateway.isUpiQrSectionVisible(upiSel) ? true : null,
        { timeout: 15e3, interval: 200 }
      );
      if (!section) throw new Error("UPI payment section did not open");
      overlay?.setStatus("UPI section open \u2014 selecting QR...");
      return upiSel;
    },
    async selectQrPayment(upiSel, overlay) {
      overlay?.setStatus("Selecting QR payment...");
      const radio = await IRCTCExt.Wait.poll(
        () => {
          const root = IRCTCExt.Wait.queryOne(upiSel.qrSection) || document;
          const candidate = IRCTCExt.Wait.queryOne(upiSel.qrRadio, root);
          return candidate && IRCTCExt.Wait.isVisible(candidate) ? candidate : null;
        },
        { timeout: 15e3, interval: 200 }
      );
      if (!radio) throw new Error("UPI QR payment option not found");
      if (!radio.checked) {
        IRCTCExt.Events.click(radio);
        const label = document.querySelector(`label[for="${radio.id}"]`);
        if (label) IRCTCExt.Events.click(label);
        await IRCTCExt.Wait.delay(400);
      }
      if (!radio.checked) {
        throw new Error("Could not select UPI QR payment option");
      }
      await IRCTCExt.Wait.delay(500);
    },
    findShowQrButton() {
      const sel = IRCTCExt.IrctcPaymentsGateway.getSelectors();
      const direct = IRCTCExt.Wait.queryAll(sel.upiShowQrBtn);
      for (const btn of direct) {
        if (!IRCTCExt.Wait.isVisible(btn) || btn.disabled) continue;
        if (/show\s*qr|click\s*here/i.test(btn.textContent || "")) return btn;
      }
      const buttons = document.querySelectorAll('button[data-click="showUpiQR"], #irctc-generate-qr-btn');
      for (const btn of buttons) {
        if (!IRCTCExt.Wait.isVisible(btn) || btn.disabled) continue;
        return btn;
      }
      return null;
    },
    isQrCodeVisible() {
      const sel = IRCTCExt.IrctcPaymentsGateway.getSelectors();
      for (const selector of sel.upiQrImage || []) {
        const el = document.querySelector(selector);
        if (!el || !IRCTCExt.Wait.isVisible(el)) continue;
        const rect = el.getBoundingClientRect();
        if (rect.width > 40 && rect.height > 40) return true;
      }
      return false;
    },
    async clickShowQrButton(overlay) {
      overlay?.setStatus("Opening QR modal...");
      const showBtn = await IRCTCExt.Wait.poll(
        () => IRCTCExt.IrctcPaymentsGateway.findShowQrButton(),
        { timeout: 2e4, interval: 250 }
      );
      if (!showBtn) throw new Error("Show QR button not found on IRCTC Payments gateway");
      overlay?.setStatus("Clicking Show QR...");
      showBtn.scrollIntoView({ block: "center", inline: "nearest" });
      IRCTCExt.Events.click(showBtn);
      await IRCTCExt.Wait.delay(600);
      const qrReady = await IRCTCExt.Wait.poll(
        () => {
          if (IRCTCExt.IrctcPaymentsGateway.isQrCodeVisible()) return true;
          const btn = IRCTCExt.IrctcPaymentsGateway.findShowQrButton();
          return btn ? null : true;
        },
        { timeout: 15e3, interval: 300 }
      );
      if (!qrReady) {
        throw new Error("QR code did not appear after clicking Show QR");
      }
      return true;
    },
    findPayNowButton() {
      const sel = IRCTCExt.IrctcPaymentsGateway.getSelectors();
      const direct = IRCTCExt.Wait.queryAll(sel.payNowBtn);
      for (const btn of direct) {
        if (!IRCTCExt.Wait.isVisible(btn) || btn.disabled) continue;
        if (/pay\s*now/i.test(btn.textContent || "")) return btn;
      }
      const buttons = document.querySelectorAll("button");
      for (const btn of buttons) {
        if (!IRCTCExt.Wait.isVisible(btn) || btn.disabled) continue;
        if (btn.classList.contains("disabled")) continue;
        if (btn.getAttribute("aria-disabled") === "true") continue;
        if (/pay\s*now/i.test(btn.textContent || "")) return btn;
      }
      return null;
    },
    async clickPayNow(overlay) {
      overlay?.setStatus("Clicking Pay Now...");
      const payBtn = await IRCTCExt.Wait.poll(
        () => IRCTCExt.IrctcPaymentsGateway.findPayNowButton(),
        { timeout: 15e3, interval: 250 }
      );
      if (!payBtn) throw new Error("Pay Now button not found on IRCTC Payments gateway");
      IRCTCExt.Events.click(payBtn);
      await IRCTCExt.Wait.delay(600);
      return true;
    },
    async handleCardFlow(config, overlay) {
      const autoPay = IRCTCExt.BkgPayment.getAutoPaySettings(config);
      const type = autoPay.type === "credit" ? "credit" : "debit";
      const card = autoPay.card;
      if (!card?.number) {
        throw new Error(`Saved ${type} card details are missing in extension popup`);
      }
      const maxAttempts = 3;
      let lastError = null;
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          if (attempt > 1) {
            overlay?.setStatus(`Retrying card fill (${attempt}/${maxAttempts})...`);
            await IRCTCExt.Wait.delay(300);
          }
          await IRCTCExt.IrctcPaymentsGateway.openCardsAccordion(overlay);
          await IRCTCExt.IrctcPaymentsGateway.ensureSmartPayEnabled();
          await IRCTCExt.IrctcPaymentsGateway.fillCardForm(card, overlay);
          await IRCTCExt.IrctcPaymentsGateway.clickPayNow(overlay);
          await IRCTCExt.IrctcPaymentsGateway.finishGateway(
            overlay,
            "Card submitted \u2014 complete OTP/bank step manually."
          );
          return true;
        } catch (err) {
          lastError = err;
          if (attempt >= maxAttempts) break;
        }
      }
      throw lastError || new Error("Could not complete card payment on IRCTC Payments gateway");
    },
    async handleQrFlow(config, overlay) {
      const upiSel = await IRCTCExt.IrctcPaymentsGateway.openUpiAccordion(config, overlay);
      await IRCTCExt.IrctcPaymentsGateway.selectQrPayment(upiSel, overlay);
      await IRCTCExt.IrctcPaymentsGateway.clickShowQrButton(overlay);
      await IRCTCExt.IrctcPaymentsGateway.finishGateway(
        overlay,
        "QR displayed \u2014 scan with your UPI app to complete payment."
      );
      return true;
    },
    async handle(config, overlay) {
      await IRCTCExt.IrctcPaymentsGateway.waitForReady(overlay);
      const autoPay = IRCTCExt.BkgPayment.getAutoPaySettings(config);
      if (!autoPay.enabled) {
        await IRCTCExt.IrctcPaymentsGateway.finishGateway(
          overlay,
          "Auto pay disabled \u2014 complete payment manually on gateway."
        );
        return true;
      }
      if (autoPay.type === "credit" || autoPay.type === "debit") {
        return IRCTCExt.IrctcPaymentsGateway.handleCardFlow(config, overlay);
      }
      const method = config.preferences?.paymentMethod || "cards";
      if (autoPay.type === "qr" || method === "upi") {
        return IRCTCExt.IrctcPaymentsGateway.handleQrFlow(config, overlay);
      }
      if (method === "cards") {
        return IRCTCExt.IrctcPaymentsGateway.handleCardFlow(config, overlay);
      }
      throw new Error(`Unsupported auto pay type: ${autoPay.type}`);
    }
  };
  window.IRCTCExt = window.IRCTCExt || {};
  IRCTCExt.PhonePeGateway = {
    isPhonePeHost() {
      return location.hostname.includes("phonepe.com");
    },
    formatExpiry(expiry) {
      const raw = String(expiry || "").trim();
      if (!raw) return "";
      if (/^\d{2}\/\d{2}$/.test(raw)) return raw;
      const slash = raw.match(/^(\d{1,2})\/(\d{2,4})$/);
      if (slash) {
        const mm = slash[1].padStart(2, "0");
        const yy = slash[2].length === 4 ? slash[2].slice(-2) : slash[2];
        return `${mm}/${yy}`;
      }
      const digits = raw.replace(/\D/g, "");
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
        status: "done",
        running: false,
        currentStep: "done"
      });
      overlay?.setStep("Payment");
      overlay?.setStatus(message);
      overlay?.showPause(message);
    },
    isLoadingScreen() {
      const text = (document.body?.textContent || "").toLowerCase();
      return text.includes("please wait") && text.includes("processing your request");
    },
    isPaymentOptionsVisible() {
      const sel = IRCTCExt.SELECTORS.phonepeGateway;
      if (IRCTCExt.Wait.queryOne(sel.cardInstrument)) return true;
      if (IRCTCExt.Wait.queryOne(sel.upiInstrument)) return true;
      const title = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6, p, span")).find(
        (el) => /payment options/i.test(el.textContent || "")
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
        { timeout: 3e4, interval: 300 }
      );
      if (!ready) throw new Error("PhonePe payment gateway did not load");
      await IRCTCExt.Wait.delay(400);
    },
    findUpiInstrument() {
      const sel = IRCTCExt.SELECTORS.phonepeGateway;
      const direct = IRCTCExt.Wait.queryOne(sel.upiInstrument);
      if (direct && IRCTCExt.Wait.isVisible(direct)) return direct;
      for (const item of IRCTCExt.Wait.queryAll(sel.paymentOptionItem)) {
        if (!IRCTCExt.Wait.isVisible(item)) continue;
        const title = item.querySelector('._titleContainer_1cewd_41, [class*="titleContainer"]');
        const text = (title?.textContent || item.textContent || "").replace(/\s+/g, " ").trim();
        if (/^UPI$/i.test(text) || /\bUPI\b/i.test(text) && !/debit|credit card/i.test(text)) {
          return item;
        }
      }
      return null;
    },
    isInstrumentSelected(el) {
      if (!el) return false;
      if (el.classList.contains("_selected_1cewd_32")) return true;
      if (el.id === "card-instrument" && el.className.includes("_selected_")) return true;
      return el.getAttribute("aria-selected") === "true";
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
      const card = await IRCTCExt.Wait.waitFor(sel.cardInstrument, { timeout: 15e3, visible: true });
      await IRCTCExt.PhonePeGateway.selectInstrument(card, "Debit/Credit Card", overlay);
      const numberInput = await IRCTCExt.Wait.waitFor(sel.cardNumber, { timeout: 1e4, visible: true });
      if (!numberInput) throw new Error("PhonePe card form did not appear");
      return numberInput;
    },
    async selectUpiInstrument(overlay) {
      const upi = await IRCTCExt.Wait.poll(
        () => IRCTCExt.PhonePeGateway.findUpiInstrument(),
        { timeout: 1e4, interval: 200 }
      );
      if (!upi) return false;
      await IRCTCExt.PhonePeGateway.selectInstrument(upi, "UPI", overlay);
      return true;
    },
    hasVisibleFieldError() {
      const sel = IRCTCExt.SELECTORS.phonepeGateway;
      for (const err of IRCTCExt.Wait.queryAll(sel.fieldErrorVisible)) {
        if (IRCTCExt.Wait.isVisible(err) && (err.textContent || "").trim()) return true;
      }
      return false;
    },
    isProceedEnabled(btn) {
      if (!btn || !IRCTCExt.Wait.isVisible(btn)) return false;
      if (btn.disabled) return false;
      if (btn.getAttribute("aria-disabled") === "true") return false;
      if (btn.classList.contains("_disabled_1ozip_25")) return false;
      return true;
    },
    async fillCardForm(card, overlay) {
      const sel = IRCTCExt.SELECTORS.phonepeGateway;
      const numberEl = IRCTCExt.Wait.queryOne(sel.cardNumber);
      const nameEl = IRCTCExt.Wait.queryOne(sel.cardName);
      const expiryEl = IRCTCExt.Wait.queryOne(sel.cardExpiry);
      const cvvEl = IRCTCExt.Wait.queryOne(sel.cardCvv);
      if (!numberEl || !nameEl || !expiryEl || !cvvEl) {
        throw new Error("PhonePe card fields not found");
      }
      const cardNumber = String(card?.number || "").replace(/\s+/g, "");
      const expiry = IRCTCExt.PhonePeGateway.formatExpiry(card?.expiry);
      overlay?.setStatus("Filling card details on PhonePe...");
      IRCTCExt.Events.setInputValue(numberEl, cardNumber);
      await IRCTCExt.Wait.delay(200);
      IRCTCExt.Events.setInputValue(nameEl, card?.name || "");
      await IRCTCExt.Wait.delay(200);
      IRCTCExt.Events.setInputValue(expiryEl, expiry);
      await IRCTCExt.Wait.delay(200);
      IRCTCExt.Events.setInputValue(cvvEl, card?.cvv || "");
      await IRCTCExt.Wait.delay(400);
      if (IRCTCExt.PhonePeGateway.hasVisibleFieldError()) {
        throw new Error("PhonePe rejected card details \u2014 check number, expiry, CVV, and name");
      }
    },
    async clickProceedWhenEnabled(overlay) {
      const sel = IRCTCExt.SELECTORS.phonepeGateway;
      overlay?.setStatus("Waiting for Proceed button...");
      const btn = await IRCTCExt.Wait.poll(
        () => {
          const candidate = IRCTCExt.Wait.queryOne(sel.proceedBtn);
          return IRCTCExt.PhonePeGateway.isProceedEnabled(candidate) ? candidate : null;
        },
        { timeout: 15e3, interval: 250 }
      );
      if (!btn) throw new Error("PhonePe Proceed button not enabled \u2014 check saved card details");
      overlay?.setStatus("Clicking Proceed...");
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
      overlay?.setStatus("Preparing PhonePe UPI / QR...");
      const upiSelected = await IRCTCExt.PhonePeGateway.selectUpiInstrument(overlay);
      if (!upiSelected && !await IRCTCExt.PhonePeGateway.isQrVisible()) {
        throw new Error("PhonePe UPI payment option not found");
      }
      const qrReady = await IRCTCExt.Wait.poll(
        () => IRCTCExt.PhonePeGateway.isQrVisible() ? true : null,
        { timeout: 15e3, interval: 300 }
      );
      if (!qrReady) throw new Error("PhonePe QR code did not appear");
      await IRCTCExt.PhonePeGateway.finishGateway(overlay, "QR ready \u2014 scan and pay manually.");
    },
    async fillAutopayCard(overlay, card, type) {
      const label = type === "credit" ? "credit" : "debit";
      if (!card?.number) {
        throw new Error(`Saved ${label} card details are missing in extension popup`);
      }
      await IRCTCExt.PhonePeGateway.selectCardInstrument(overlay);
      await IRCTCExt.PhonePeGateway.fillCardForm(card, overlay);
      await IRCTCExt.PhonePeGateway.clickProceedWhenEnabled(overlay);
      await IRCTCExt.PhonePeGateway.finishGateway(
        overlay,
        "Card submitted \u2014 complete OTP/3DS manually."
      );
    },
    async handle(config, overlay) {
      await IRCTCExt.PhonePeGateway.waitForGatewayReady();
      const autoPay = IRCTCExt.BkgPayment.getAutoPaySettings(config);
      if (!autoPay.enabled) {
        await IRCTCExt.PhonePeGateway.finishGateway(
          overlay,
          "Auto pay disabled \u2014 complete payment manually on PhonePe gateway."
        );
        return true;
      }
      if (autoPay.type === "qr") {
        return IRCTCExt.PhonePeGateway.handleQrFlow(overlay);
      }
      if (autoPay.type === "credit" || autoPay.type === "debit") {
        return IRCTCExt.PhonePeGateway.fillAutopayCard(overlay, autoPay.card, autoPay.type);
      }
      throw new Error(`Unsupported auto pay type: ${autoPay.type}`);
    }
  };
  window.IRCTCExt = window.IRCTCExt || {};
  IRCTCExt.Gateways = {
    isIrctcPaymentsHost() {
      return location.hostname.includes("irctcpayments.com");
    },
    isIrctcIpayHost() {
      return location.hostname.includes("irctcipay.com");
    },
    isPhonePeHost() {
      return IRCTCExt.PhonePeGateway?.isPhonePeHost?.() || location.hostname.includes("phonepe.com");
    },
    isPhonePeGateway(config) {
      const gateway = config.state?.paymentGateway;
      const provider = IRCTCExt.BkgPayment.getPaymentProvider(config);
      const normalizedGateway = IRCTCExt.BkgPayment.normalizeProviderName(gateway);
      const normalizedProvider = IRCTCExt.BkgPayment.normalizeProviderName(provider);
      return normalizedGateway === "phonepe" || normalizedProvider === "phonepe";
    },
    async finishUnsupported(overlay, provider) {
      await IRCTCExt.Storage.updateState({
        paymentDone: true,
        paymentPhase: null,
        awaitingGateway: false,
        paymentGateway: null,
        status: "done",
        running: false,
        currentStep: "done"
      });
      const message = `Gateway automation not implemented for ${provider || "this provider"}. Complete payment manually.`;
      overlay?.setStep("Payment");
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
        if (gateway === "irctcIpay" || IRCTCExt.BkgPayment.isIpayProvider(gateway) || IRCTCExt.BkgPayment.isIpayProvider(provider)) {
          return IRCTCExt.IrctcIpayGateway.handle(config, overlay);
        }
        return IRCTCExt.Gateways.finishUnsupported(overlay, gateway || provider);
      }
      throw new Error("Unknown payment gateway host");
    }
  };
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
      await IRCTCExt.Wait.poll(() => document.body, { timeout: 1e4, interval: 50 });
    },
    async init() {
      await IRCTCExt.Overlay.ensureBody();
      if (!document.body) return IRCTCExt.Overlay;
      if (document.getElementById("irctc-ext-overlay")) {
        IRCTCExt.Overlay.el = document.getElementById("irctc-ext-overlay");
        IRCTCExt.Overlay.ensureMinimizeButton();
        IRCTCExt.Overlay.ensureRestartButton();
        IRCTCExt.Overlay.bindEvents();
        return IRCTCExt.Overlay;
      }
      const root = document.createElement("div");
      root.id = "irctc-ext-overlay";
      root.className = "irctc-ext-overlay irctc-ext-overlay--hidden";
      root.innerHTML = `
      <div class="irctc-ext-overlay__header">
        <span>IRCTC Tatkal Assistant</span>
        <div class="irctc-ext-overlay__header-right">
          <span id="irctc-ext-step">Idle</span>
          <button type="button" class="irctc-ext-overlay__icon-btn" id="irctc-ext-minimize" title="Minimize" aria-label="Minimize overlay">\u2212</button>
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
      const header = this.el?.querySelector(".irctc-ext-overlay__header");
      if (!header || document.getElementById("irctc-ext-minimize")) return;
      let right = header.querySelector(".irctc-ext-overlay__header-right");
      if (!right) {
        right = document.createElement("div");
        right.className = "irctc-ext-overlay__header-right";
        const step = document.getElementById("irctc-ext-step");
        if (step) right.appendChild(step);
        header.appendChild(right);
      }
      const btn = document.createElement("button");
      btn.type = "button";
      btn.id = "irctc-ext-minimize";
      btn.className = "irctc-ext-overlay__icon-btn";
      btn.title = "Minimize";
      btn.setAttribute("aria-label", "Minimize overlay");
      btn.textContent = "\u2212";
      right.appendChild(btn);
    },
    ensureRestartButton() {
      const actions = this.el?.querySelector(".irctc-ext-overlay__actions");
      if (!actions || document.getElementById("irctc-ext-restart")) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.id = "irctc-ext-restart";
      btn.className = "irctc-ext-overlay__btn irctc-ext-overlay__btn--accent";
      btn.textContent = "Restart";
      const stopBtn = document.getElementById("irctc-ext-stop");
      if (stopBtn) {
        actions.insertBefore(btn, stopBtn);
      } else {
        actions.appendChild(btn);
      }
    },
    bindEvents() {
      const minimizeBtn = document.getElementById("irctc-ext-minimize");
      if (minimizeBtn && minimizeBtn.dataset.bound !== "1") {
        minimizeBtn.dataset.bound = "1";
        minimizeBtn.addEventListener("click", () => IRCTCExt.Overlay.toggleMinimize());
      }
      const restartBtn = document.getElementById("irctc-ext-restart");
      if (restartBtn && restartBtn.dataset.bound !== "1") {
        restartBtn.dataset.bound = "1";
        restartBtn.addEventListener("click", () => IRCTCExt.Overlay.restart());
      }
      if (this._bound) return;
      document.getElementById("irctc-ext-pause")?.addEventListener("click", () => IRCTCExt.Overlay.togglePause());
      document.getElementById("irctc-ext-stop")?.addEventListener("click", () => IRCTCExt.Overlay.stop());
      document.getElementById("irctc-ext-continue")?.addEventListener("click", () => {
        document.getElementById("irctc-ext-pause-panel").style.display = "none";
        if (typeof IRCTCExt.Overlay.onContinue === "function") IRCTCExt.Overlay.onContinue();
      });
      this._bound = true;
    },
    setMinimized(minimized) {
      if (!this.el) return;
      this.el.classList.toggle("irctc-ext-overlay--minimized", minimized);
      const btn = document.getElementById("irctc-ext-minimize");
      if (btn) {
        btn.textContent = minimized ? "+" : "\u2212";
        btn.title = minimized ? "Expand" : "Minimize";
        btn.setAttribute("aria-label", minimized ? "Expand overlay" : "Minimize overlay");
      }
    },
    toggleMinimize() {
      this.setMinimized(!this.el?.classList.contains("irctc-ext-overlay--minimized"));
    },
    async show() {
      await IRCTCExt.Overlay.init();
      if (IRCTCExt.Overlay.el) {
        IRCTCExt.Overlay.el.classList.remove("irctc-ext-overlay--hidden");
      }
      if (window.innerWidth <= 600) {
        IRCTCExt.Overlay.setMinimized(true);
      }
      const config = await IRCTCExt.Storage.get().catch(() => null);
      if (config) IRCTCExt.Overlay.updatePauseButton(config.state?.paused);
      return IRCTCExt.Overlay;
    },
    hide() {
      if (this.el) this.el.classList.add("irctc-ext-overlay--hidden");
      this.stopTimer();
    },
    startTimer() {
      this.startTime = Date.now();
      this.stopTimer();
      this.timerInterval = setInterval(() => {
        const sec = Math.floor((Date.now() - this.startTime) / 1e3);
        const timer = document.getElementById("irctc-ext-timer");
        if (timer) timer.textContent = `Elapsed: ${sec}s`;
      }, 1e3);
    },
    stopTimer() {
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
    },
    setStep(step) {
      const el = document.getElementById("irctc-ext-step");
      if (el) el.textContent = step;
    },
    setStatus(msg) {
      const el = document.getElementById("irctc-ext-status");
      if (el) el.textContent = msg;
    },
    setError(msg) {
      const el = document.getElementById("irctc-ext-error");
      if (el) el.textContent = msg || "";
    },
    showPause(message, onContinue) {
      this.onContinue = onContinue;
      const panel = document.getElementById("irctc-ext-pause-panel");
      const msg = document.getElementById("irctc-ext-pause-msg");
      if (msg) msg.textContent = message;
      if (panel) panel.style.display = "block";
    },
    updatePauseButton(paused) {
      const btn = document.getElementById("irctc-ext-pause");
      if (btn) btn.textContent = paused ? "Resume" : "Pause";
    },
    async togglePause() {
      const config = await IRCTCExt.Storage.get();
      if (!config.state.running) {
        this.setStatus("Not running");
        return;
      }
      const paused = !config.state.paused;
      await IRCTCExt.Storage.updateState({ paused });
      this.updatePauseButton(paused);
      this.setStatus(paused ? "Paused" : "Resumed");
      this.setStep(paused ? "Paused" : config.state.currentStep || "Running");
      if (!paused && window.IRCTCExt?.Bot) {
        await IRCTCExt.Bot.resumeIfNeeded();
      }
    },
    async restart() {
      if (!window.IRCTCExt?.Bot) return;
      try {
        this.setError("");
        this.setStatus("Refreshing page to restart...");
        await IRCTCExt.Bot.restart();
      } catch (err) {
        console.error("[IRCTC-Bot] Restart failed:", err);
        this.setError(err.message || String(err));
        this.setStatus("Restart failed");
        this.setStep("Error");
      }
    },
    async stop() {
      this.setStatus("Stopping...");
      this.setStep("Stopped");
      this.stopTimer();
      if (window.IRCTCExt?.Bot?.stop) {
        await IRCTCExt.Bot.stop();
        return;
      }
      await IRCTCExt.Storage.updateState({ running: false, paused: false, status: "stopped", currentStep: "init" });
      this.setStatus("Stopped");
      if (typeof this.onStop === "function") this.onStop();
      location.reload();
    }
  };
  (function(root) {
    root.IRCTCExt = root.IRCTCExt || {};
  })(typeof globalThis !== "undefined" ? globalThis : window);
  IRCTCExt.GatewayBot = {
    running: false,
    _lastUrl: "",
    _resumeTimer: null,
    _overlayShown: false,
    isGatewayPage() {
      return !!(IRCTCExt.Gateways?.isIrctcPaymentsHost?.() || IRCTCExt.Gateways?.isIrctcIpayHost?.() || IRCTCExt.Gateways?.isPhonePeHost?.() || IRCTCExt.NgetPaths?.isGatewayPath?.());
    },
    isBookingActiveOnGateway(config) {
      const state = config?.state || {};
      if (!state.running) return false;
      if (state.paymentDone) return false;
      if (state.status === "stopped" || state.status === "done") return false;
      return true;
    },
    isActiveGatewaySession(config) {
      if (!IRCTCExt.GatewayBot.isBookingActiveOnGateway(config)) return false;
      const state = config?.state || {};
      if (state.awaitingGateway || state.paymentPhase === "gateway" || state.currentStep === "gateway") {
        return true;
      }
      return IRCTCExt.GatewayBot.isGatewayPage();
    },
    async ensureGatewayBookingState(config) {
      if (!IRCTCExt.GatewayBot.isActiveGatewaySession(config)) return config;
      const state = config?.state || {};
      if (state.awaitingGateway && state.paymentPhase === "gateway") return config;
      return IRCTCExt.Storage.updateState({
        awaitingGateway: true,
        paymentPhase: "gateway",
        currentStep: "gateway",
        status: state.status === "error" ? "running" : state.status || "running"
      });
    },
    getGatewayStatusMessage() {
      if (IRCTCExt.NgetPaths?.isGatewayAuthRedirectPath?.()) {
        return "Payment gateway loading \u2014 please wait...";
      }
      if (location.pathname.includes("authRedirect")) {
        return "Payment gateway loading \u2014 please wait...";
      }
      return "Payment gateway loaded \u2014 continuing automation...";
    },
    async showGatewayOverlay(config) {
      if (!IRCTCExt.GatewayBot.isGatewayPage()) return null;
      if (!IRCTCExt.GatewayBot.isActiveGatewaySession(config)) return null;
      if (IRCTCExt.EticketSelectors) {
        IRCTCExt.SELECTORS = IRCTCExt.EticketSelectors;
      }
      const overlay = await IRCTCExt.Overlay.show();
      if (!IRCTCExt.GatewayBot._overlayShown) {
        overlay.startTimer();
      }
      IRCTCExt.GatewayBot._overlayShown = true;
      overlay.setStep("Gateway");
      overlay.setError("");
      overlay.setStatus(IRCTCExt.GatewayBot.getGatewayStatusMessage());
      IRCTCExt.PlatformBridge?.sendMessage("BOOKING_STATUS", {
        status: "gateway",
        step: "gateway"
      });
      return overlay;
    },
    scheduleResumeRetries() {
      if (IRCTCExt.GatewayBot._resumeTimer) return;
      let attempts = 0;
      const maxAttempts = 30;
      IRCTCExt.GatewayBot._resumeTimer = setInterval(() => {
        attempts += 1;
        if (attempts > maxAttempts) {
          clearInterval(IRCTCExt.GatewayBot._resumeTimer);
          IRCTCExt.GatewayBot._resumeTimer = null;
          return;
        }
        IRCTCExt.GatewayBot.resumeIfNeeded().catch(
          (err) => console.warn("[IRCTC-Gateway] Retry resume failed:", err)
        );
      }, 1e3);
    },
    async resumeIfNeeded() {
      if (!IRCTCExt.GatewayBot.isGatewayPage()) return;
      let config = await IRCTCExt.Storage.get();
      if (!IRCTCExt.GatewayBot.isActiveGatewaySession(config)) return;
      config = await IRCTCExt.GatewayBot.ensureGatewayBookingState(config);
      const overlay = await IRCTCExt.GatewayBot.showGatewayOverlay(config);
      if (!overlay) return;
      if (config.state.paused) return;
      if (IRCTCExt.GatewayBot.running) return;
      IRCTCExt.GatewayBot.running = true;
      try {
        await IRCTCExt.Gateways.run(config, overlay);
      } catch (err) {
        console.error("[IRCTC-Gateway]", err);
        overlay.setError(err.message || String(err));
        overlay.setStatus("Gateway payment failed: " + (err.message || err));
        overlay.setStep("Error");
        await IRCTCExt.Storage.updateState({
          status: "error",
          running: false,
          awaitingGateway: false,
          message: err.message
        });
        IRCTCExt.PlatformBridge?.sendMessage("BOOKING_STATUS", {
          status: "error",
          message: err.message
        });
      } finally {
        IRCTCExt.GatewayBot.running = false;
      }
    },
    onLocationMaybeChanged() {
      const href = location.href;
      if (href === IRCTCExt.GatewayBot._lastUrl) return;
      IRCTCExt.GatewayBot._lastUrl = href;
      IRCTCExt.GatewayBot.resumeIfNeeded().catch(
        (err) => console.error("[IRCTC-Gateway] Resume failed:", err)
      );
    },
    watchGatewayNavigation() {
      IRCTCExt.GatewayBot._lastUrl = location.href;
      window.addEventListener("popstate", () => IRCTCExt.GatewayBot.onLocationMaybeChanged());
      const nativePushState = history.pushState.bind(history);
      const nativeReplaceState = history.replaceState.bind(history);
      history.pushState = function(...args) {
        const result = nativePushState(...args);
        IRCTCExt.GatewayBot.onLocationMaybeChanged();
        return result;
      };
      history.replaceState = function(...args) {
        const result = nativeReplaceState(...args);
        IRCTCExt.GatewayBot.onLocationMaybeChanged();
        return result;
      };
      setInterval(() => IRCTCExt.GatewayBot.onLocationMaybeChanged(), 750);
    },
    init() {
      if (IRCTCExt.GatewayBot._initialized) return;
      IRCTCExt.GatewayBot._initialized = true;
      IRCTCExt.Wait.installIrctcNoiseFilter?.();
      IRCTCExt.Overlay.init().catch((err) => console.warn("[IRCTC-Gateway] Overlay init:", err));
      const handleMessage = (msg, sendResponse) => {
        if (msg.type === "PING") {
          sendResponse({ ok: true, ready: true });
          return true;
        }
        if (msg.type === "RESUME_GATEWAY" || msg.type === "START_GATEWAY") {
          IRCTCExt.GatewayBot.resumeIfNeeded().catch(
            (err) => console.error("[IRCTC-Gateway] Resume failed:", err)
          );
          sendResponse({ ok: true });
          return true;
        }
        if (msg.type === "STOP_BOOKING") {
          IRCTCExt.Overlay.stop?.();
          sendResponse({ ok: true });
          return true;
        }
        return false;
      };
      if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
        chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => handleMessage(msg, sendResponse));
      } else if (IRCTCExt.PlatformBridge?.onMessage) {
        IRCTCExt.PlatformBridge.onMessage(handleMessage);
      }
      IRCTCExt.GatewayBot.watchGatewayNavigation();
      IRCTCExt.GatewayBot.scheduleResumeRetries();
      const bootstrap = () => {
        IRCTCExt.GatewayBot.resumeIfNeeded().catch(
          (err) => console.error("[IRCTC-Gateway] Bootstrap resume failed:", err)
        );
      };
      if (document.body || document.documentElement) {
        bootstrap();
      } else {
        IRCTCExt.Wait.poll(() => document.body || document.documentElement, {
          timeout: 3e4,
          interval: 50
        }).then(bootstrap);
      }
    }
  };
  IRCTCExt.GatewayBot.init();
})();
