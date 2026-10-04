const DEFAULT_CONFIG = window.IRCTC_DEFAULT_CONFIG;
const Storage = window.IRCTCStorage;
const AccessApi = window.IRCTCExt?.AccessApi;

const els = {
  tabs: document.querySelectorAll('.tab'),
  panels: document.querySelectorAll('.panel'),
  setSubtabs: document.querySelectorAll('.set-subtab'),
  setSubpanels: document.querySelectorAll('.set-subpanel'),
  accessStatusText: document.getElementById('accessStatusText'),
  accessTier: document.getElementById('accessTier'),
  accessValidUntil: document.getElementById('accessValidUntil'),
  accessActive: document.getElementById('accessActive'),
  accessEmail: document.getElementById('accessEmail'),
  toggleAccessEmailBtn: document.getElementById('toggleAccessEmailBtn'),
  bookingSite: document.getElementById('bookingSite'),
  linkAccessEmailBtn: document.getElementById('linkAccessEmailBtn'),
  bmcLink: document.getElementById('bmcLink'),
  username: document.getElementById('username'),
  toggleUsernameBtn: document.getElementById('toggleUsernameBtn'),
  password: document.getElementById('password'),
  togglePasswordBtn: document.getElementById('togglePasswordBtn'),
  fromStation: document.getElementById('fromStation'),
  toStation: document.getElementById('toStation'),
  journeyDate: document.getElementById('journeyDate'),
  journeyDateWarn: document.getElementById('journeyDateWarn'),
  trainNo: document.getElementById('trainNo'),
  trainName: document.getElementById('trainName'),
  travelClass: document.getElementById('travelClass'),
  travelClassWarn: document.getElementById('travelClassWarn'),
  quota: document.getElementById('quota'),
  paymentMethod: document.getElementById('paymentMethod'),
  cardsPaymentFields: document.getElementById('cardsPaymentFields'),
  upiPaymentFields: document.getElementById('upiPaymentFields'),
  cardsProvider: document.getElementById('cardsProvider'),
  upiProvider: document.getElementById('upiProvider'),
  autoPayEnabled: document.getElementById('autoPayEnabled'),
  autoPayOptions: document.getElementById('autoPayOptions'),
  debitCardFields: document.getElementById('debitCardFields'),
  creditCardFields: document.getElementById('creditCardFields'),
  debitCardName: document.getElementById('debitCardName'),
  toggleDebitCardNameBtn: document.getElementById('toggleDebitCardNameBtn'),
  debitCardNumber: document.getElementById('debitCardNumber'),
  toggleDebitCardNumberBtn: document.getElementById('toggleDebitCardNumberBtn'),
  debitCardExpiry: document.getElementById('debitCardExpiry'),
  debitCardCvv: document.getElementById('debitCardCvv'),
  toggleDebitCardCvvBtn: document.getElementById('toggleDebitCardCvvBtn'),
  creditCardName: document.getElementById('creditCardName'),
  toggleCreditCardNameBtn: document.getElementById('toggleCreditCardNameBtn'),
  creditCardNumber: document.getElementById('creditCardNumber'),
  toggleCreditCardNumberBtn: document.getElementById('toggleCreditCardNumberBtn'),
  creditCardExpiry: document.getElementById('creditCardExpiry'),
  creditCardCvv: document.getElementById('creditCardCvv'),
  toggleCreditCardCvvBtn: document.getElementById('toggleCreditCardCvvBtn'),
  passengerList: document.getElementById('passengerList'),
  addPassenger: document.getElementById('addPassenger'),
  scheduleEnabled: document.getElementById('scheduleEnabled'),
  scheduleType: document.getElementById('scheduleType'),
  scheduleStatus: document.getElementById('scheduleStatus'),
  saveBtn: document.getElementById('saveBtn'),
  startBtn: document.getElementById('startBtn'),
  stopBtn: document.getElementById('stopBtn'),
  clearBtn: document.getElementById('clearBtn'),
  statusBadge: document.getElementById('statusBadge'),
  setsPanel: document.getElementById('setsPanel'),
  setupProgressFill: document.getElementById('setupProgressFill'),
  setupProgressLabel: document.getElementById('setupProgressLabel'),
  toggleMinimizeBtn: document.getElementById('toggleMinimizeBtn'),
  popupBody: document.getElementById('popupBody'),
  toast: document.getElementById('toast'),
  bookingSetSelect: document.getElementById('bookingSetSelect'),
  addSetBtn: document.getElementById('addSetBtn'),
  duplicateSetBtn: document.getElementById('duplicateSetBtn'),
  renameSetBtn: document.getElementById('renameSetBtn'),
  deleteSetBtn: document.getElementById('deleteSetBtn')
};

let activeSetId = null;
let setsLocked = false;

const POPUP_MINIMIZED_KEY = 'irctcPopupMinimized';
const POPUP_TAB_KEY = 'irctcPopupTab';
const POPUP_SET_SECTION_KEY = 'irctcPopupSetSection';
const LINK_ACCESS_EMAIL_BTN_LABEL = 'Link email & refresh';
const SET_SECTIONS = ['credentials', 'journey', 'passengers', 'payment', 'schedule'];
const LEGACY_SECTION_TABS = new Set(SET_SECTIONS);
const TOP_TABS = new Set(['access', 'sets']);
const CARDS_PROVIDERS_BY_SITE = {
  eticket: [
    { value: 'IRCTC iPay', label: 'IRCTC iPay' },
    { value: 'IRCTC E-Wallet', label: 'IRCTC E-Wallet' },
    { value: 'PhonePe', label: 'PhonePe', default: true }
  ],
  nget: [{ value: 'IRCTC iPay', label: 'IRCTC iPay', default: true }]
};
let toastTimer = null;
let activeSetName = 'Set 1';

