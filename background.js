importScripts(
  'lib/global.js',
  'lib/storage.js',
  'lib/accessConfig.js',
  'lib/api.js',
  'lib/bookingValidation.js',
  'sites/registry.js',
  'sites/eticket/config.js',
  'sites/nget/config.js'
);

IRCTCExt.SiteRegistry.register(IRCTCExt.EticketConfig);
IRCTCExt.SiteRegistry.register(IRCTCExt.NgetConfig);

const ALARM_AC = 'tatkal-ac';
const ALARM_NON_AC = 'tatkal-non-ac';

const CONTENT_SCRIPT_FILES = [
  'sites/registry.js',
  'sites/eticket/config.js',
  'sites/eticket/paths.js',
  'sites/eticket/selectors.js',
  'sites/eticket/trainList.js',
  'sites/eticket/flows/login.js',
  'sites/eticket/flows/search.js',
  'sites/eticket/flows/booking.js',
  'sites/eticket/index.js',
  'sites/nget/config.js',
  'sites/nget/paths.js',
  'sites/nget/selectors.js',
  'sites/nget/trainList.js',
  'sites/nget/flows/login.js',
  'sites/nget/flows/search.js',
  'sites/nget/flows/booking.js',
  'sites/nget/index.js',
  'lib/wait.js',
  'lib/modals.js',
  'lib/events.js',
  'lib/storage.js',
  'lib/accessConfig.js',
  'lib/api.js',
  'lib/stations.js',
  'lib/passengers.js',
  'lib/psgnPreferences.js',
  'lib/bkgPayment.js',
  'overlay/overlay.js',
  'overlay/paymentReview.js',
  'content_script.js'
];

const CONTENT_CSS_FILES = ['overlay/overlay.css', 'overlay/paymentReview.css'];

const GATEWAY_SCRIPT_FILES = [
  'sites/eticket/selectors.js',
  'lib/wait.js',
  'lib/events.js',
  'lib/storage.js',
  'lib/bkgPayment.js',
  'lib/gateways/irctcIpay.js',
  'lib/gateways/phonepe.js',
  'lib/gateways/index.js',
  'overlay/overlay.js',
  'gateway_script.js'
];
const GATEWAY_CSS_FILES = ['overlay/overlay.css'];

function isGatewayUrl(url) {
  if (!url) return false;
  return url.includes('irctcipay.com') || url.includes('phonepe.com');
}

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

async function getActiveSite() {
  const data = await chrome.storage.local.get('irctcConfig');
  return IRCTCExt.SiteRegistry.get(data.irctcConfig);
}

function isTabOnSite(tab, site) {
  if (!tab?.url || !site?.id) return false;
  const marker = site.id === 'nget' ? '/nget/' : '/eticket/';
  return tab.url.includes(marker);
}

async function findSiteTab(site) {
  const trainSearchTabs = await chrome.tabs.query({ url: site.trainSearchUrlPattern });
  const onTrainSearch = trainSearchTabs.find((tab) => isTabOnSite(tab, site));
  if (onTrainSearch) return onTrainSearch;

  const siteTabs = await chrome.tabs.query({ url: site.urlPattern });
  return siteTabs.find((tab) => isTabOnSite(tab, site)) || null;
}

async function pingContentScript(tabId) {
  try {
    const res = await chrome.tabs.sendMessage(tabId, { type: 'PING' });
    return !!(res?.ok && res?.ready);
  } catch {
    return false;
  }
}

async function waitForContentScriptReady(tabId, maxAttempts = 40) {
  for (let i = 0; i < maxAttempts; i++) {
    if (await pingContentScript(tabId)) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function ensureContentScripts(tabId, scriptFiles = CONTENT_SCRIPT_FILES, cssFiles = CONTENT_CSS_FILES) {
  if (await waitForContentScriptReady(tabId, 6)) return true;

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: scriptFiles
    });
    if (cssFiles?.length) {
      await chrome.scripting.insertCSS({
        target: { tabId },
        files: cssFiles
      });
    }
  } catch (err) {
    console.error('[IRCTC-Bot] Script injection failed:', err);
    return false;
  }

  return waitForContentScriptReady(tabId, 20);
}

async function resumeGatewayOnTab(tabId) {
  const data = await chrome.storage.local.get('irctcConfig');
  const config = data.irctcConfig;
  if (!config?.state?.running || !config?.state?.awaitingGateway) return;

  await ensureContentScripts(tabId, GATEWAY_SCRIPT_FILES, GATEWAY_CSS_FILES);
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'RESUME_GATEWAY' });
  } catch (err) {
    console.warn('[IRCTC-Bot] Gateway resume message failed:', err);
  }
}

