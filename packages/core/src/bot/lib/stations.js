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

  isTatkalQuota(quota) {
    const key = IRCTCExt.Stations.normalizeQuota(quota);
    return key === 'TATKAL' || key === 'PREMIUM TATKAL' || key === 'PREMIUM_TATKAL';
  },

  isAcClass(travelClass) {
    const c = String(travelClass || '').toUpperCase().trim();
    return IRCTCExt.Stations.AC_CLASSES.includes(c);
  },

  getTatkalOpeningTime(config = {}) {
    const journey = config.journey || {};
    const schedule = config.schedule || {};
    const isAc =
      schedule.type === 'ac' ||
      (schedule.type !== 'non-ac' && IRCTCExt.Stations.isAcClass(journey.travelClass));

    const targetHour = isAc ? 10 : 11;
    const targetMinute = 0;

    let year = 0;
    let month = 0;
    let day = 0;
    let hour = 0;
    let minute = 0;
    let second = 0;

    try {
      const istParts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).formatToParts(new Date());

      const get = (type) => Number(istParts.find((p) => p.type === type)?.value || 0);
      year = get('year');
      month = get('month');
      day = get('day');
      hour = get('hour') % 24;
      minute = get('minute');
      second = get('second');
    } catch (_) {
      const now = new Date();
      year = now.getFullYear();
      month = now.getMonth() + 1;
      day = now.getDate();
      hour = now.getHours();
      minute = now.getMinutes();
      second = now.getSeconds();
    }

    const pad = (n) => String(n).padStart(2, '0');
    const targetMs = new Date(
      `${year}-${pad(month)}-${pad(day)}T${pad(targetHour)}:${pad(targetMinute)}:00+05:30`
    ).getTime();

    const nowSeconds = hour * 3600 + minute * 60 + second;
    const targetSeconds = targetHour * 3600 + targetMinute * 60;
    const diffSeconds = targetSeconds - nowSeconds;
    const isPending = diffSeconds > 0 && diffSeconds <= 15 * 60;

    return {
      isAc,
      targetHour,
      targetMinute,
      targetTimeStr: `${pad(targetHour)}:${pad(targetMinute)}:00 AM`,
      targetMs,
      isPending,
      remainingMs: targetMs - Date.now()
    };
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