function syncCardsProviderOptions(bookingSite, preferredValue = null) {
  if (!els.cardsProvider) return;
  const site = bookingSite === 'nget' ? 'nget' : 'eticket';
  const providers = CARDS_PROVIDERS_BY_SITE[site];
  const previous = preferredValue || els.cardsProvider.value;

  els.cardsProvider.innerHTML = providers
    .map((provider) => `<option value="${provider.value}">${provider.label}</option>`)
    .join('');

  const stillValid = providers.some((provider) => provider.value === previous);
  if (stillValid) {
    els.cardsProvider.value = previous;
    return;
  }

  const fallback = providers.find((provider) => provider.default) || providers[0];
  els.cardsProvider.value = fallback.value;
}

function setFieldMaskVisible(inputEl, btnEl, visible, labelBase) {
  if (!inputEl || !btnEl) return;
  inputEl.type = visible ? 'text' : 'password';
  btnEl.classList.toggle('password-field__toggle--visible', visible);
  const label = visible ? `Hide ${labelBase}` : `Show ${labelBase}`;
  btnEl.setAttribute('aria-label', label);
  btnEl.title = label;
}

function setUsernameVisible(visible) {
  setFieldMaskVisible(els.username, els.toggleUsernameBtn, visible, 'username');
}

function toggleUsernameVisibility() {
  if (!els.username) return;
  setUsernameVisible(els.username.type === 'password');
}

function setPasswordVisible(visible) {
  setFieldMaskVisible(els.password, els.togglePasswordBtn, visible, 'password');
}

function togglePasswordVisibility() {
  if (!els.password) return;
  setPasswordVisible(els.password.type === 'password');
}

function setAccessEmailVisible(visible) {
  setFieldMaskVisible(els.accessEmail, els.toggleAccessEmailBtn, visible, 'Buy Me a Coffee email');
}

function toggleAccessEmailVisibility() {
  if (!els.accessEmail) return;
  setAccessEmailVisible(els.accessEmail.type === 'password');
}

function setAllSecretFieldsVisible(visible = false) {
  setUsernameVisible(visible);
  setPasswordVisible(visible);
  setAccessEmailVisible(visible);
  setFieldMaskVisible(els.debitCardName, els.toggleDebitCardNameBtn, visible, 'card name');
  setFieldMaskVisible(els.debitCardNumber, els.toggleDebitCardNumberBtn, visible, 'card number');
  setFieldMaskVisible(els.debitCardCvv, els.toggleDebitCardCvvBtn, visible, 'CVV');
  setFieldMaskVisible(els.creditCardName, els.toggleCreditCardNameBtn, visible, 'card name');
  setFieldMaskVisible(els.creditCardNumber, els.toggleCreditCardNumberBtn, visible, 'card number');
  setFieldMaskVisible(els.creditCardCvv, els.toggleCreditCardCvvBtn, visible, 'CVV');
}

function setLinkAccessEmailLoading(loading, loadingLabel = 'Loading...') {
  const btn = els.linkAccessEmailBtn;
  if (!btn) return;
  btn.disabled = loading;
  btn.textContent = loading ? loadingLabel : LINK_ACCESS_EMAIL_BTN_LABEL;
  btn.classList.toggle('btn-loading', loading);
  if (loading) btn.setAttribute('aria-busy', 'true');
  else btn.removeAttribute('aria-busy');
}

function setMinimized(minimized) {
  document.documentElement.classList.toggle('popup-minimized', minimized);
  document.body.classList.toggle('popup-minimized', minimized);
  els.toggleMinimizeBtn.textContent = minimized ? '+' : '−';
  els.toggleMinimizeBtn.title = minimized ? 'Expand' : 'Minimize';
  els.toggleMinimizeBtn.setAttribute('aria-label', minimized ? 'Expand popup' : 'Minimize popup');
  chrome.storage.local.set({ [POPUP_MINIMIZED_KEY]: minimized });
}

async function loadMinimizedState() {
  const data = await chrome.storage.local.get(POPUP_MINIMIZED_KEY);
  setMinimized(!!data[POPUP_MINIMIZED_KEY]);
}

function showToast(text, isError = false) {
  if (!els.toast) return;
  els.toast.textContent = text;
  els.toast.classList.remove('toast--hidden', 'toast--error');
  if (isError) els.toast.classList.add('toast--error');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    els.toast.classList.add('toast--hidden');
  }, 4000);
}

function validateEssentials(form) {
  return window.IRCTCExt?.BookingValidation?.validate(form) ?? null;
}

function updateJourneyDateWarning() {
  if (!els.journeyDateWarn || !els.journeyDate) return;

  const warning =
    window.IRCTCExt?.BookingValidation?.getTatkalJourneyDateWarning?.(readForm().journey) ?? null;

  if (warning) {
    els.journeyDateWarn.textContent = warning;
    els.journeyDateWarn.classList.remove('hidden');
    els.journeyDate.classList.add('warn-field');
    return;
  }

  els.journeyDateWarn.textContent = '';
  els.journeyDateWarn.classList.add('hidden');
  els.journeyDate.classList.remove('warn-field');
}