async function sendStartBooking(tabId) {
  const ready = await ensureContentScripts(tabId);
  if (!ready) {
    console.error('[IRCTC-Bot] Content script not ready on tab', tabId);
    return false;
  }

  try {
    await chrome.tabs.sendMessage(tabId, { type: 'START_BOOKING' });
    return true;
  } catch (err) {
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

async function ensureBookingAccess() {
  try {
    const status = await IRCTCExt.AccessApi.ensureAccess({ forceRefresh: true });
    return IRCTCExt.AccessApi.isStatusAllowed(status);
  } catch (err) {
    console.warn('[IRCTC-Bot] Access check failed:', err);
    return false;
  }
}

async function resetRunningState() {
  const data = await chrome.storage.local.get('irctcConfig');
  const config = data.irctcConfig || {};
  await chrome.storage.local.set({
    irctcConfig: {
      ...config,
      state: { ...(config.state || {}), running: false, status: 'idle', currentStep: 'init' }
    }
  });
}

async function openIrctcTab({ skipAccessCheck = false } = {}) {
  const data = await chrome.storage.local.get('irctcConfig');
  const config = data.irctcConfig || {};

  const validationError = IRCTCExt.BookingValidation.validate(config);
  if (validationError) {
    console.warn('[IRCTC-Bot] Booking blocked — missing details:', validationError.message);
    await resetRunningState();
    return { ok: false, error: 'validation_failed', ...validationError };
  }

  if (!skipAccessCheck) {
    const allowed = await ensureBookingAccess();
    if (!allowed) {
      console.warn('[IRCTC-Bot] Booking blocked — access not allowed.');
      await resetRunningState();
      return { ok: false, error: 'access_denied' };
    }
  }

  const site = IRCTCExt.SiteRegistry.get(config);
  if (!site?.trainSearchUrl) {
    await resetRunningState();
    return { ok: false, error: 'site_config_missing' };
  }

  const existingTab = await findSiteTab(site);
  let tabId;

  try {
    if (existingTab) {
      tabId = existingTab.id;
      const alreadyOnTrainSearch = existingTab.url?.includes(site.trainSearchPath);
      if (alreadyOnTrainSearch) {
        await chrome.tabs.update(tabId, { active: true });
      } else {
        await chrome.tabs.update(tabId, { active: true, url: site.trainSearchUrl });
        await waitForTabReady(tabId);
      }
    } else {
      const tab = await chrome.tabs.create({ url: site.trainSearchUrl, active: true });
      tabId = tab.id;
      await waitForTabReady(tabId);
    }
  } catch (err) {
    console.error('[IRCTC-Bot] Could not open IRCTC tab:', err);
    await resetRunningState();
    return { ok: false, error: 'tab_open_failed', message: err.message || 'Could not open IRCTC tab.' };
  }

  return { ok: true, tabId, siteId: site.id, siteLabel: site.label || site.id, url: site.trainSearchUrl };
}

async function openIrctcAndStart({ skipAccessCheck = false } = {}) {
  const opened = await openIrctcTab({ skipAccessCheck });
  if (!opened.ok) return opened;

  const started = await sendStartBooking(opened.tabId);
  if (!started) {
    await resetRunningState();
    return {
      ok: false,
      error: 'content_script_not_ready',
      redirected: true,
      siteId: opened.siteId,
      siteLabel: opened.siteLabel
    };
  }

  return {
    ok: true,
    redirected: true,
    siteId: opened.siteId,
    siteLabel: opened.siteLabel,
    url: opened.url
  };
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
    (async () => {
      try {
        const opened = await openIrctcTab({ skipAccessCheck: !!msg.skipAccessCheck });
        if (!opened.ok) {
          sendResponse(opened);
          return;
        }

        sendResponse({
          ok: true,
          redirected: true,
          siteId: opened.siteId,
          siteLabel: opened.siteLabel,
          url: opened.url
        });

        const started = await sendStartBooking(opened.tabId);
        if (!started) {
          console.error('[IRCTC-Bot] Content script not ready after redirect to', opened.url);
          await resetRunningState();
        }
      } catch (err) {
        console.error('[IRCTC-Bot] START_FROM_POPUP failed:', err);
        await resetRunningState();
        sendResponse({ ok: false, error: err.message || 'start_failed' });
      }
    })();
    return true;
  }
  if (msg.type === 'CHECK_ACCESS') {
    IRCTCExt.AccessApi.ensureAccess({ forceRefresh: !!msg.forceRefresh })
      .then((status) => sendResponse({ ok: true, ...status, allowed: IRCTCExt.AccessApi.isStatusAllowed(status) }))
      .catch((err) => sendResponse({ ok: false, allowed: false, message: err.message }));
    return true;
  }
  if (msg.type === 'CONSUME_TOKEN') {
    IRCTCExt.AccessApi.consumeToken(msg.usageKey)
      .then((status) => sendResponse({ ok: true, ...status, allowed: IRCTCExt.AccessApi.isStatusAllowed(status) }))
      .catch((err) => sendResponse({ ok: false, allowed: false, message: err.message, code: err.code }));
    return true;
  }
  if (msg.type === 'RESCHEDULE_ALARMS') {
    scheduleAlarms(msg.schedule).then(() => sendResponse({ ok: true }));
    return true;
  }
});

function tryResumeGateway(tabId, url) {
  if (!isGatewayUrl(url)) return;
  resumeGatewayOnTab(tabId).catch((err) => console.warn('[IRCTC-Bot] Gateway inject failed:', err));
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  tryResumeGateway(tabId, tab.url);
});

chrome.tabs.onCreated.addListener((tab) => {
  if (!tab.id || !tab.url) return;
  tryResumeGateway(tab.id, tab.url);
});
