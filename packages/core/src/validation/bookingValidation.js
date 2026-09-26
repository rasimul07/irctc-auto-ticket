function isCardComplete(card) {
  return !!(card?.name && card?.number && card?.expiry && card?.cvv);
}

function getIstDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);

  const get = (type) => Number(parts.find((p) => p.type === type)?.value || 0);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day')
  };
}

function formatIsoDate(year, month, day) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function getNextIstDateIso(date = new Date()) {
  const { year, month, day } = getIstDateParts(date);
  const nextDay = new Date(Date.UTC(year, month - 1, day + 1));
  return formatIsoDate(nextDay.getUTCFullYear(), nextDay.getUTCMonth() + 1, nextDay.getUTCDate());
}

export function isTatkalQuota(quota) {
  return String(quota || '').trim().toUpperCase() === 'TATKAL';
}

function normalizeJourneyDateIso(dateValue) {
  if (!dateValue) return '';
  const iso = String(dateValue).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const parts = String(dateValue).split('/');
  if (parts.length === 3) {
    const [dd, mm, yyyy] = parts;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  return '';
}

function formatIstDateLabel(isoDate) {
  const match = String(isoDate).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return isoDate;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

export function getTatkalJourneyDateWarning(journey = {}) {
  if (!isTatkalQuota(journey.quota) || !journey.date) return null;

  const expected = getNextIstDateIso();
  const actual = normalizeJourneyDateIso(journey.date);
  if (!actual || actual === expected) return null;

  return `Tatkal quota requires journey date to be tomorrow (${formatIstDateLabel(expected)} IST).`;
}

const CHAIR_CLASSES = new Set(['CC', '2S', 'EC', 'EV']);
const SLEEPER_BERTH_OPTIONS = new Set(['Lower', 'Middle', 'Upper', 'Side Lower', 'Side Upper']);

export function isChairClass(travelClass) {
  return CHAIR_CLASSES.has(String(travelClass || '').trim().toUpperCase());
}

export function isBerthMeaningfulForClass(travelClass, berth) {
  const normalizedBerth = String(berth || '').trim();
  if (!normalizedBerth || normalizedBerth === 'No Preference' || normalizedBerth === 'Window Side') {
    return true;
  }
  if (!isChairClass(travelClass)) return true;
  return !SLEEPER_BERTH_OPTIONS.has(normalizedBerth);
}

function buildClassBerthMismatchMessage(travelClass, berth) {
  return `Berth "${berth}" does not apply to class ${travelClass}. Use No Preference or Window Side.`;
}

export function getClassBerthWarnings(config = {}) {
  const journey = config.journey || {};
  const passengers = config.passengers || [];
  const travelClass = String(journey.travelClass || '').trim();

  if (!isChairClass(travelClass)) {
    return {
      journey: null,
      passengers: [],
      blockingMessage: null,
      tab: null,
      focusId: null,
      focusSelector: null
    };
  }

  const passengerWarnings = passengers
    .map((passenger, index) => {
      if (!(passenger.name || '').trim()) return null;
      const berth = String(passenger.berth || '').trim();
      if (isBerthMeaningfulForClass(travelClass, berth)) return null;
      return {
        index,
        message: buildClassBerthMismatchMessage(travelClass, berth)
      };
    })
    .filter(Boolean);

  const first = passengerWarnings[0] || null;

  return {
    journey: passengerWarnings.length
      ? `Chair class ${travelClass} only supports No Preference or Window Side berth.`
      : null,
    passengers: passengerWarnings,
    blockingMessage: first?.message || null,
    tab: first ? 'passengers' : null,
    focusId: null,
    focusSelector: first ? `.passenger-card[data-index="${first.index}"] .p-berth` : null
  };
}

/**
 * Returns null when valid, or { tab, focusId?, focusSelector?, message }.
 */
export function validateBookingConfig(config) {
  const credentials = config?.credentials || {};
  const journey = config?.journey || {};
  const passengers = config?.passengers || [];
  const preferences = config?.preferences || {};

  if (!credentials.username?.trim()) {
    return { tab: 'credentials', focusId: 'username', message: 'Please enter your IRCTC username.' };
  }
  if (!credentials.password) {
    return { tab: 'credentials', focusId: 'password', message: 'Please enter your IRCTC password.' };
  }
  if (!journey.from?.trim()) {
    return { tab: 'journey', focusId: 'fromStation', message: 'Please enter the From station.' };
  }
  if (!journey.to?.trim()) {
    return { tab: 'journey', focusId: 'toStation', message: 'Please enter the To station.' };
  }
  if (!journey.date) {
    return { tab: 'journey', focusId: 'journeyDate', message: 'Please select the journey date.' };
  }
  const tatkalDateWarning = getTatkalJourneyDateWarning(journey);
  if (tatkalDateWarning) {
    return { tab: 'journey', focusId: 'journeyDate', message: tatkalDateWarning };
  }
  const classBerthWarnings = getClassBerthWarnings(config);
  if (classBerthWarnings.blockingMessage) {
    return {
      tab: classBerthWarnings.tab,
      focusId: classBerthWarnings.focusId,
      focusSelector: classBerthWarnings.focusSelector,
      message: classBerthWarnings.blockingMessage
    };
  }
  if (!journey.trainNo?.trim() && !journey.trainName?.trim()) {
    return {
      tab: 'journey',
      focusId: 'trainNo',
      message: 'Enter a train number or train name.'
    };
  }

  const hasNamedPassenger = passengers.some((p) => (p.name || '').trim());
  if (!hasNamedPassenger) {
    return {
      tab: 'passengers',
      focusSelector: '.passenger-card .p-name',
      message: 'Add at least one passenger with a name matching your IRCTC profile.'
    };
  }

  if (preferences.autoPayEnabled && preferences.paymentMethod === 'cards') {
    const type = preferences.autoPayType || 'debit';
    if (type === 'debit' || type === 'credit') {
      const card = type === 'credit' ? preferences.creditCard : preferences.debitCard;
      const prefix = type === 'credit' ? 'credit' : 'debit';
      const label = type === 'credit' ? 'credit' : 'debit';
      if (!card?.name) {
        return { tab: 'payment', focusId: `${prefix}CardName`, message: `Enter ${label} card name for auto pay.` };
      }
      if (!card?.number) {
        return { tab: 'payment', focusId: `${prefix}CardNumber`, message: `Enter ${label} card number for auto pay.` };
      }
      if (!card?.expiry) {
        return { tab: 'payment', focusId: `${prefix}CardExpiry`, message: `Enter ${label} card expiry for auto pay.` };
      }
      if (!card?.cvv) {
        return { tab: 'payment', focusId: `${prefix}CardCvv`, message: `Enter ${label} card CVV for auto pay.` };
      }
      if (!isCardComplete(card)) {
        return { tab: 'payment', focusId: `${prefix}CardName`, message: `Complete all ${label} card fields for auto pay.` };
      }
    }
  }

  return null;
}
