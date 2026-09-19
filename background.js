importScripts(
  'packages/core/dist/chrome-core.iife.js',
  'lib/schedule.js',
  'sites/registry.js',
  'packages/core/src/bot/sites/eticket/config.js',
  'packages/core/src/bot/sites/nget/config.js'
);

IRCTCExt.SiteRegistry.register(IRCTCExt.EticketConfig);
IRCTCExt.SiteRegistry.register(IRCTCExt.NgetConfig);

async function getConfigStore() {
  const data = await chrome.storage.local.get('irctcConfig');
  return IRCTCExt.ConfigSets.migrateToV2(data.irctcConfig);
}

async function getActiveConfig() {
  const store = await getConfigStore();
  return IRCTCExt.ConfigSets.resolveActiveConfig(store);
}

async function saveConfigStore(store) {
  await chrome.storage.local.set({ irctcConfig: IRCTCExt.ConfigSets.normalizeStore(store) });
}

async function updateStoreState(updates) {
  const store = await getConfigStore();
  store.state = { ...(store.state || {}), ...updates };
  await saveConfigStore(store);
}

const CONTENT_SCRIPT_FILES = [
  'packages/core/dist/chrome-core.iife.js',
  'packages/core/dist/extension-bot.iife.js',
  'overlay/paymentReview.js'
];

const CONTENT_CSS_FILES = ['overlay/overlay.css', 'overlay/paymentReview.css'];

const GATEWAY_SCRIPT_FILES = [
  'packages/core/dist/chrome-core.iife.js',
  'packages/core/dist/extension-gateway.iife.js'
];
const GATEWAY_CSS_FILES = ['overlay/overlay.css'];

function isGatewayUrl(url) {
  if (!url) return false;
  return url.includes('irctcipay.com') || url.includes('irctcpayments.com') || url.includes('phonepe.com');
}

async function scheduleAlarms(schedule) {
  return IRCTCExt.Schedule.scheduleAlarms(schedule);
}

async function restoreScheduleAlarms() {
  const config = await getActiveConfig();
  const schedule = config?.schedule;
  if (!schedule?.enabled) return null;
  return IRCTCExt.Schedule.ensureAlarmScheduled(schedule);
}

async function prepareScheduledBookingState() {
  await updateStoreState({
    running: true,
    paused: false,
    status: 'scheduled',
    currentStep: 'init',
    passengersDone: false,
    paymentDone: false,
    autoRestartCount: 0,
    paymentPhase: null,
    paymentGateway: null,
    awaitingGateway: false,
    bookingSessionId: crypto.randomUUID(),
    tokenConsumed: false
  });
}

async function getActiveSite() {
  return IRCTCExt.SiteRegistry.get(await getActiveConfig());
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

function shouldResumeGateway(config) {
  const state = config?.state || {};
  if (!state.running || state.paymentDone) return false;
  if (state.status === 'stopped' || state.status === 'done') return false;
  return !!(
    state.awaitingGateway ||
    state.paymentPhase === 'gateway' ||
    state.currentStep === 'gateway' ||
    state.currentStep === 'payment'
  );
}

async function resumeGatewayOnTab(tabId, attempt = 0) {
  const config = await getActiveConfig();
  if (!shouldResumeGateway(config)) return;

  await ensureContentScripts(tabId, GATEWAY_SCRIPT_FILES, GATEWAY_CSS_FILES);

  try {
    await chrome.tabs.sendMessage(tabId, { type: 'RESUME_GATEWAY' });
  } catch (err) {
    if (attempt < 12) {
      setTimeout(() => {
        resumeGatewayOnTab(tabId, attempt + 1).catch((retryErr) =>
          console.warn('[IRCTC-Bot] Gateway resume retry failed:', retryErr)
        );
      }, 500);
      return;
    }
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
  await updateStoreState({ running: false, status: 'idle', currentStep: 'init' });
}

async function stopAllBooking() {
  await updateStoreState({
    running: false,
    paused: false,
    status: 'stopped',
    currentStep: 'init',
    awaitingGateway: false,
    paymentPhase: null,
    paymentGateway: null,
    passengersDone: false,
    paymentDone: false,
    autoRestartCount: 0
  });

  const tabs = await chrome.tabs.query({
    url: [
      'https://www.irctc.co.in/*',
      'https://www.irctcipay.com/*',
      'https://pg.irctcpayments.com/*',
      'https://mercury-t2.phonepe.com/*',
      'https://mercury.phonepe.com/*'
    ]
  });

  for (const tab of tabs) {
    if (!tab.id) continue;
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'STOP_BOOKING' });
    } catch {
      // Tab may not have a content script loaded.
    }
  }
}

