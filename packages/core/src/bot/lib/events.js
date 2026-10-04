window.IRCTCExt = window.IRCTCExt || {};

IRCTCExt.Events = {
  mouseEventOpts(el) {
    const rect = el.getBoundingClientRect();
    const jitterX = rect.width > 6 ? (Math.random() - 0.5) * (rect.width * 0.4) : 0;
    const jitterY = rect.height > 6 ? (Math.random() - 0.5) * (rect.height * 0.4) : 0;
    const clientX = Math.round(rect.left + rect.width / 2 + jitterX);
    const clientY = Math.round(rect.top + rect.height / 2 + jitterY);
    const screenX = (window.screenX || 0) + clientX;
    const screenY = (window.screenY || 0) + clientY;
    return {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX,
      clientY,
      screenX,
      screenY,
      buttons: 1
    };
  },

  clickWithMouse(el) {
    if (!el) return;
    el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    const opts = IRCTCExt.Events.mouseEventOpts(el);
    el.dispatchEvent(new MouseEvent('mousedown', opts));
    el.dispatchEvent(new MouseEvent('mouseup', opts));
    el.dispatchEvent(new MouseEvent('click', opts));
  },

  clickPrimeDropdownItem(option) {
    if (!option) return false;

    const li =
      option.matches?.('li[role="option"], li.ui-dropdown-item')
        ? option
        : option.closest?.('li[role="option"], li.ui-dropdown-item');
    const span = li?.querySelector('span') || option.querySelector?.('span');
    const host = li?.closest?.('p-dropdownitem') || option.closest?.('p-dropdownitem');

    const targets = [li, span, host, option].filter(Boolean);
    for (const target of targets) {
      target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      const opts = IRCTCExt.Events.mouseEventOpts(target);
      target.dispatchEvent(new MouseEvent('mousedown', opts));
      target.dispatchEvent(new MouseEvent('mouseup', opts));
      target.dispatchEvent(new MouseEvent('click', opts));
    }

    return true;
  },

  click(el) {
    if (!el) return;
    el.scrollIntoView({ block: 'center', inline: 'nearest' });

    const opts = IRCTCExt.Events.mouseEventOpts(el);

    // Dispatch mousemove & hover events to populate telemetry coordinates
    // for anti-bot / WAF scripts (Akamai Bot Manager tracks mouse coordinates)
    try {
      window.dispatchEvent(new MouseEvent('mousemove', opts));
      el.dispatchEvent(new MouseEvent('mousemove', opts));
      el.dispatchEvent(new MouseEvent('mouseover', opts));
      el.dispatchEvent(new MouseEvent('mousedown', opts));
      el.dispatchEvent(new MouseEvent('mouseup', { ...opts, buttons: 0 }));
    } catch (_) {}

    // Native click triggers Angular/PrimeNG bindings
    if (typeof el.click === 'function') {
      el.click();
      return;
    }

    try {
      el.dispatchEvent(new MouseEvent('click', { ...opts, buttons: 0 }));
    } catch (_) {}
  },

  setNativeValue(el, value) {
    if (!el) return;
    let proto = HTMLInputElement.prototype;
    if (el instanceof HTMLTextAreaElement) proto = HTMLTextAreaElement.prototype;
    else if (el instanceof HTMLSelectElement) proto = HTMLSelectElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) setter.call(el, value);
    else el.value = value;
  },

  setInputValue(el, value, { blur = true } = {}) {
    if (!el) return;
    el.focus();
    IRCTCExt.Events.setNativeValue(el, value);
    el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, data: value, inputType: 'insertFromPaste' }));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    if (blur) el.dispatchEvent(new Event('blur', { bubbles: true }));
  },

  keyCodeFor(key) {
    const map = {
      Enter: 'Enter',
      Home: 'Home',
      ArrowDown: 'ArrowDown',
      ArrowUp: 'ArrowUp',
      Escape: 'Escape',
      Tab: 'Tab',
      ' ': 'Space'
    };
    if (map[key]) return map[key];
    if (key.length === 1) return `Key${key.toUpperCase()}`;
    return key;
  },

  keyEvent(el, type, key) {
    el.dispatchEvent(
      new KeyboardEvent(type, {
        key,
        code: IRCTCExt.Events.keyCodeFor(key),
        bubbles: true,
        cancelable: true
      })
    );
  },

  pressKey(el, key) {
    IRCTCExt.Events.keyEvent(el, 'keydown', key);
    IRCTCExt.Events.keyEvent(el, 'keyup', key);
  },

  async typeSlowly(el, text, delayMs = 80) {
    if (!el) return;
    el.focus();
    IRCTCExt.Events.setNativeValue(el, '');
    el.dispatchEvent(new InputEvent('input', { bubbles: true, data: '', inputType: 'deleteContentBackward' }));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    for (const ch of String(text)) {
      IRCTCExt.Events.keyEvent(el, 'keydown', ch);
      IRCTCExt.Events.keyEvent(el, 'keypress', ch);
      IRCTCExt.Events.setNativeValue(el, el.value + ch);
      el.dispatchEvent(new InputEvent('input', { bubbles: true, data: ch, inputType: 'insertText' }));
      el.dispatchEvent(new Event('input', { bubbles: true }));
      IRCTCExt.Events.keyEvent(el, 'keyup', ch);
      await IRCTCExt.Wait.delay(delayMs);
    }
    el.dispatchEvent(new Event('change', { bubbles: true }));
  },

  openFieldBox(fieldBox) {
    if (!fieldBox) return;
    fieldBox.scrollIntoView({ block: 'center', inline: 'nearest' });
    fieldBox.focus();
    IRCTCExt.Events.click(fieldBox);
    if (fieldBox.getAttribute('aria-expanded') !== 'true') {
      const inner = fieldBox.querySelector('.field-inner');
      if (inner) IRCTCExt.Events.click(inner);
    }
  },

  closeOpenFieldBoxes(except = null) {
    document.querySelectorAll('div.field-box[aria-expanded="true"]').forEach((open) => {
      if (open !== except) IRCTCExt.Events.click(open);
    });
  },

  visibleStationOptions() {
    const panels = IRCTCExt.Wait.queryAll(IRCTCExt.SELECTORS.customStationPanel);
    const visiblePanels = panels.filter((panel) => IRCTCExt.Wait.isVisible(panel));
    const fromPanels = visiblePanels.flatMap((panel) =>
      Array.from(panel.querySelectorAll('.custom-option')).filter((opt) => IRCTCExt.Wait.isVisible(opt))
    );
    if (fromPanels.length) return fromPanels;

    return IRCTCExt.Wait.queryAll(IRCTCExt.SELECTORS.customStationOptions).filter((opt) =>
      IRCTCExt.Wait.isVisible(opt)
    );
  },

  optionMatches(el, text) {
    const needle = String(text).trim().toLowerCase();
    if (!needle) return false;
    const name = el.querySelector('.option-name')?.textContent?.trim().toLowerCase() || '';
    const code = el.querySelector('.option-code')?.textContent?.trim().toLowerCase() || '';
    const full = (el.textContent || '').trim().toLowerCase();
    return (
      name.includes(needle) ||
      code.includes(needle) ||
      full.includes(needle) ||
      needle.includes(code) ||
      needle.includes(name)
    );
  },

  async pickCustomOption(panelSelector, text, { requireMatch = false, getOptions } = {}) {
    const options = await IRCTCExt.Wait.poll(
      () => {
        const list = getOptions
          ? getOptions()
          : IRCTCExt.Wait.queryAll(panelSelector).filter((opt) => IRCTCExt.Wait.isVisible(opt));
        return list.length ? list : null;
      },
      { timeout: 8000, interval: 150 }
    );
    if (!options?.length) return false;

    const match =
      options.find((opt) => IRCTCExt.Events.optionMatches(opt, text)) ||
      options.find((opt) =>
        (opt.textContent || '').toLowerCase().includes(String(text).toLowerCase().slice(0, 3))
      );

    if (requireMatch && !match) return false;

    const chosen = match || options[0];
    IRCTCExt.Events.click(chosen);
    await IRCTCExt.Wait.delay(300);
    return true;
  },

  stationAlreadySelected(fieldBox, text) {
    const placeholder = fieldBox?.querySelector('.select-placeholder');
    if (!placeholder?.classList.contains('has-value')) return false;

    const shown = IRCTCExt.Stations.normalizeStationText(placeholder.textContent);
    const needles = IRCTCExt.Stations.stationSearchTerms(text).map((term) =>
      IRCTCExt.Stations.normalizeStationText(term)
    );
    return needles.some(
      (needle) =>
        needle.length >= 2 &&
        (shown.includes(needle) || needle.includes(shown.split('|')[0]?.trim() || shown))
    );
  },

  findStationInput(fieldBox) {
    const local = fieldBox?.querySelector('input, textarea, .field-input');
    if (local && IRCTCExt.Wait.isVisible(local)) return local;

    if (fieldBox?.getAttribute('aria-expanded') === 'true') {
      const expandedInput = fieldBox.querySelector('input, textarea, .field-input');
      if (expandedInput && IRCTCExt.Wait.isVisible(expandedInput)) return expandedInput;
    }

    const panels = IRCTCExt.Wait.queryAll(IRCTCExt.SELECTORS.customStationPanel);
    const visiblePanel = panels.find((panel) => IRCTCExt.Wait.isVisible(panel));
    if (visiblePanel) {
      const panelInput = visiblePanel.querySelector('.station-search-input, input, textarea, .field-input');
      if (panelInput && IRCTCExt.Wait.isVisible(panelInput)) return panelInput;
    }

    const all = IRCTCExt.Wait.queryAll(IRCTCExt.SELECTORS.stationSearchInput);
    return all.find((el) => IRCTCExt.Wait.isVisible(el) && !el.closest('.login-form, #newLogin')) || null;
  },

  async waitForFieldExpanded(fieldBox, timeout = 5000) {
    return IRCTCExt.Wait.poll(
      () => (fieldBox?.getAttribute('aria-expanded') === 'true' ? true : null),
      { timeout, interval: 100 }
    );
  },

  async trySelectStationOption(fieldBox, text) {
    const picked = await IRCTCExt.Events.pickCustomOption(
      IRCTCExt.SELECTORS.customStationOptions,
      text,
      {
        requireMatch: true,
        getOptions: () => IRCTCExt.Events.visibleStationOptions()
      }
    );
    if (picked && IRCTCExt.Events.stationAlreadySelected(fieldBox, text)) return true;
    return IRCTCExt.Events.stationAlreadySelected(fieldBox, text);
  },

  quotaAlreadySelected(fieldBox, quota) {
    const shown = IRCTCExt.Stations.normalizeQuota(
      fieldBox?.querySelector('.select-placeholder')?.textContent
    );
    const target = IRCTCExt.Stations.normalizeQuota(quota);
    return shown === target;
  },

  quotaOptionMatches(el, quota) {
    const text = IRCTCExt.Stations.normalizeQuota(el?.textContent);
    const target = IRCTCExt.Stations.normalizeQuota(quota);
    if (!text || !target) return false;
    if (target === 'TATKAL') return text === 'TATKAL';
    if (target === 'GENERAL') return text === 'GENERAL';
    if (target === 'LADIES') return text === 'LADIES';
    return text === target || text.includes(target);
  },

  async pickQuotaOption(quota) {
    const targetText = IRCTCExt.Stations.quotaOptionText(quota);
    const options = await IRCTCExt.Wait.poll(
      () => {
        const list = IRCTCExt.Wait.queryAll(IRCTCExt.SELECTORS.customQuotaOptions);
        return list.length ? list : null;
      },
      { timeout: 8000, interval: 150 }
    );
    if (!options?.length) return false;

    const match =
      options.find((opt) => IRCTCExt.Events.quotaOptionMatches(opt, quota)) ||
      options.find((opt) =>
        IRCTCExt.Stations.normalizeQuota(opt.textContent) === IRCTCExt.Stations.normalizeQuota(targetText)
      );

    if (!match) return false;
    IRCTCExt.Events.click(match);
    await IRCTCExt.Wait.delay(300);
    return true;
  },

  async selectQuotaField(fieldBox, quota) {
    if (!fieldBox || !quota) return false;
    if (IRCTCExt.Events.quotaAlreadySelected(fieldBox, quota)) return true;

    IRCTCExt.Events.openFieldBox(fieldBox);
    await IRCTCExt.Wait.poll(
      () => (fieldBox.getAttribute('aria-expanded') === 'true' ? true : null),
      { timeout: 3000, interval: 100 }
    );
    await IRCTCExt.Wait.delay(200);

    const picked = await IRCTCExt.Events.pickQuotaOption(quota);
    if (picked) return true;
    return IRCTCExt.Events.quotaAlreadySelected(fieldBox, quota);
  },

  async fillStationField(fieldBox, text) {
    if (!fieldBox || !text) return false;
    if (IRCTCExt.Events.stationAlreadySelected(fieldBox, text)) return true;

    IRCTCExt.Events.closeOpenFieldBoxes(fieldBox);
    IRCTCExt.Events.openFieldBox(fieldBox);
    await IRCTCExt.Events.waitForFieldExpanded(fieldBox, 5000);
    await IRCTCExt.Wait.delay(250);

    const input = await IRCTCExt.Wait.poll(() => IRCTCExt.Events.findStationInput(fieldBox), {
      timeout: 8000,
      interval: 120
    });
    if (!input) return false;

    const searchTerms = IRCTCExt.Stations.stationSearchTerms(text);
    for (const term of searchTerms) {
      input.focus();
      IRCTCExt.Events.click(input);
      IRCTCExt.Events.setInputValue(input, term, { blur: false });
      await IRCTCExt.Wait.delay(500);
      if (await IRCTCExt.Events.trySelectStationOption(fieldBox, text)) return true;

      await IRCTCExt.Events.typeSlowly(input, term, 60);
      await IRCTCExt.Wait.delay(400);
      if (await IRCTCExt.Events.trySelectStationOption(fieldBox, text)) return true;
    }

    return IRCTCExt.Events.stationAlreadySelected(fieldBox, text);
  },

  async fillAutocomplete(input, text) {
    if (!input) return false;
    if (input.matches?.('div.field-box') || input.classList?.contains('field-box')) {
      return IRCTCExt.Events.fillStationField(input, text);
    }
    await IRCTCExt.Events.typeSlowly(input, text, 40);
    await IRCTCExt.Wait.delay(500);
    const options = IRCTCExt.Wait.queryAll(IRCTCExt.SELECTORS.autocompletePanel);
    const match = options.find((li) => IRCTCExt.Events.optionMatches(li, text));
    if (match) {
      IRCTCExt.Events.click(match);
      await IRCTCExt.Wait.delay(300);
      return true;
    }
    if (options.length) {
      IRCTCExt.Events.click(options[0]);
      await IRCTCExt.Wait.delay(300);
      return true;
    }
    return false;
  },

  async selectDropdown(triggerSelectors, labelText) {
    const trigger = await IRCTCExt.Wait.waitFor(triggerSelectors, { timeout: 5000 });
    if (!trigger) return false;
    IRCTCExt.Events.click(trigger);
    await IRCTCExt.Wait.delay(400);
    return IRCTCExt.Events.pickCustomOption(IRCTCExt.SELECTORS.dropdownPanel, labelText);
  },

  parseDdMmYyyy(dateStr) {
    const parts = String(dateStr).split('/');
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)) return null;
    return { day, month, year };
  },

  async pickCustomCalendarDate(dateStr) {
    const parsed = IRCTCExt.Events.parseDdMmYyyy(dateStr);
    if (!parsed) return false;

    const panel = await IRCTCExt.Wait.waitFor(IRCTCExt.SELECTORS.calendarPanel, { timeout: 5000, visible: true });
    if (!panel) return false;

    const monthNames = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ];

    for (let i = 0; i < 24; i += 1) {
      const title = (panel.querySelector('.ui-datepicker-title')?.textContent || '').toLowerCase();
      const monthOk = title.includes(monthNames[parsed.month]);
      const yearOk = title.includes(String(parsed.year));
      if (monthOk && yearOk) break;

      const titleDate = new Date(parsed.year, parsed.month, 1);
      const shownYear = Number((title.match(/\d{4}/) || [])[0]);
      const shownMonth = monthNames.findIndex((m) => title.includes(m));
      const goNext =
        Number.isNaN(shownYear) || shownMonth < 0
          ? true
          : new Date(shownYear, shownMonth, 1) < titleDate;
      const nav = panel.querySelector(goNext ? '.ui-datepicker-next' : '.ui-datepicker-prev');
      if (!nav) break;
      IRCTCExt.Events.click(nav);
      await IRCTCExt.Wait.delay(200);
    }

    const day = String(parsed.day);
    const cells = Array.from(
      panel.querySelectorAll('.ui-datepicker-calendar td a, .ui-datepicker-calendar td span, .p-datepicker-calendar td span')
    ).filter((c) => !c.closest('td')?.classList.contains('ui-datepicker-other-month'));
    const cell = cells.find((c) => c.textContent.trim() === day);
    if (!cell) return false;
    IRCTCExt.Events.click(cell);
    await IRCTCExt.Wait.delay(200);
    return true;
  },

  async setCalendarDate(input, dateStr) {
    if (!input || !dateStr) return false;

    if (input.matches?.('div.field-box') || input.classList?.contains('field-box')) {
      IRCTCExt.Events.openFieldBox(input);
      await IRCTCExt.Wait.delay(250);
      return IRCTCExt.Events.pickCustomCalendarDate(dateStr);
    }

    IRCTCExt.Events.setInputValue(input, dateStr);
    await IRCTCExt.Wait.delay(200);
    IRCTCExt.Events.click(input);
    await IRCTCExt.Wait.delay(300);
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = String(parseInt(parts[0], 10));
      const cells = Array.from(document.querySelectorAll('.ui-datepicker-calendar td a, .p-datepicker-calendar td span'));
      const cell = cells.find((c) => c.textContent.trim() === day);
      if (cell) {
        IRCTCExt.Events.click(cell);
        await IRCTCExt.Wait.delay(200);
        return true;
      }
    }
    return true;
  }
};
