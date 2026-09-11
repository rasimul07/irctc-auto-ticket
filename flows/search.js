window.IRCTCExt = window.IRCTCExt || {};

IRCTCExt.SearchFlow = {
  async submitSearchWithRedirect(overlay, { maxAttempts = 3, redirectTimeoutMs = 8000 } = {}) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      overlay.setStatus(attempt === 1 ? 'Submitting search...' : `Retrying search (${attempt}/${maxAttempts})...`);

      const searchBtn = await IRCTCExt.Wait.waitFor(IRCTCExt.SELECTORS.searchButton, { timeout: 5000 });
      if (!searchBtn) throw new Error('Search button not found');

      IRCTCExt.Events.click(searchBtn);

      const redirected = await IRCTCExt.Wait.poll(
        () => location.pathname.includes('train-list'),
        { timeout: redirectTimeoutMs, interval: 200 }
      );

      if (redirected) {
        await IRCTCExt.Storage.updateState({
          currentStep: 'train-list',
          running: true,
          status: 'running',
          message: 'Search submitted — loading train list'
        });
        overlay.setStep('train-list');
        overlay.setStatus('Search submitted — loading train list...');
        return true;
      }

      if (attempt < maxAttempts) {
        overlay.setStatus(`Search did not redirect, retry ${attempt}/${maxAttempts}...`);
        await IRCTCExt.Wait.delay(500);
      }
    }

    throw new Error('Search did not open train list');
  },

  async run(config, overlay) {
    overlay.setStep('Search');
    overlay.setStatus('Filling journey details...');
    await IRCTCExt.Storage.updateState({ currentStep: 'search' });

    IRCTCExt.Modals.dismissSessionRestore?.();
    await IRCTCExt.Wait.delay(300);

    const fromBox = await IRCTCExt.Wait.waitFor(IRCTCExt.SELECTORS.searchFrom, { timeout: 20000, visible: true });
    const toBox = await IRCTCExt.Wait.waitFor(IRCTCExt.SELECTORS.searchTo, { timeout: 15000, visible: true });
    if (!fromBox || !toBox) throw new Error('Search form not found');

    const fromText = config.journey.from || config.journey.fromCode;
    const toText = config.journey.to || config.journey.toCode;
    if (!fromText || !toText) throw new Error('From/To station not configured');

    overlay.setStatus('Selecting From station...');
    const fromOk = fromBox.classList?.contains('field-box')
      ? await IRCTCExt.Events.fillStationField(fromBox, fromText)
      : await IRCTCExt.Events.fillAutocomplete(fromBox, fromText);
    if (!fromOk) throw new Error('Could not select From station');

    overlay.setStatus('Selecting To station...');
    const toOk = toBox.classList?.contains('field-box')
      ? await IRCTCExt.Events.fillStationField(toBox, toText)
      : await IRCTCExt.Events.fillAutocomplete(toBox, toText);
    if (!toOk) throw new Error('Could not select To station');

    const dateBox = await IRCTCExt.Wait.waitFor(IRCTCExt.SELECTORS.searchDate, { timeout: 5000 });
    const dateStr = IRCTCExt.Stations.formatDateForIRCTC(config.journey.date);
    if (dateBox && dateStr) {
      overlay.setStatus('Selecting travel date...');
      await IRCTCExt.Events.setCalendarDate(dateBox, dateStr);
    }

    const quota = config.journey?.quota || 'TATKAL';
    overlay.setStatus('Selecting quota...');
    const quotaBox = await IRCTCExt.Wait.waitFor(IRCTCExt.SELECTORS.searchQuota, { timeout: 5000 });
    if (!quotaBox) throw new Error('Quota field not found on search form');

    const quotaOk = quotaBox.classList?.contains('field-box')
      ? await IRCTCExt.Events.selectQuotaField(quotaBox, quota)
      : await IRCTCExt.Events.selectDropdown(
          IRCTCExt.SELECTORS.searchQuota,
          IRCTCExt.Stations.quotaOptionText(quota)
        );
    if (!quotaOk) throw new Error(`Could not select quota: ${quota}`);

    return IRCTCExt.SearchFlow.submitSearchWithRedirect(overlay);
  }
};