async function openIrctcTab({ skipAccessCheck = false } = {}) {
  const config = await getActiveConfig();

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
      await chrome.tabs.update(tabId, { active: true });
      if (alreadyOnTrainSearch) {
        await chrome.tabs.reload(tabId);
      } else {
        await chrome.tabs.update(tabId, { url: site.trainSearchUrl });
      }
      await waitForTabReady(tabId);
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

chrome.runtime.onInstalled.addListener(() => {
  restoreScheduleAlarms().catch((err) => console.error('[IRCTC-Bot] Schedule restore failed:', err));
});

chrome.runtime.onStartup.addListener(() => {
  restoreScheduleAlarms().catch((err) => console.error('[IRCTC-Bot] Schedule restore failed:', err));
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.irctcConfig?.newValue) {
    const config = IRCTCExt.ConfigSets.resolveActiveConfig(
      IRCTCExt.ConfigSets.migrateToV2(changes.irctcConfig.newValue)
    );
    if (config.schedule) scheduleAlarms(config.schedule);
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  const { ALARM_AC, ALARM_NON_AC } = IRCTCExt.Schedule;
  if (alarm.name !== ALARM_AC && alarm.name !== ALARM_NON_AC) return;

  console.log('[IRCTC-Bot] Tatkal alarm fired:', alarm.name);

  try {
    const config = await getActiveConfig();
    if (!config?.schedule?.enabled) return;

    await prepareScheduledBookingState();

    const result = await openIrctcAndStart();
    if (!result?.ok) {
      console.warn('[IRCTC-Bot] Scheduled start failed:', result?.error || result?.message);
    } else {
      console.log('[IRCTC-Bot] Scheduled auto-booking started');
    }

    const latest = await getActiveConfig();
    await scheduleAlarms(latest.schedule || config.schedule);
  } catch (err) {
    console.error('[IRCTC-Bot] Scheduled start error:', err);
    await resetRunningState();
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'STOP_FROM_POPUP') {
    stopAllBooking()
      .then(() => sendResponse({ ok: true }))
      .catch((err) => {
        console.error('[IRCTC-Bot] STOP_FROM_POPUP failed:', err);
        sendResponse({ ok: false, error: err.message || 'stop_failed' });
      });
    return true;
  }
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
      .catch((err) =>
        sendResponse({
          ok: false,
          allowed: false,
          message: IRCTCExt.Network.toUserNetworkMessage(err),
          code: err.code
        })
      );
    return true;
  }
  if (msg.type === 'CONSUME_TOKEN') {
    IRCTCExt.AccessApi.consumeToken(msg.usageKey)
      .then((status) => sendResponse({ ok: true, ...status, allowed: IRCTCExt.AccessApi.isStatusAllowed(status) }))
      .catch((err) =>
        sendResponse({
          ok: false,
          allowed: false,
          message: IRCTCExt.Network.toUserNetworkMessage(err),
          code: err.code
        })
      );
    return true;
  }
  if (msg.type === 'RESCHEDULE_ALARMS') {
    const arm = msg.schedule?.enabled
      ? IRCTCExt.Schedule.ensureAlarmScheduled(msg.schedule)
      : scheduleAlarms(msg.schedule);
    arm
      .then((info) => sendResponse({ ok: true, ...info }))
      .catch((err) => sendResponse({ ok: false, message: err.message }));
    return true;
  }
  if (msg.type === 'GET_SCHEDULE_STATUS') {
    IRCTCExt.Schedule.getScheduledAlarmInfo(msg.schedule)
      .then((info) => sendResponse({ ok: true, ...info }))
      .catch((err) => sendResponse({ ok: false, message: err.message }));
    return true;
  }
});

function tryResumeGateway(tabId, url) {
  if (!isGatewayUrl(url)) return;
  resumeGatewayOnTab(tabId).catch((err) => console.warn('[IRCTC-Bot] Gateway inject failed:', err));
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const url = changeInfo.url || tab?.url;
  if (!url) return;
  if (changeInfo.status === 'complete' || changeInfo.url) {
    tryResumeGateway(tabId, url);
  }
});

chrome.tabs.onCreated.addListener((tab) => {
  if (!tab?.id) return;
  if (tab.url && isGatewayUrl(tab.url)) {
    tryResumeGateway(tab.id, tab.url);
    return;
  }
  const onCreatedUpdated = (tabId, changeInfo, updatedTab) => {
    if (tabId !== tab.id) return;
    const url = changeInfo.url || updatedTab?.url;
    if (!url || !isGatewayUrl(url)) return;
    tryResumeGateway(tabId, url);
    chrome.tabs.onUpdated.removeListener(onCreatedUpdated);
  };
  chrome.tabs.onUpdated.addListener(onCreatedUpdated);
  setTimeout(() => chrome.tabs.onUpdated.removeListener(onCreatedUpdated), 60000);
});

restoreScheduleAlarms().catch((err) => console.error('[IRCTC-Bot] Schedule restore failed:', err));
