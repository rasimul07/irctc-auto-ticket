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
    EV: 'Vistadome AC (EV)'
  },

  CLASS_OPTIONS: ['SL', '3A', '2A', '1A', 'CC', '2S', '3E', 'EC', 'EV'],

  QUOTA_OPTIONS: ['TATKAL', 'GENERAL', 'LADIES', 'LOWER BERTH/SR.CITIZEN'],

  GENDER_OPTIONS: ['M', 'F', 'T'],

  BERTH_OPTIONS: [
    'No Preference',
    'Lower',
    'Middle',
    'Upper',
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

  quotaOptionText(quota) {
    const key = IRCTCExt.Stations.normalizeQuota(quota);
    if (key === 'TATKAL') return 'TATKAL';
    if (key === 'LADIES') return 'LADIES';
    if (key === 'GENERAL') return 'GENERAL';
    if (key.includes('LOWER')) return 'LOWER BERTH/SR.CITIZEN';
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
  }
};