function updateClassBerthWarnings() {
  const warnings =
    window.IRCTCExt?.BookingValidation?.getClassBerthWarnings?.(readForm()) ?? {
      journey: null,
      passengers: []
    };

  if (els.travelClassWarn && els.travelClass) {
    if (warnings.journey) {
      els.travelClassWarn.textContent = warnings.journey;
      els.travelClassWarn.classList.remove('hidden');
      els.travelClass.classList.add('warn-field');
    } else {
      els.travelClassWarn.textContent = '';
      els.travelClassWarn.classList.add('hidden');
      els.travelClass.classList.remove('warn-field');
    }
  }

  const warningByIndex = new Map(
    (warnings.passengers || []).map((entry) => [String(entry.index), entry.message])
  );

  els.passengerList?.querySelectorAll('.passenger-card').forEach((card) => {
    const warnEl = card.querySelector('.passenger-warn');
    const berthEl = card.querySelector('.p-berth');
    const message = warningByIndex.get(card.dataset.index || '');

    if (warnEl) {
      if (message) {
        warnEl.textContent = message;
        warnEl.classList.remove('hidden');
      } else {
        warnEl.textContent = '';
        warnEl.classList.add('hidden');
      }
    }

    if (berthEl) {
      if (message) berthEl.classList.add('warn-field');
      else berthEl.classList.remove('warn-field');
    }
  });
}

function updateJourneyWarnings() {
  updateJourneyDateWarning();
  updateClassBerthWarnings();
}

function focusField(target) {
  if (!target) return;
  requestAnimationFrame(() => {
    let el = null;
    if (typeof target === 'string') {
      el = target.startsWith('.') || target.startsWith('#')
        ? document.querySelector(target)
        : document.getElementById(target);
    } else if (target instanceof HTMLElement) {
      el = target;
    }
    if (!el) return;
    el.focus();
    el.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  });
}

function setAccessDetailValues(tier, validUntil, active) {
  if (els.accessTier) els.accessTier.textContent = tier;
  if (els.accessValidUntil) els.accessValidUntil.textContent = validUntil;
  if (els.accessActive) els.accessActive.textContent = active;
}

function updateAccessUi(status, errorMessage = '', options = {}) {
  if (!els.accessStatusText) return;

  els.accessStatusText.classList.remove('access-status--ok', 'access-status--warn', 'access-status--error');

  if (options.loading) {
    els.accessStatusText.textContent = 'Checking access...';
    setAccessDetailValues('—', '—', '—');
    return;
  }

  if (errorMessage) {
    els.accessStatusText.textContent = errorMessage;
    els.accessStatusText.classList.add('access-status--error');
    setAccessDetailValues('—', '—', '—');
    return;
  }

  if (!status) {
    els.accessStatusText.textContent = 'Access status unavailable.';
    els.accessStatusText.classList.add('access-status--warn');
    setAccessDetailValues('—', '—', '—');
    return;
  }

  els.accessStatusText.textContent = AccessApi?.formatStatusMessage(status) || 'Access checked.';
  if (status.allowed) {
    els.accessStatusText.classList.add(
      status.tier === 'pro' || status.tier === 'basic' ? 'access-status--ok' : 'access-status--warn'
    );
  } else {
    els.accessStatusText.classList.add('access-status--error');
  }

  setAccessDetailValues(
    AccessApi?.formatTier(status) || '—',
    AccessApi?.formatValidUntil(status) || '—',
    AccessApi?.formatActive(status) || '—'
  );
}

async function refreshAccess() {
  if (!AccessApi) {
    updateAccessUi(null, 'Access API not loaded.');
    return null;
  }

  const Network = IRCTCExt?.Network;
  if (Network && !Network.isBrowserOnline()) {
    updateAccessUi(null, Network.OFFLINE_MESSAGE);
    if (els.linkAccessEmailBtn) els.linkAccessEmailBtn.disabled = true;
    return null;
  }

  updateAccessUi(null, '', { loading: true });
  setLinkAccessEmailLoading(true, 'Refreshing...');

  try {
    const status = await AccessApi.ensureAccess({ forceRefresh: true });
    updateAccessUi(status);
    return status;
  } catch (err) {
    const message = Network?.toUserNetworkMessage(err) || err.message || 'Could not reach access API. Start backend on localhost:3000.';
    updateAccessUi(null, message);
    return null;
  } finally {
    setLinkAccessEmailLoading(false);
  }
}

async function linkAccessEmail() {
  const email = els.accessEmail.value.trim();
  if (!email) {
    showToast('Enter your Buy Me a Coffee email.', true);
    switchTab('access');
    return;
  }

  setLinkAccessEmailLoading(true, 'Linking...');

  try {
    await AccessApi.ensureAccess();
    const status = await AccessApi.linkEmail(email);
    updateAccessUi(status);
    showToast(
      status.allowed
        ? 'Access linked successfully.'
        : 'Email linked, but no active license found yet. Start a trial or buy a coffee on Buy Me a Coffee first.'
    );
  } catch (err) {
    showToast(err.message || 'Could not link email.', true);
  } finally {
    setLinkAccessEmailLoading(false);
  }
}

function switchSetSection(sectionId, focusTarget) {
  if (!SET_SECTIONS.includes(sectionId)) return;
  els.setSubtabs.forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.setSection === sectionId);
  });
  els.setSubpanels.forEach((panel) => {
    panel.classList.toggle('active', panel.id === sectionId);
  });
  if (focusTarget) focusField(focusTarget);
  chrome.storage.local.set({ [POPUP_SET_SECTION_KEY]: sectionId });
}

