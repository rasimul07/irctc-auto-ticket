window.IRCTCExt = window.IRCTCExt || {};

IRCTCExt.Events = {
  click(el) {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const opts = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: rect.left + Math.min(24, Math.max(8, rect.width / 5)),
      clientY: rect.top + rect.height / 2,
      buttons: 1
    };
    el.dispatchEvent(new PointerEvent('pointerdown', opts));
    el.dispatchEvent(new MouseEvent('mousedown', opts));
    el.dispatchEvent(new PointerEvent('pointerup', opts));
    el.dispatchEvent(new MouseEvent('mouseup', opts));
    el.dispatchEvent(new MouseEvent('click', opts));
  },

  setNativeValue(el, value) {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) setter.call(el, value);
    else el.value = value;
  },

  setInputValue(el, value) {
    if (!el) return;
    el.focus();
    IRCTCExt.Events.setNativeValue(el, value);
    el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, data: value, inputType: 'insertFromPaste' }));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
  },

  keyEvent(el, type, key) {
    el.dispatchEvent(
      new KeyboardEvent(type, {
        key,
        code: key.length === 1 ? `Key${key.toUpperCase()}` : key,
        bubbles: true,
        cancelable: true
      })
    );
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

  async pickCustomOption(panelSelector, text) {
    const options = await IRCTCExt.Wait.poll(
      () => {
        const list = IRCTCExt.Wait.queryAll(panelSelector);
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

    const chosen = match || options[0];
    IRCTCExt.Events.click(chosen);
    await IRCTCExt.Wait.delay(300);
    return true;
  },

  stationAlreadySelected(fieldBox, text) {
    const shown = (fieldBox?.textContent || '').toLowerCase();
    const needle = String(text).trim().toLowerCase();
    return needle.length >= 3 && shown.includes(needle);
  },

  findStationInput(fieldBox) {
    const local = fieldBox?.querySelector('input, textarea');
    if (local && IRCTCExt.Wait.isVisible(local)) return local;
    const all = IRCTCExt.Wait.queryAll(IRCTCExt.SELECTORS.stationSearchInput);
    return all.find((el) => IRCTCExt.Wait.isVisible(el) && !el.closest('.login-form, #newLogin')) || null;
  },

  async fillStationField(fieldBox, text) {
    if (!fieldBox || !text) return false;
    if (IRCTCExt.Events.stationAlreadySelected(fieldBox, text)) return true;

    IRCTCExt.Events.openFieldBox(fieldBox);
    await IRCTCExt.Wait.delay(350);

    const input = await IRCTCExt.Wait.poll(() => IRCTCExt.Events.findStationInput(fieldBox), {
      timeout: 8000,
      interval: 120
    });
    if (!input) return false;

    input.focus();
    IRCTCExt.Events.click(input);
    await IRCTCExt.Events.typeSlowly(input, text, 90);
    const picked = await IRCTCExt.Events.pickCustomOption(IRCTCExt.SELECTORS.customStationOptions, text);
    if (picked) return true;
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
