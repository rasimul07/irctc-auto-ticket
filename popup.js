const DEFAULT_CONFIG = window.IRCTC_DEFAULT_CONFIG;
const Storage = window.IRCTCStorage;

const els = {
  tabs: document.querySelectorAll('.tab'),
  panels: document.querySelectorAll('.panel'),
  username: document.getElementById('username'),
  password: document.getElementById('password'),
  fromStation: document.getElementById('fromStation'),
  toStation: document.getElementById('toStation'),
  journeyDate: document.getElementById('journeyDate'),
  trainNo: document.getElementById('trainNo'),
  travelClass: document.getElementById('travelClass'),
  quota: document.getElementById('quota'),
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
  popupBody: document.getElementById('popupBody')
};

const POPUP_MINIMIZED_KEY = 'irctcPopupMinimized';

function setMinimized(minimized) {
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

function switchTab(tabId) {
  els.tabs.forEach((t) => t.classList.toggle('active', t.dataset.tab === tabId));
  els.panels.forEach((p) => p.classList.toggle('active', p.id === tabId));
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
        <option ${passenger.berth === 'Side Lower' ? 'selected' : ''}>Side Lower</option>
        <option ${passenger.berth === 'Side Upper' ? 'selected' : ''}>Side Upper</option>
      </select>
    </label>
    <label>Food
      <select class="p-food">
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
      travelClass: els.travelClass.value,
      quota: els.quota.value
    },
    passengers: readPassengers(),
    schedule: {
      enabled: els.scheduleEnabled.checked,
      type: els.scheduleType.value
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
  els.travelClass.value = config.journey?.travelClass || 'SL';
  els.quota.value = config.journey?.quota || 'TATKAL';
  els.scheduleEnabled.checked = !!config.schedule?.enabled;
  els.scheduleType.value = config.schedule?.type || 'non-ac';
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
    schedule: { ...current.schedule, ...form.schedule }
  };
  await Storage.set(next);
  chrome.runtime.sendMessage({ type: 'RESCHEDULE_ALARMS', schedule: next.schedule });
  showMessage('Details saved successfully.');
}

async function startBooking() {
  await save();
  const config = await Storage.get();
  if (!config.credentials.username || !config.credentials.password) {
    showMessage('Please enter IRCTC username and password.', true);
    switchTab('credentials');
    return;
  }
  if (!config.journey.from || !config.journey.to || !config.journey.date) {
    showMessage('Please fill journey from, to, and date.', true);
    switchTab('journey');
    return;
  }

  await Storage.updateState({ running: true, paused: false, currentStep: 'init', status: 'running' });
  updateStatusBadge('running');
  chrome.runtime.sendMessage({ type: 'START_FROM_POPUP' });
  showMessage('Opening IRCTC and starting automation...');
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

els.saveBtn.addEventListener('click', save);
els.startBtn.addEventListener('click', startBooking);
els.clearBtn.addEventListener('click', clearAll);
els.toggleMinimizeBtn.addEventListener('click', () => {
  setMinimized(!document.body.classList.contains('popup-minimized'));
});

load();