function switchTab(tabId, focusTarget) {
  let topTab = tabId;
  let sectionId = null;

  if (LEGACY_SECTION_TABS.has(tabId)) {
    topTab = 'sets';
    sectionId = tabId;
  }

  if (!TOP_TABS.has(topTab)) topTab = 'sets';

  els.tabs.forEach((t) => t.classList.toggle('active', t.dataset.tab === topTab));
  els.panels.forEach((p) => p.classList.toggle('active', p.id === topTab));

  if (topTab === 'sets') {
    const activePanel = Array.from(els.setSubpanels).find((panel) => panel.classList.contains('active'));
    const activeSection = sectionId || activePanel?.id || 'credentials';
    switchSetSection(activeSection, focusTarget);
  } else if (focusTarget) {
    focusField(focusTarget);
  }

  chrome.storage.local.set({ [POPUP_TAB_KEY]: topTab });
}

function getSelectedAutoPayType() {
  return document.querySelector('input[name="autoPayType"]:checked')?.value || 'debit';
}

function toggleAutoPayFields() {
  const isCards = els.paymentMethod.value === 'cards';
  const autoPayOn = els.autoPayEnabled.checked;
  const cardsAutoPayOn = isCards && autoPayOn;

  els.autoPayOptions.classList.toggle('payment-subpanel--hidden', !cardsAutoPayOn);

  const type = getSelectedAutoPayType();
  const debitActive = cardsAutoPayOn && type === 'debit';
  const creditActive = cardsAutoPayOn && type === 'credit';
  const qrSelected = cardsAutoPayOn && type === 'qr';

  els.debitCardFields.classList.toggle('payment-subsection--active', debitActive);
  els.creditCardFields.classList.toggle('payment-subsection--active', creditActive);
  els.debitCardFields.classList.toggle('payment-subsection--muted', qrSelected || (cardsAutoPayOn && type === 'credit'));
  els.creditCardFields.classList.toggle('payment-subsection--muted', qrSelected || (cardsAutoPayOn && type === 'debit'));
}

function togglePaymentFields() {
  const isCards = els.paymentMethod.value === 'cards';
  els.cardsPaymentFields.classList.toggle('payment-subpanel--hidden', !isCards);
  els.upiPaymentFields.classList.toggle('payment-subpanel--hidden', isCards);
  toggleAutoPayFields();
}

function readCardDetails(prefix) {
  const name = document.getElementById(`${prefix}CardName`).value.trim();
  const number = document.getElementById(`${prefix}CardNumber`).value.replace(/\D/g, '');
  const expiry = formatCardExpiry(document.getElementById(`${prefix}CardExpiry`).value);
  const cvv = document.getElementById(`${prefix}CardCvv`).value.trim();
  return { name, number, expiry, cvv };
}

function formatCardNumber(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1-');
}

function formatCardExpiry(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function fillCardDetails(prefix, card = {}) {
  document.getElementById(`${prefix}CardName`).value = card.name || '';
  document.getElementById(`${prefix}CardNumber`).value = formatCardNumber(card.number || '');
  document.getElementById(`${prefix}CardExpiry`).value = formatCardExpiry(card.expiry || '');
  document.getElementById(`${prefix}CardCvv`).value = card.cvv || '';
}

function createPassengerRow(passenger = {}, index = 0) {
  const card = document.createElement('div');
  card.className = 'passenger-card';
  card.dataset.index = index;
  card.innerHTML = `
    <h3>Passenger ${index + 1} ${index > 0 ? '<button type="button" class="remove-passenger">Remove</button>' : ''}</h3>
    <label>Name (as per Govt. ID) <input type="text" class="p-name" placeholder="Full Name as per Govt. ID" value="${passenger.name || ''}"></label>
    <label>Age <input type="number" class="p-age" min="1" max="120" value="${passenger.age || ''}"></label>
    <label>Gender
      <select class="p-gender">
        <option value="" ${!passenger.gender ? 'selected' : ''}>Select</option>
        <option value="M" ${passenger.gender === 'M' ? 'selected' : ''}>Male</option>
        <option value="F" ${passenger.gender === 'F' ? 'selected' : ''}>Female</option>
        <option value="T" ${passenger.gender === 'T' ? 'selected' : ''}>Transgender</option>
      </select>
    </label>
    <label>Berth
      <select class="p-berth">
        <option ${passenger.berth === 'No Preference' ? 'selected' : ''}>No Preference</option>
        <option ${passenger.berth === 'Lower' ? 'selected' : ''}>Lower</option>
        <option ${passenger.berth === 'Middle' ? 'selected' : ''}>Middle</option>
        <option ${passenger.berth === 'Upper' ? 'selected' : ''}>Upper</option>
        <option ${passenger.berth === 'Window Side' ? 'selected' : ''}>Window Side</option>
        <option ${passenger.berth === 'Side Lower' ? 'selected' : ''}>Side Lower</option>
        <option ${passenger.berth === 'Side Upper' ? 'selected' : ''}>Side Upper</option>
      </select>
    </label>
    <label>Food
      <select class="p-food">
        <option value="" ${!passenger.food ? 'selected' : ''}>Select</option>
        <option ${passenger.food === 'Veg' ? 'selected' : ''}>Veg</option>
        <option ${passenger.food === 'Non-Veg' ? 'selected' : ''}>Non-Veg</option>
        <option ${passenger.food === 'No Food' ? 'selected' : ''}>No Food</option>
      </select>
    </label>
    <p class="passenger-warn hidden" role="alert"></p>
  `;
  const removeBtn = card.querySelector('.remove-passenger');
  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      card.remove();
      reindexPassengers();
      updateClassBerthWarnings();
    });
  }
  return card;
}

function reindexPassengers() {
  const cards = els.passengerList.querySelectorAll('.passenger-card');
  cards.forEach((card, i) => {
    card.dataset.index = i;
    const h3 = card.querySelector('h3');
    if (h3) {
      h3.childNodes[0].textContent = `Passenger ${i + 1} `;
    }
  });
}

