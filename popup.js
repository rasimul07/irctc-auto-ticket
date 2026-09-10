const DEFAULT_CONFIG = window.IRCTC_DEFAULT_CONFIG;
const Storage = window.IRCTCStorage;
const AccessApi = window.IRCTCExt?.AccessApi;

const els = {
  tabs: document.querySelectorAll('.tab'),
  panels: document.querySelectorAll('.panel'),
  accessStatusText: document.getElementById('accessStatusText'),
  accessTier: document.getElementById('accessTier'),
  accessValidUntil: document.getElementById('accessValidUntil'),
  accessActive: document.getElementById('accessActive'),
  accessEmail: document.getElementById('accessEmail'),
  linkAccessEmailBtn: document.getElementById('linkAccessEmailBtn'),
  bmcLink: document.getElementById('bmcLink'),
  username: document.getElementById('username'),
  password: document.getElementById('password'),
  fromStation: document.getElementById('fromStation'),
  toStation: document.getElementById('toStation'),
  journeyDate: document.getElementById('journeyDate'),
  trainNo: document.getElementById('trainNo'),
  trainName: document.getElementById('trainName'),
  travelClass: document.getElementById('travelClass'),
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
  debitCardNumber: document.getElementById('debitCardNumber'),
  debitCardExpiry: document.getElementById('debitCardExpiry'),
  debitCardCvv: document.getElementById('debitCardCvv'),
  creditCardName: document.getElementById('creditCardName'),
  creditCardNumber: document.getElementById('creditCardNumber'),
  creditCardExpiry: document.getElementById('creditCardExpiry'),
  creditCardCvv: document.getElementById('creditCardCvv'),
  passengerList: document.getElementById('passengerList'),
  addPassenger: document.getElementById('addPassenger'),
  scheduleEnabled: document.getElementById('scheduleEnabled'),
  scheduleType: document.getElementById('scheduleType'),
  saveBtn: document.getElementById('saveBtn'),
  startBtn: document.getElementById('startBtn'),
  clearBtn: document.getElementById('clearBtn'),
  message: document.getElementById('message'),
  statusBadge: document.getElementById('statusBadge'),
  toggleMinimizeBtn: document.getElementById('toggleMinimizeBtn'),
  popupBody: document.getElementById('popupBody'),
  toast: document.getElementById('toast')
};

const POPUP_MINIMIZED_KEY = 'irctcPopupMinimized';
let toastTimer = null;

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

