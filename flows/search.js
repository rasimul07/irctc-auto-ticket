window.IRCTCExt = window.IRCTCExt || {};

IRCTCExt.SearchFlow = {
  async run(config, overlay) {
    overlay.setStep('Search');
    overlay.setStatus('Filling journey details...');
    await IRCTCExt.Storage.updateState({ currentStep: 'search' });

    const fromBox = await IRCTCExt.Wait.waitFor(IRCTCExt.SELECTORS.searchFrom, { timeout: 20000 });
    const toBox = await IRCTCExt.Wait.waitFor(IRCTCExt.SELECTORS.searchTo, { timeout: 15000 });
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

    if (config.journey.quota) {
      overlay.setStatus('Selecting quota...');
      const quotaBox = await IRCTCExt.Wait.waitFor(IRCTCExt.SELECTORS.searchQuota, { timeout: 5000 });
      if (quotaBox?.classList?.contains('field-box')) {
        IRCTCExt.Events.openFieldBox(quotaBox);
        await IRCTCExt.Wait.delay(300);
        const quotaText = IRCTCExt.Stations.quotaOptionText(config.journey.quota);
        await IRCTCExt.Events.pickCustomOption(IRCTCExt.SELECTORS.customQuotaOptions, quotaText);
      } else {
        await IRCTCExt.Events.selectDropdown(IRCTCExt.SELECTORS.searchQuota, config.journey.quota);
      }
    }

    overlay.setStatus('Submitting search...');
    const searchBtn = await IRCTCExt.Wait.waitFor(IRCTCExt.SELECTORS.searchButton, { timeout: 5000 });
    if (!searchBtn) throw new Error('Search button not found');
    IRCTCExt.Events.click(searchBtn);

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
};