function renderPassengers(passengers) {
  els.passengerList.innerHTML = '';
  const list = passengers?.length ? passengers : DEFAULT_CONFIG.passengers;
  list.forEach((p, i) => els.passengerList.appendChild(createPassengerRow(p, i)));
  updateClassBerthWarnings();
}

function readPassengers() {
  return Array.from(els.passengerList.querySelectorAll('.passenger-card')).map((card) => ({
    name: card.querySelector('.p-name').value.trim(),
    age: card.querySelector('.p-age').value.trim(),
    gender: card.querySelector('.p-gender').value,
    berth: card.querySelector('.p-berth').value,
    food: card.querySelector('.p-food').value
  }));
}

function readForm() {
  return {
    credentials: {
      username: els.username.value.trim(),
      password: els.password.value
    },
    journey: {
      from: els.fromStation.value.trim(),
      to: els.toStation.value.trim(),
      date: els.journeyDate.value,
      trainNo: els.trainNo.value.trim(),
      trainName: els.trainName.value.trim(),
      travelClass: els.travelClass.value,
      quota: els.quota.value
    },
    passengers: readPassengers(),
    preferences: {
      bookingSite: els.bookingSite?.value || 'eticket',
      paymentMethod: els.paymentMethod.value,
      cardsProvider: els.cardsProvider.value,
      upiProvider: els.upiProvider.value,
      autoPayEnabled: els.autoPayEnabled.checked,
      autoPayType: getSelectedAutoPayType(),
      debitCard: readCardDetails('debit'),
      creditCard: readCardDetails('credit')
    },
    schedule: {
      enabled: els.scheduleEnabled.checked,
      type: els.scheduleType.value
    },
    access: {
      email: els.accessEmail.value.trim()
    }
  };
}