function showMessage(text, isError = false) {
  els.message.textContent = text;
  els.message.classList.toggle('error', isError);
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

function isCardComplete(card) {
  return !!(card?.name && card?.number && card?.expiry && card?.cvv);
}

function validateEssentials(form) {
  const { credentials, journey, passengers, preferences } = form;

  if (!credentials.username) {
    return { tab: 'credentials', focusId: 'username', message: 'Please enter your IRCTC username.' };
  }
  if (!credentials.password) {
    return { tab: 'credentials', focusId: 'password', message: 'Please enter your IRCTC password.' };
  }
  if (!journey.from) {
    return { tab: 'journey', focusId: 'fromStation', message: 'Please enter the From station.' };
  }
  if (!journey.to) {
    return { tab: 'journey', focusId: 'toStation', message: 'Please enter the To station.' };
  }
  if (!journey.date) {
    return { tab: 'journey', focusId: 'journeyDate', message: 'Please select the journey date.' };
  }
  if (!journey.trainNo && !journey.trainName) {
    return {
      tab: 'journey',
      focusId: 'trainNo',
      message: 'Enter a train number or train name.'
    };
  }

  const hasNamedPassenger = (passengers || []).some((p) => (p.name || '').trim());
  if (!hasNamedPassenger) {
    return {
      tab: 'passengers',
      focusSelector: '.passenger-card .p-name',
      message: 'Add at least one passenger with a name matching your IRCTC profile.'
    };
  }

  if (preferences?.autoPayEnabled && preferences.paymentMethod === 'cards') {
    const type = preferences.autoPayType || 'debit';
    if (type === 'debit' || type === 'credit') {
      const card = type === 'credit' ? preferences.creditCard : preferences.debitCard;
      const prefix = type === 'credit' ? 'credit' : 'debit';
      const label = type === 'credit' ? 'credit' : 'debit';
      if (!card?.name) {
        return {
          tab: 'payment',
          focusId: `${prefix}CardName`,
          message: `Enter ${label} card name for auto pay.`
        };
      }
      if (!card?.number) {
        return {
          tab: 'payment',
          focusId: `${prefix}CardNumber`,
          message: `Enter ${label} card number for auto pay.`
        };
      }
      if (!card?.expiry) {
        return {
          tab: 'payment',
          focusId: `${prefix}CardExpiry`,
          message: `Enter ${label} card expiry for auto pay.`
        };
      }
      if (!card?.cvv) {
        return {
          tab: 'payment',
          focusId: `${prefix}CardCvv`,
          message: `Enter ${label} card CVV for auto pay.`
        };
      }
      if (!isCardComplete(card)) {
        return {
          tab: 'payment',
          focusId: `${prefix}CardName`,
          message: `Complete all ${label} card fields for auto pay.`
        };
      }
    }
  }

  return null;
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

  updateAccessUi(null, '', { loading: true });
  if (els.linkAccessEmailBtn) els.linkAccessEmailBtn.disabled = true;

  try {
    const status = await AccessApi.ensureAccess({ forceRefresh: true });
    updateAccessUi(status);
    return status;
  } catch (err) {
    updateAccessUi(null, err.message || 'Could not reach access API. Start backend on localhost:3000.');
    return null;
  } finally {
    if (els.linkAccessEmailBtn) els.linkAccessEmailBtn.disabled = false;
  }
}

async function linkAccessEmail() {
  const email = els.accessEmail.value.trim();
  if (!email) {
    showMessage('Enter your Buy Me a Coffee email.', true);
    switchTab('access');
    return;
  }

  if (els.linkAccessEmailBtn) els.linkAccessEmailBtn.disabled = true;

  try {
    await AccessApi.ensureAccess();
    const status = await AccessApi.linkEmail(email);
    updateAccessUi(status);
    showMessage(
      status.allowed
        ? 'Access linked successfully.'
        : 'Email linked, but no active license found yet. Start a trial or buy a coffee on Buy Me a Coffee first.'
    );
  } catch (err) {
    showMessage(err.message || 'Could not link email.', true);
  } finally {
    if (els.linkAccessEmailBtn) els.linkAccessEmailBtn.disabled = false;
  }
}

function switchTab(tabId, focusTarget) {
  els.tabs.forEach((t) => t.classList.toggle('active', t.dataset.tab === tabId));
  els.panels.forEach((p) => p.classList.toggle('active', p.id === tabId));
  if (focusTarget) focusField(focusTarget);
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
  const number = document.getElementById(`${prefix}CardNumber`).value.replace(/\s+/g, '');
  const expiry = document.getElementById(`${prefix}CardExpiry`).value.trim();
  const cvv = document.getElementById(`${prefix}CardCvv`).value.trim();
  return { name, number, expiry, cvv };
}

function formatCardExpiry(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function fillCardDetails(prefix, card = {}) {
  document.getElementById(`${prefix}CardName`).value = card.name || '';
  document.getElementById(`${prefix}CardNumber`).value = card.number || '';
  document.getElementById(`${prefix}CardExpiry`).value = card.expiry || '';
  document.getElementById(`${prefix}CardCvv`).value = card.cvv || '';
}

function createPassengerRow(passenger = {}, index = 0) {
  const card = document.createElement('div');
  card.className = 'passenger-card';
  card.dataset.index = index;
  card.innerHTML = `
    <h3>Passenger ${index + 1} ${index > 0 ? '<button type="button" class="remove-passenger">Remove</button>' : ''}</h3>
    <label>Name <input type="text" class="p-name" value="${passenger.name || ''}"></label>
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
  `;
  const removeBtn = card.querySelector('.remove-passenger');
  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      card.remove();
      reindexPassengers();
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
  els.paymentMethod.value = config.preferences?.paymentMethod || 'cards';
  els.cardsProvider.value = config.preferences?.cardsProvider || 'PhonePe';
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
  updateStatusBadge(config.state?.status || 'idle');
}

function updateStatusBadge(status) {
  els.statusBadge.textContent = status.charAt(0).toUpperCase() + status.slice(1);
}

async function load() {
  await loadMinimizedState();
  const config = await Storage.get();
  fillForm(config);
  await refreshAccess();
  setInterval(async () => {
    const latest = await Storage.get();
    updateStatusBadge(latest.state?.status || 'idle');
  }, 2000);
}

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
  chrome.runtime.sendMessage({ type: 'RESCHEDULE_ALARMS', schedule: next.schedule });
  showMessage('Details saved successfully.');
}

function handleValidationFailure(err) {
  showToast(err.message, true);
  if (err.focusId) {
    switchTab(err.tab, err.focusId);
  } else if (err.focusSelector) {
    switchTab(err.tab);
    focusField(err.focusSelector);
  } else {
    switchTab(err.tab);
  }
}

async function startBooking() {
  const form = readForm();
  const validationError = validateEssentials(form);
  if (validationError) {
    handleValidationFailure(validationError);
    return;
  }

  await save();
  const accessStatus = await refreshAccess();
  if (!accessStatus?.allowed) {
    showToast(
      'Access not active. Start a free trial or buy a coffee on Buy Me a Coffee, then link your email on the Access tab.',
      true
    );
    switchTab('access', 'accessEmail');
    return;
  }

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
  updateStatusBadge('running');
  chrome.runtime.sendMessage({ type: 'START_FROM_POPUP' }, async (response) => {
    if (chrome.runtime.lastError) {
      await Storage.updateState({ running: false, status: 'idle', currentStep: 'init' });
      updateStatusBadge('idle');
      showToast(chrome.runtime.lastError.message || 'Could not start booking.', true);
      return;
    }
    if (!response?.ok) {
      await Storage.updateState({ running: false, status: 'idle', currentStep: 'init' });
      updateStatusBadge('idle');
      showToast('Access expired or API unavailable. Check the Access tab.', true);
      switchTab('access', 'accessEmail');
      return;
    }
    showToast('Opening IRCTC and starting automation...');
  });
}

async function clearAll() {
  await Storage.clear();
  fillForm(DEFAULT_CONFIG);
  showMessage('All data cleared.');
}

els.tabs.forEach((tab) => {
  tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});

els.addPassenger.addEventListener('click', () => {
  const count = els.passengerList.querySelectorAll('.passenger-card').length;
  if (count >= 6) {
    showMessage('Maximum 6 passengers allowed.', true);
    return;
  }
  els.passengerList.appendChild(createPassengerRow({}, count));
});

els.paymentMethod.addEventListener('change', togglePaymentFields);
els.autoPayEnabled.addEventListener('change', toggleAutoPayFields);
document.querySelectorAll('input[name="autoPayType"]').forEach((radio) => {
  radio.addEventListener('change', toggleAutoPayFields);
});

['debitCardExpiry', 'creditCardExpiry'].forEach((id) => {
  document.getElementById(id)?.addEventListener('blur', (e) => {
    e.target.value = formatCardExpiry(e.target.value);
  });
});

els.saveBtn.addEventListener('click', save);
els.startBtn.addEventListener('click', startBooking);
els.clearBtn.addEventListener('click', clearAll);
els.linkAccessEmailBtn?.addEventListener('click', linkAccessEmail);
els.toggleMinimizeBtn.addEventListener('click', () => {
  setMinimized(!document.body.classList.contains('popup-minimized'));
});

load();
