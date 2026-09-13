(function (root) {
  root.IRCTCExt = root.IRCTCExt || {};
  if (IRCTCExt.NgetSearchFlow) return;

  IRCTCExt.NgetSearchFlow = {
    visibleAutocompleteOptions() {
      const panels = IRCTCExt.Wait.queryAll(IRCTCExt.SELECTORS.autocompletePanel);
      const visiblePanels = panels.filter((panel) => IRCTCExt.Wait.isVisible(panel));
      const options = visiblePanels.flatMap((panel) =>
        Array.from(panel.querySelectorAll('li')).filter((li) => IRCTCExt.Wait.isVisible(li))
      );
      if (options.length) return options;

      return IRCTCExt.Wait.queryAll(IRCTCExt.SELECTORS.autocompleteOptions).filter((opt) =>
        IRCTCExt.Wait.isVisible(opt)
      );
    },

    stationOptionsAfterHeader(options) {
      const stationsIdx = options.findIndex((opt) => /stations/i.test(opt.textContent || ''));
      if (stationsIdx >= 0) {
        const after = options.slice(stationsIdx + 1).filter((opt) => {
          const text = (opt.textContent || '').trim();
          return text && !/^-+$/.test(text) && !/journeys/i.test(text);
        });
        if (after.length) return after;
      }

      return options.filter((opt) => {
        const text = (opt.textContent || '').trim();
        if (!text || /^-+$/.test(text)) return false;
        if (/journeys/i.test(text)) return false;
        return !/stations/i.test(text);
      });
    },

    async pickStationOption(text) {
      const options = await IRCTCExt.Wait.poll(
        () => {
          const list = IRCTCExt.NgetSearchFlow.visibleAutocompleteOptions();
          return list.length ? list : null;
        },
        { timeout: 8000, interval: 150 }
      );
      if (!options?.length) return false;

      const candidates = IRCTCExt.NgetSearchFlow.stationOptionsAfterHeader(options);
      const match =
        candidates.find((opt) => IRCTCExt.Events.optionMatches(opt, text)) ||
        options.find((opt) => IRCTCExt.Events.optionMatches(opt, text));

      if (!match) return false;
      IRCTCExt.Events.click(match);
      await IRCTCExt.Wait.delay(300);
      return true;
    },

    inputShowsStation(input, text) {
      const value = (input?.value || '').trim();
      if (!value) return false;
      const needles = IRCTCExt.Stations.stationSearchTerms(text).map((term) =>
        IRCTCExt.Stations.normalizeStationText(term)
      );
      const shown = IRCTCExt.Stations.normalizeStationText(value);
      return needles.some(
        (needle) =>
          needle.length >= 2 &&
          (shown.includes(needle) || needle.includes(shown.split('-')[0]?.trim() || shown))
      );
    },

    async fillNgetStation(input, text) {
      if (!input || !text) return false;
      if (IRCTCExt.NgetSearchFlow.inputShowsStation(input, text)) return true;

      const terms = IRCTCExt.Stations.stationSearchTerms(text);
      for (const term of terms) {
        input.focus();
        IRCTCExt.Events.click(input);
        IRCTCExt.Events.setInputValue(input, term, { blur: false });
        await IRCTCExt.Wait.delay(500);

        if (await IRCTCExt.NgetSearchFlow.pickStationOption(text)) {
          if (IRCTCExt.NgetSearchFlow.inputShowsStation(input, text)) return true;
        }

        await IRCTCExt.Events.typeSlowly(input, term, 60);
        await IRCTCExt.Wait.delay(400);
        if (await IRCTCExt.NgetSearchFlow.pickStationOption(text)) {
          if (IRCTCExt.NgetSearchFlow.inputShowsStation(input, text)) return true;
        }
      }

      return IRCTCExt.NgetSearchFlow.inputShowsStation(input, text);
    },

    async selectNgetDropdown(triggerSelectors, labelText) {
      const trigger = await IRCTCExt.Wait.waitFor(triggerSelectors, { timeout: 5000, visible: true });
      if (!trigger) return false;

      const shown = (trigger.closest('p-dropdown')?.querySelector('.ui-dropdown-label')?.textContent || '')
        .trim()
        .toLowerCase();
      if (shown && shown === String(labelText).trim().toLowerCase()) return true;

      IRCTCExt.Events.click(trigger);
      await IRCTCExt.Wait.delay(400);

      const options = await IRCTCExt.Wait.poll(
        () => {
          const list = IRCTCExt.Wait.queryAll(IRCTCExt.SELECTORS.dropdownPanel).filter((opt) =>
            IRCTCExt.Wait.isVisible(opt)
          );
          return list.length ? list : null;
        },
        { timeout: 8000, interval: 150 }
      );
      if (!options?.length) return false;

      const target = String(labelText).trim().toLowerCase();
      const match =
        options.find((opt) => (opt.textContent || '').trim().toLowerCase() === target) ||
        options.find((opt) => IRCTCExt.Events.optionMatches(opt, labelText)) ||
        options.find((opt) => (opt.textContent || '').toLowerCase().includes(target));

      if (!match) return false;
      IRCTCExt.Events.click(match);
      await IRCTCExt.Wait.delay(300);
      return true;
    },

    async submitSearchWithRedirect(overlay, { maxAttempts = 3, redirectTimeoutMs = 8000 } = {}) {
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        overlay.setStatus(
          attempt === 1 ? 'Submitting search...' : `Retrying search (${attempt}/${maxAttempts})...`
        );

        const searchBtn = await IRCTCExt.Wait.waitFor(IRCTCExt.SELECTORS.searchButton, {
          timeout: 5000,
          visible: true
        });
        if (!searchBtn) throw new Error('Search Trains button not found');

        IRCTCExt.Events.click(searchBtn);

        const redirected = await IRCTCExt.Wait.poll(
          () => IRCTCExt.NgetPaths.isTrainListPath(location.pathname),
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

      const fromInput = await IRCTCExt.Wait.waitFor(IRCTCExt.SELECTORS.searchFrom, {
        timeout: 20000,
        visible: true
      });
      const toInput = await IRCTCExt.Wait.waitFor(IRCTCExt.SELECTORS.searchTo, {
        timeout: 15000,
        visible: true
      });
      if (!fromInput || !toInput) throw new Error('Search form not found');

      const fromText = config.journey.from || config.journey.fromCode;
      const toText = config.journey.to || config.journey.toCode;
      if (!fromText || !toText) throw new Error('From/To station not configured');

      overlay.setStatus('Selecting From station...');
      const fromOk = await IRCTCExt.NgetSearchFlow.fillNgetStation(fromInput, fromText);
      if (!fromOk) throw new Error('Could not select From station');

      overlay.setStatus('Selecting To station...');
      const toOk = await IRCTCExt.NgetSearchFlow.fillNgetStation(toInput, toText);
      if (!toOk) throw new Error('Could not select To station');

      const dateInput = await IRCTCExt.Wait.waitFor(IRCTCExt.SELECTORS.searchDate, {
        timeout: 5000,
        visible: true
      });
      const dateStr = IRCTCExt.Stations.formatDateForIRCTC(config.journey.date);
      if (dateInput && dateStr) {
        overlay.setStatus('Selecting travel date...');
        IRCTCExt.Events.setInputValue(dateInput, dateStr, { blur: true });
        await IRCTCExt.Wait.delay(200);
        IRCTCExt.Events.click(dateInput);
        await IRCTCExt.Wait.delay(300);
        const picked = await IRCTCExt.Events.pickCustomCalendarDate(dateStr);
        if (!picked && dateInput.value !== dateStr) {
          IRCTCExt.Events.setInputValue(dateInput, dateStr, { blur: true });
        }
      }

      const travelClass = config.journey?.travelClass || 'SL';
      overlay.setStatus('Selecting class...');
      const classLabel = IRCTCExt.Stations.getClassLabel(travelClass);
      const classOk = await IRCTCExt.NgetSearchFlow.selectNgetDropdown(
        IRCTCExt.SELECTORS.searchClass,
        classLabel
      );
      if (!classOk) throw new Error(`Could not select class: ${classLabel}`);

      const quota = config.journey?.quota || 'TATKAL';
      overlay.setStatus('Selecting quota...');
      const quotaText = IRCTCExt.Stations.quotaOptionText(quota);
      const quotaOk = await IRCTCExt.NgetSearchFlow.selectNgetDropdown(
        IRCTCExt.SELECTORS.searchQuota,
        quotaText
      );
      if (!quotaOk) throw new Error(`Could not select quota: ${quotaText}`);

      return IRCTCExt.NgetSearchFlow.submitSearchWithRedirect(overlay);
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