function toInputDate(value) {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parts = value.split('/');
  if (parts.length === 3) {
    const [dd, mm, yyyy] = parts;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  return value;
}

function fillForm(config) {
  els.username.value = config.credentials?.username || '';
  els.password.value = config.credentials?.password || '';
  els.fromStation.value = config.journey?.from || '';
  els.toStation.value = config.journey?.to || '';
  els.journeyDate.value = toInputDate(config.journey?.date || '');
  els.trainNo.value = config.journey?.trainNo || '';
  els.trainName.value = config.journey?.trainName || '';
  els.travelClass.value = config.journey?.travelClass || 'SL';
  els.quota.value = config.journey?.quota || 'TATKAL';
  const bookingSite = config.preferences?.bookingSite || 'eticket';
  if (els.bookingSite) els.bookingSite.value = bookingSite;
  els.paymentMethod.value = config.preferences?.paymentMethod || 'cards';
  syncCardsProviderOptions(bookingSite, config.preferences?.cardsProvider || 'PhonePe');
  els.upiProvider.value = config.preferences?.upiProvider || 'IRCTC iPay';
  els.autoPayEnabled.checked = !!config.preferences?.autoPayEnabled;
  const autoPayType = config.preferences?.autoPayType || 'debit';
  const autoPayRadio = document.querySelector(`input[name="autoPayType"][value="${autoPayType}"]`);
  if (autoPayRadio) autoPayRadio.checked = true;
  fillCardDetails('debit', config.preferences?.debitCard);
  fillCardDetails('credit', config.preferences?.creditCard);
  togglePaymentFields();
  els.scheduleEnabled.checked = !!config.schedule?.enabled;
  els.scheduleType.value = config.schedule?.type || 'non-ac';
  els.accessEmail.value = config.access?.email || '';
  if (AccessApi && els.bmcLink) els.bmcLink.href = AccessApi.BMC_URL;
  renderPassengers(config.passengers);
  activeSetName = config.activeSetName || 'Set 1';
  updateStatusBadge(config.state?.status || 'idle', activeSetName);
  updateSetupProgress(config);
  updateJourneyWarnings();
}

function formatStatusLabel(status) {
  const normalized = String(status || 'idle');
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function updateStatusBadge(status, setName = activeSetName) {
  if (!els.statusBadge) return;
  const label = formatStatusLabel(status);
  els.statusBadge.textContent = `${setName} · ${label}`;
  els.statusBadge.classList.remove('badge--idle', 'badge--running', 'badge--error', 'badge--done');
  if (status === 'running') els.statusBadge.classList.add('badge--running');
  else if (status === 'error') els.statusBadge.classList.add('badge--error');
  else if (status === 'done') els.statusBadge.classList.add('badge--done');
  else els.statusBadge.classList.add('badge--idle');
}

function updateSetupProgress(config) {
  const progressApi = window.IRCTCExt?.SetupProgress;
  if (!progressApi || !els.setupProgressFill || !els.setupProgressLabel) return;

  const completion = progressApi.getSetupCompletion(config);
  const percent = completion.total ? Math.round((completion.done / completion.total) * 100) : 0;
  els.setupProgressFill.style.width = `${percent}%`;
  els.setupProgressLabel.textContent = `${completion.done}/${completion.total} ready`;

  els.setSubtabs.forEach((tab) => {
    const stepId = tab.dataset.step;
    if (!stepId) return;
    const step = completion.steps.find((item) => item.id === stepId);
    tab.classList.toggle('set-subtab--done', !!step?.done);
  });
}

async function loadInitialTab(config) {
  const progressApi = window.IRCTCExt?.SetupProgress;
  const ready = progressApi?.getSetupCompletion(config)?.ready;
  const data = await chrome.storage.local.get([POPUP_TAB_KEY, POPUP_SET_SECTION_KEY]);
  const savedTab = data[POPUP_TAB_KEY];
  const savedSection = data[POPUP_SET_SECTION_KEY];

  let topTab = 'sets';
  if (TOP_TABS.has(savedTab)) topTab = savedTab;
  else if (LEGACY_SECTION_TABS.has(savedTab)) topTab = 'sets';

  let sectionId = 'credentials';
  if (!ready) {
    sectionId = 'credentials';
  } else if (LEGACY_SECTION_TABS.has(savedTab)) {
    sectionId = savedTab;
  } else if (SET_SECTIONS.includes(savedSection)) {
    sectionId = savedSection;
  }

  switchTab(topTab);
  if (topTab === 'sets') switchSetSection(sectionId);
}

function readScheduleForm() {
  return {
    enabled: !!els.scheduleEnabled?.checked,
    type: els.scheduleType?.value || 'non-ac'
  };
}

async function updateScheduleStatus(schedule = readScheduleForm()) {
  if (!els.scheduleStatus) return;

  if (schedule.enabled) {
    const validationError = validateEssentials({ ...readForm(), schedule });
    if (validationError) {
      els.scheduleStatus.textContent =
        `Scheduler enabled, but auto-start will fail until details are complete: ${validationError.message}`;
      return;
    }
  }

  try {
    const info = await chrome.runtime.sendMessage({ type: 'GET_SCHEDULE_STATUS', schedule });
    els.scheduleStatus.textContent = info?.message || 'Scheduler status unavailable.';
  } catch {
    const fallback = IRCTCExt?.Schedule?.getScheduledAlarmInfo
      ? await IRCTCExt.Schedule.getScheduledAlarmInfo(schedule)
      : null;
    els.scheduleStatus.textContent = fallback?.message || 'Scheduler status unavailable.';
  }
}

async function armScheduleIfEnabled(schedule) {
  await chrome.runtime.sendMessage({ type: 'RESCHEDULE_ALARMS', schedule }).catch(() => null);
}

function isBookingActive(config) {
  return !!config?.state?.running && config.state.status !== 'stopped';
}

function updateRunControls(active) {
  setsLocked = !!active;
  if (els.startBtn) els.startBtn.hidden = setsLocked;
  if (els.stopBtn) els.stopBtn.hidden = !setsLocked;
  if (els.bookingSetSelect) els.bookingSetSelect.disabled = setsLocked;
  if (els.addSetBtn) els.addSetBtn.disabled = setsLocked;
  if (els.duplicateSetBtn) els.duplicateSetBtn.disabled = setsLocked;
  if (els.renameSetBtn) els.renameSetBtn.disabled = setsLocked;
  if (els.deleteSetBtn) els.deleteSetBtn.disabled = setsLocked;
  els.setSubtabs.forEach((tab) => {
    tab.disabled = setsLocked;
  });
  els.setsPanel?.classList.toggle('sets-panel--locked', setsLocked);
}

async function renderSetSelector() {
  if (!els.bookingSetSelect || !Storage.listSets) return;
  const sets = await Storage.listSets();
  const config = await Storage.get();
  activeSetId = config.activeSetId || sets[0]?.id || null;
  els.bookingSetSelect.innerHTML = '';
  sets.forEach((set) => {
    const option = document.createElement('option');
    option.value = set.id;
    option.textContent = set.name;
    if (set.id === activeSetId) option.selected = true;
    els.bookingSetSelect.appendChild(option);
  });
  updateRunControls(isBookingActive(config));
}

async function persistFormToActiveSet() {
  const current = await Storage.get();
  const form = readForm();
  const next = {
    ...current,
    ...form,
    journey: { ...current.journey, ...form.journey },
    credentials: { ...current.credentials, ...form.credentials },
    schedule: { ...current.schedule, ...form.schedule },
    preferences: { ...current.preferences, ...form.preferences },
    access: { ...current.access, ...form.access }
  };
  await Storage.set(next);
}

async function switchBookingSet(id) {
  if (!id || id === activeSetId) return;
  if (setsLocked) {
    showToast('Stop booking before switching sets.', true);
    return;
  }
  await persistFormToActiveSet();
  const config = await Storage.switchSet(id);
  activeSetId = config.activeSetId;
  fillForm(config);
  await renderSetSelector();
  showToast(`Switched to ${config.activeSetName || 'selected set'}.`);
}

async function addBookingSet() {
  if (setsLocked) {
    showToast('Stop booking before adding a set.', true);
    return;
  }
  await persistFormToActiveSet();
  const config = await Storage.addSet();
  activeSetId = config.activeSetId;
  fillForm(config);
  await renderSetSelector();
  showToast(`Created ${config.activeSetName || 'new set'}.`);
}

async function duplicateBookingSet() {
  if (setsLocked || !activeSetId) return;
  await persistFormToActiveSet();
  const config = await Storage.duplicateSet(activeSetId);
  activeSetId = config.activeSetId;
  fillForm(config);
  await renderSetSelector();
  showToast(`Duplicated to ${config.activeSetName || 'new set'}.`);
}

async function renameBookingSet() {
  if (setsLocked || !activeSetId) return;
  const sets = await Storage.listSets();
  const current = sets.find((set) => set.id === activeSetId);
  const name = window.prompt('Rename booking set', current?.name || 'Set');
  if (!name?.trim()) return;
  await Storage.renameSet(activeSetId, name.trim());
  activeSetName = name.trim();
  await renderSetSelector();
  const latest = await Storage.get();
  updateStatusBadge(latest.state?.status || 'idle', activeSetName);
  showToast('Set renamed.');
}

async function deleteBookingSet() {
  if (setsLocked || !activeSetId) return;
  const sets = await Storage.listSets();
  if (sets.length <= 1) {
    showToast('Cannot delete the only set.', true);
    return;
  }
  const current = sets.find((set) => set.id === activeSetId);
  if (!window.confirm(`Delete "${current?.name || 'this set'}"?`)) return;
  const config = await Storage.removeSet(activeSetId);
  activeSetId = config.activeSetId;
  fillForm(config);
  await renderSetSelector();
  showToast('Set deleted.');
}

async function load() {
  await loadMinimizedState();
  const config = await Storage.get();
  activeSetId = config.activeSetId || null;
  fillForm(config);
  await renderSetSelector();
  setAllSecretFieldsVisible(false);
  await armScheduleIfEnabled(config.schedule);
  await updateScheduleStatus(config.schedule);
  await refreshAccess();
  await loadInitialTab(config);

  IRCTCExt?.Network?.watchOnlineStatus(
    () => refreshAccess(),
    () => updateAccessUi(null, IRCTCExt.Network.OFFLINE_MESSAGE)
  );

  setInterval(async () => {
    const latest = await Storage.get();
    activeSetName = latest.activeSetName || activeSetName;
    updateStatusBadge(latest.state?.status || 'idle', activeSetName);
    updateRunControls(isBookingActive(latest));
  }, 2000);
}

['username', 'password', 'fromStation', 'toStation', 'journeyDate', 'trainNo', 'trainName', 'quota', 'travelClass'].forEach(
  (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const handler = () => {
      updateSetupProgress({ ...readForm(), activeSetName });
      if (id === 'journeyDate' || id === 'quota') updateJourneyDateWarning();
      if (id === 'travelClass') updateClassBerthWarnings();
    };
    el.addEventListener('input', handler);
    if (id === 'quota' || id === 'travelClass') el.addEventListener('change', handler);
  }
);

els.passengerList?.addEventListener('change', (event) => {
  if (!event.target.classList.contains('p-berth')) return;
  updateClassBerthWarnings();
});

els.passengerList?.addEventListener('input', (event) => {
  if (!event.target.classList.contains('p-name')) return;
  updateClassBerthWarnings();
});

async function save() {
  const current = await Storage.get();
  const form = readForm();
  const next = {
    ...current,
    ...form,
    journey: { ...current.journey, ...form.journey },
    credentials: { ...current.credentials, ...form.credentials },
    schedule: { ...current.schedule, ...form.schedule },
    preferences: { ...current.preferences, ...form.preferences },
    access: { ...current.access, ...form.access }
  };
  await Storage.set(next);
  const armed = await chrome.runtime.sendMessage({ type: 'RESCHEDULE_ALARMS', schedule: next.schedule });
  await updateScheduleStatus(next.schedule);

  if (next.schedule.enabled && armed?.when) {
    const when = IRCTCExt?.Schedule?.formatIstDateTime
      ? IRCTCExt.Schedule.formatIstDateTime(armed.when)
      : new Date(armed.when).toLocaleString();
    showToast(`Details saved. Auto-booking scheduled for ${when}.`);
  } else {
    showToast('Details saved successfully.');
  }
  const latest = await Storage.get();
  updateSetupProgress(latest);
}

function handleValidationFailure(err) {
  showToast(err.message, true);
  switchTab('sets');
  if (err.focusId) {
    switchSetSection(err.tab, err.focusId);
  } else if (err.focusSelector) {
    switchSetSection(err.tab);
    focusField(err.focusSelector);
  } else {
    switchSetSection(err.tab);
  }
}

async function startBooking() {
  const form = readForm();
  const validationError = validateEssentials(form);
  if (validationError) {
    handleValidationFailure(validationError);
    return;
  }

  const accessStatus = await refreshAccess();
  if (!AccessApi?.isStatusAllowed(accessStatus)) {
    showToast(
      'Access not active. Start a free trial or buy a coffee on Buy Me a Coffee, then link your email on the Access tab.',
      true
    );
    switchTab('access', 'accessEmail');
    return;
  }

  await save();
  const bookingSite = form.preferences?.bookingSite || 'eticket';
  const siteLabel = bookingSite === 'nget' ? 'Classic — nget' : 'Beta — eticket';

  await Storage.updateState({
    running: true,
    paused: false,
    currentStep: 'init',
    status: 'running',
    passengersDone: false,
    paymentDone: false,
    paymentPhase: null,
    paymentGateway: null,
    awaitingGateway: false,
    bookingSessionId: crypto.randomUUID(),
    tokenConsumed: false
  });
  updateStatusBadge('running', activeSetName);
  updateRunControls(true);
  els.startBtn.disabled = true;
  chrome.runtime.sendMessage(
    { type: 'START_FROM_POPUP', skipAccessCheck: true, bookingSite },
    async (response) => {
      els.startBtn.disabled = false;
      if (chrome.runtime.lastError) {
        await Storage.updateState({ running: false, status: 'idle', currentStep: 'init' });
        updateStatusBadge('idle', activeSetName);
        updateRunControls(false);
        showToast(chrome.runtime.lastError.message || 'Could not start booking.', true);
        return;
      }
      // Popup closes when IRCTC tab opens — response may be undefined even when start succeeded.
      if (!response) return;
      if (!response.ok) {
        await Storage.updateState({ running: false, status: 'idle', currentStep: 'init' });
        updateStatusBadge('idle', activeSetName);
        updateRunControls(false);
        if (response.error === 'validation_failed') {
          handleValidationFailure(response);
        } else if (response.error === 'access_denied') {
          showToast('Access expired or API unavailable. Check the Access tab.', true);
          switchTab('access', 'accessEmail');
        } else if (response.error === 'tab_open_failed') {
          showToast(response.message || 'Could not open IRCTC tab. Check extension permissions.', true);
        } else if (response.error === 'content_script_not_ready') {
          showToast('IRCTC page not ready. Reload the IRCTC tab, then click Start again.', true);
        } else {
          showToast('Could not start booking. Reload the extension and IRCTC tab, then try again.', true);
        }
        return;
      }
      const label = response.siteLabel || siteLabel;
      const setName = (await Storage.get()).activeSetName || 'active set';
      showToast(`Opening ${label} with ${setName}...`);
    }
  );
}

async function stopBooking() {
  if (els.stopBtn) els.stopBtn.disabled = true;
  try {
    const response = await chrome.runtime.sendMessage({ type: 'STOP_FROM_POPUP' });
    if (response?.ok === false) {
      throw new Error(response.error || 'Could not stop booking.');
    }
    const latest = await Storage.get();
    activeSetName = latest.activeSetName || activeSetName;
    updateStatusBadge(latest.state?.status || 'stopped', activeSetName);
    updateRunControls(false);
    showToast('Booking stopped.');
  } catch (err) {
    showToast(err.message || 'Could not stop booking.', true);
  } finally {
    if (els.stopBtn) els.stopBtn.disabled = false;
  }
}

async function clearAll() {
  await Storage.clear();
  const config = await Storage.get();
  activeSetId = config.activeSetId || null;
  fillForm(config);
  await renderSetSelector();
  setAllSecretFieldsVisible(false);
  showToast('All data cleared.');
}

els.tabs.forEach((tab) => {
  tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});

els.setSubtabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    switchTab('sets');
    switchSetSection(tab.dataset.setSection);
  });
});

