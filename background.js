const IRCTC_URL = 'https://www.irctc.co.in/eticket/train-search';
const TRAIN_SEARCH_PATH = '/eticket/train-search';
const ETICKET_URL_PATTERN = 'https://www.irctc.co.in/eticket/*';
const TRAIN_SEARCH_URL_PATTERN = 'https://www.irctc.co.in/eticket/train-search*';
const ALARM_AC = 'tatkal-ac';
const ALARM_NON_AC = 'tatkal-non-ac';

const CONTENT_SCRIPT_FILES = [
  'lib/selectors.js',
  'lib/wait.js',
  'lib/modals.js',
  'lib/events.js',
  'lib/storage.js',
  'lib/stations.js',
  'lib/trainList.js',
  'lib/passengers.js',
  'lib/psgnPreferences.js',
  'overlay/overlay.js',
  'overlay/paymentReview.js',
  'flows/login.js',
  'flows/search.js',
  'flows/booking.js',
  'content_script.js'
];

const CONTENT_CSS_FILES = ['overlay/overlay.css', 'overlay/paymentReview.css'];

function getNextIstTime(hour, minute = 0, second = 0) {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const istOffset = 5.5 * 60 * 60000;
  const istNow = new Date(utc + istOffset);

  const target = new Date(istNow);
  target.setHours(hour, minute, second, 0);

  if (target <= istNow) {
    target.setDate(target.getDate() + 1);
  }

  const targetUtc = target.getTime() - istOffset;
  return targetUtc;
}

async function scheduleAlarms(schedule) {
  await chrome.alarms.clear(ALARM_AC);
  await chrome.alarms.clear(ALARM_NON_AC);

  if (!schedule?.enabled) return;

  if (schedule.type === 'ac') {
    chrome.alarms.create(ALARM_AC, { when: getNextIstTime(10, 0, 0) });
  } else {
    chrome.alarms.create(ALARM_NON_AC, { when: getNextIstTime(11, 0, 0) });
  }
}

async function findTrainSearchTab() {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (activeTab?.url?.includes(TRAIN_SEARCH_PATH)) {
    return activeTab;
  }

  const trainSearchTabs = await chrome.tabs.query({ url: TRAIN_SEARCH_URL_PATTERN });
  if (trainSearchTabs.length) {
    return trainSearchTabs[0];
  }

  const eticketTabs = await chrome.tabs.query({ url: ETICKET_URL_PATTERN });
  return eticketTabs[0] || null;
}

async function ensureContentScripts(tabId) {
  try {
    const res = await chrome.tabs.sendMessage(tabId, { type: 'PING' });
    if (res?.ok) return true;
  } catch {
    // Content script not loaded on this tab yet.
  }

  await chrome.scripting.executeScript({
    target: { tabId },
    files: CONTENT_SCRIPT_FILES
  });
  await chrome.scripting.insertCSS({
    target: { tabId },
    files: CONTENT_CSS_FILES
  });

  await new Promise((r) => setTimeout(r, 300));
  return true;
}

async function sendStartBooking(tabId, attempt = 0) {
  try {
    await ensureContentScripts(tabId);
    await chrome.tabs.sendMessage(tabId, { type: 'START_BOOKING' });
    return true;
  } catch (err) {
    if (attempt < 15) {
      await new Promise((r) => setTimeout(r, 800));
      return sendStartBooking(tabId, attempt + 1);
    }
    console.error('[IRCTC-Bot] Failed to start on tab', tabId, err);
    return false;
  }
}
async function waitForTabReady(tabId) {
  const tab = await chrome.tabs.get(tabId);
  if (tab.status === 'complete' && tab.url && tab.url.includes('irctc.co.in')) {
    await new Promise((r) => setTimeout(r, 800));
    return;
  }

  await new Promise((resolve) => {
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(onUpdated);
      resolve();
    }, 20000);

    function onUpdated(id, info, updated) {
      if (id === tabId && info.status === 'complete' && updated.url?.includes('irctc.co.in')) {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(onUpdated);
        resolve();
      }
    }
    chrome.tabs.onUpdated.addListener(onUpdated);
  });
  await new Promise((r) => setTimeout(r, 800));
}

async function openIrctcAndStart() {
  const existingTab = await findTrainSearchTab();
  let tabId;

  if (existingTab) {
    tabId = existingTab.id;
    const alreadyOnTrainSearch = existingTab.url?.includes(TRAIN_SEARCH_PATH);
    if (alreadyOnTrainSearch) {
      await chrome.tabs.update(tabId, { active: true });
    } else {
      await chrome.tabs.update(tabId, { active: true, url: IRCTC_URL });
      await waitForTabReady(tabId);
    }
  } else {
    const tab = await chrome.tabs.create({ url: IRCTC_URL, active: true });
    tabId = tab.id;
    await waitForTabReady(tabId);
  }

  await sendStartBooking(tabId);
}

chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get('irctcConfig');
  if (data.irctcConfig?.schedule) {
    await scheduleAlarms(data.irctcConfig.schedule);
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.irctcConfig?.newValue?.schedule) {
    scheduleAlarms(changes.irctcConfig.newValue.schedule);
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_AC || alarm.name === ALARM_NON_AC) {
    const data = await chrome.storage.local.get('irctcConfig');
    const config = data.irctcConfig;
    if (config?.schedule?.enabled) {
      await chrome.storage.local.set({
        irctcConfig: {
          ...config,
          state: { ...config.state, running: true, currentStep: 'init', status: 'scheduled' }
        }
      });
      await openIrctcAndStart();
      await scheduleAlarms(config.schedule);
    }
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'START_FROM_POPUP') {
    openIrctcAndStart().then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg.type === 'RESCHEDULE_ALARMS') {
    scheduleAlarms(msg.schedule).then(() => sendResponse({ ok: true }));
    return true;
  }
});