els.addPassenger.addEventListener('click', () => {
  const count = els.passengerList.querySelectorAll('.passenger-card').length;
  if (count >= 6) {
    showToast('Maximum 6 passengers allowed.', true);
    return;
  }
  els.passengerList.appendChild(createPassengerRow({}, count));
  updateClassBerthWarnings();
});

els.scheduleEnabled?.addEventListener('change', () => updateScheduleStatus());
els.scheduleType?.addEventListener('change', () => updateScheduleStatus());

els.paymentMethod.addEventListener('change', togglePaymentFields);
els.bookingSite?.addEventListener('change', () => {
  const bookingSite = els.bookingSite.value || 'eticket';
  syncCardsProviderOptions(bookingSite);
  Storage.update({ preferences: { bookingSite } }).catch(() => null);
});
els.autoPayEnabled.addEventListener('change', toggleAutoPayFields);
document.querySelectorAll('input[name="autoPayType"]').forEach((radio) => {
  radio.addEventListener('change', toggleAutoPayFields);
});

['debitCardNumber', 'creditCardNumber'].forEach((id) => {
  document.getElementById(id)?.addEventListener('input', (e) => {
    const formatted = formatCardNumber(e.target.value);
    if (e.target.value !== formatted) e.target.value = formatted;
  });
});

['debitCardExpiry', 'creditCardExpiry'].forEach((id) => {
  document.getElementById(id)?.addEventListener('input', (e) => {
    const formatted = formatCardExpiry(e.target.value);
    if (e.target.value !== formatted) e.target.value = formatted;
  });
});

els.bookingSetSelect?.addEventListener('change', (e) => {
  switchBookingSet(e.target.value).catch((err) => showToast(err.message || 'Could not switch set.', true));
});
els.addSetBtn?.addEventListener('click', () => {
  addBookingSet().catch((err) => showToast(err.message || 'Could not add set.', true));
});
els.duplicateSetBtn?.addEventListener('click', () => {
  duplicateBookingSet().catch((err) => showToast(err.message || 'Could not duplicate set.', true));
});
els.renameSetBtn?.addEventListener('click', () => {
  renameBookingSet().catch((err) => showToast(err.message || 'Could not rename set.', true));
});
els.deleteSetBtn?.addEventListener('click', () => {
  deleteBookingSet().catch((err) => showToast(err.message || 'Could not delete set.', true));
});

els.saveBtn.addEventListener('click', save);
els.startBtn.addEventListener('click', startBooking);
els.stopBtn?.addEventListener('click', stopBooking);
els.clearBtn.addEventListener('click', clearAll);
els.linkAccessEmailBtn?.addEventListener('click', linkAccessEmail);
els.toggleAccessEmailBtn?.addEventListener('click', toggleAccessEmailVisibility);
els.toggleUsernameBtn?.addEventListener('click', toggleUsernameVisibility);
els.togglePasswordBtn?.addEventListener('click', togglePasswordVisibility);

[
  { input: () => els.debitCardName, btn: () => els.toggleDebitCardNameBtn, label: 'card name' },
  { input: () => els.debitCardNumber, btn: () => els.toggleDebitCardNumberBtn, label: 'card number' },
  { input: () => els.debitCardCvv, btn: () => els.toggleDebitCardCvvBtn, label: 'CVV' },
  { input: () => els.creditCardName, btn: () => els.toggleCreditCardNameBtn, label: 'card name' },
  { input: () => els.creditCardNumber, btn: () => els.toggleCreditCardNumberBtn, label: 'card number' },
  { input: () => els.creditCardCvv, btn: () => els.toggleCreditCardCvvBtn, label: 'CVV' }
].forEach(({ input, btn, label }) => {
  btn()?.addEventListener('click', () => {
    const el = input();
    const b = btn();
    if (!el || !b) return;
    setFieldMaskVisible(el, b, el.type === 'password', label);
  });
});

els.toggleMinimizeBtn.addEventListener('click', () => {
  setMinimized(!document.body.classList.contains('popup-minimized'));
});

load();
