(function (root) {
  root.IRCTCExt = root.IRCTCExt || {};
  if (IRCTCExt.NgetPassengersFlow) return;

  function passengersLib() {
    const lib = IRCTCExt.Passengers;
    if (!lib) throw new Error('Passenger helpers not loaded. Reload the extension.');
    return lib;
  }

  IRCTCExt.NgetPassengersFlow = {
    getSelectors() {
      return IRCTCExt.SELECTORS?.passengers || IRCTCExt.NgetSelectors.passengers;
    },

    getPassengerRows() {
      const sel = IRCTCExt.NgetPassengersFlow.getSelectors();
      return IRCTCExt.Wait.queryAll(sel.passengerRow).filter((row) => IRCTCExt.Wait.isVisible(row));
    },

    getRowBlock(row) {
      if (!row) return null;
      let block = row.parentElement;
      while (block && block !== document.body) {
        const deleteBtn = IRCTCExt.Wait.queryOne(
          IRCTCExt.NgetPassengersFlow.getSelectors().deletePassengerBtn,
          block
        );
        if (deleteBtn && block.contains(row)) return block;
        if (block.matches?.('p-panel, .ui-panel-content')) break;
        block = block.parentElement;
      }
      return row.parentElement || row;
    },

    getNameInput(row) {
      const sel = IRCTCExt.NgetPassengersFlow.getSelectors();
      return IRCTCExt.Wait.queryOne(sel.passengerName, row);
    },

    isPlaceholderGender(value) {
      const text = String(value || '').replace(/\s+/g, ' ').trim();
      return !text || /^(gender|select|choose)$/i.test(text);
    },

    readGenderValueFromElement(el) {
      if (!el) return '';

      if (el.tagName === 'SELECT') {
        const selected = el.options[el.selectedIndex];
        const text = (selected?.textContent || '').replace(/\s+/g, ' ').trim();
        if (!IRCTCExt.NgetPassengersFlow.isPlaceholderGender(text)) return text;
        if (el.value) return passengersLib().genderLabel(el.value);
        return '';
      }

      if (el.tagName === 'INPUT') {
        return (el.value || el.textContent || '').replace(/\s+/g, ' ').trim();
      }

      const dropdown = el.closest('p-dropdown') || el;
      return passengersLib().getDropdownShownValue(dropdown) || '';
    },

    getGenderElements(row) {
      if (!row) return [];
      const seen = new Set();
      const elements = [
        ...row.querySelectorAll('input[formcontrolname="passengerGender"]'),
        ...row.querySelectorAll('select[formcontrolname="passengerGender"]'),
        ...row.querySelectorAll('p-dropdown[formcontrolname="passengerGender"]')
      ];

      return elements.filter((el) => {
        if (!el || seen.has(el)) return false;
        seen.add(el);
        return el.tagName === 'INPUT' || IRCTCExt.Wait.isVisible(el);
      });
    },

    readGenderFromRow(row) {
      const elements = IRCTCExt.NgetPassengersFlow.getGenderElements(row);
      for (const el of elements) {
        const value = IRCTCExt.NgetPassengersFlow.readGenderValueFromElement(el);
        if (!IRCTCExt.NgetPassengersFlow.isPlaceholderGender(value)) return value;
      }
      return '';
    },

    findEditableGenderElement(row) {
      const select = row.querySelector('select[formcontrolname="passengerGender"]');
      if (select && IRCTCExt.Wait.isVisible(select)) return select;

      const input = row.querySelector('input[formcontrolname="passengerGender"]');
      if (input && !input.readOnly && IRCTCExt.Wait.isVisible(input)) return input;

      const dropdown = row.querySelector('p-dropdown[formcontrolname="passengerGender"]');
      if (dropdown && IRCTCExt.Wait.isVisible(dropdown)) return dropdown;

      return null;
    },

    genderMatchesPassenger(genderValue, passenger) {
      if (!passenger?.gender || IRCTCExt.NgetPassengersFlow.isPlaceholderGender(genderValue)) {
        return false;
      }
      return passengersLib().segmentMatches(genderValue, passengersLib().genderToken(passenger.gender));
    },

    parsePassengerRow(row) {
      const sel = IRCTCExt.NgetPassengersFlow.getSelectors();
      const nameInput = IRCTCExt.Wait.queryOne(sel.passengerName, row);
      const ageInput = IRCTCExt.Wait.queryOne(sel.passengerAge, row);
      const berthSelect = IRCTCExt.Wait.queryOne(sel.passengerBerth, row);
      const gender = IRCTCExt.NgetPassengersFlow.readGenderFromRow(row);

      let berth = '';
      if (berthSelect?.tagName === 'SELECT') {
        const selected = berthSelect.options[berthSelect.selectedIndex];
        berth = (selected?.textContent || berthSelect.value || '').replace(/\s+/g, ' ').trim();
      }

      return {
        name: (nameInput?.value || '').replace(/\s+/g, ' ').trim(),
        age: String(ageInput?.value || '').trim(),
        gender,
        berth
      };
    },

    isRowEmpty(row) {
      const parsed = IRCTCExt.NgetPassengersFlow.parsePassengerRow(row);
      if (!parsed.name) return true;

      const sel = IRCTCExt.NgetPassengersFlow.getSelectors();
      const errors = IRCTCExt.Wait.queryAll(sel.validationError, row).filter((el) => {
        if (!IRCTCExt.Wait.isVisible(el)) return false;
        const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
        return /valid name|name is required/i.test(text);
      });
      return errors.length > 0;
    },

    rowMatchesPassenger(row, passenger) {
      const details = IRCTCExt.NgetPassengersFlow.parsePassengerRow(row);
      if (passengersLib().normalizeName(details.name) !== passengersLib().normalizeName(passenger.name)) return false;
      if (passenger.age && String(details.age).trim() !== String(passenger.age).trim()) return false;
      if (
        passenger.gender &&
        details.gender &&
        !passengersLib().segmentMatches(details.gender, passengersLib().genderToken(passenger.gender))
      ) {
        return false;
      }
      return true;
    },

    findAddPassengerLink() {
      const spans = IRCTCExt.Wait.queryAll(IRCTCExt.NgetPassengersFlow.getSelectors().addPassengerLink);
      for (const span of spans) {
        const text = (span.textContent || '').replace(/\s+/g, ' ').trim();
        if (/^\+?\s*add passenger/i.test(text)) {
          const link = span.closest('a') || span;
          if (IRCTCExt.Wait.isVisible(link)) return link;
        }
      }
      return null;
    },

    async clickAddPassenger() {
      const before = IRCTCExt.NgetPassengersFlow.getPassengerRows().length;
      const link = IRCTCExt.NgetPassengersFlow.findAddPassengerLink();
      if (!link) throw new Error('"+ Add Passenger" link not found');

      IRCTCExt.Events.click(link);

      const increased = await IRCTCExt.Wait.poll(
        () => {
          const count = IRCTCExt.NgetPassengersFlow.getPassengerRows().length;
          return count > before ? count : null;
        },
        { timeout: 10000, interval: 200 }
      );
      if (!increased) throw new Error('Passenger row was not added after clicking "+ Add Passenger"');
      return increased;
    },

    async ensurePassengerRows(count) {
      let rows = IRCTCExt.NgetPassengersFlow.getPassengerRows();
      while (rows.length < count) {
        await IRCTCExt.NgetPassengersFlow.clickAddPassenger();
        rows = IRCTCExt.NgetPassengersFlow.getPassengerRows();
      }
      return rows;
    },

    async deletePassengerRow(row, overlay) {
      const parsed = IRCTCExt.NgetPassengersFlow.parsePassengerRow(row);
      overlay?.setStatus(`Deleting passenger: ${parsed.name || 'empty row'}...`);

      const block = IRCTCExt.NgetPassengersFlow.getRowBlock(row);
      const deleteBtn = IRCTCExt.Wait.queryOne(
        IRCTCExt.NgetPassengersFlow.getSelectors().deletePassengerBtn,
        block
      );
      if (!deleteBtn || !IRCTCExt.Wait.isVisible(deleteBtn)) {
        throw new Error(`Delete button not found for ${parsed.name || 'passenger row'}`);
      }

      IRCTCExt.Events.click(deleteBtn);
      await IRCTCExt.Wait.delay(400);
      await passengersLib().confirmPassengerDeleteIfNeeded();

      const removed = await IRCTCExt.Wait.poll(
        () => (!document.contains(row) ? true : null),
        { timeout: 10000, interval: 200 }
      );
      if (!removed) throw new Error(`Passenger row was not removed: ${parsed.name || 'unknown'}`);
      return true;
    },

    visibleAutocompleteOptions() {
      const sel = IRCTCExt.NgetPassengersFlow.getSelectors();
      return IRCTCExt.Wait.queryAll(sel.autocompleteOptions).filter((item) =>
        IRCTCExt.Wait.isVisible(item)
      );
    },

    parseAutocompleteOption(li) {
      const name = (li.querySelector('strong')?.textContent || '').replace(/\s+/g, ' ').trim();
      const parts = (li.textContent || '')
        .replace(/\s+/g, ' ')
        .split('|')
        .map((part) => part.trim())
        .filter(Boolean);

      let age = '';
      let gender = '';
      if (parts.length >= 2) {
        const agePart = parts.find((part) => /\d+\s*yrs?/i.test(part)) || parts[1];
        age = agePart.replace(/\s*yrs?/i, '').trim();
      }
      if (parts.length >= 3) {
        gender = parts[parts.length - 1].replace(/fa-check-circle.*/i, '').trim();
      }

      if (!gender && parts.length >= 2) {
        const last = parts[parts.length - 1];
        if (!/\d/.test(last)) gender = last.replace(/fa-check-circle.*/i, '').trim();
      }

      return { name, age, gender };
    },

    shouldSkipAutocompleteOption(li, passenger, currentRow) {
      if (!li.querySelector('.fa-check-circle')) return false;
      const rows = IRCTCExt.NgetPassengersFlow.getPassengerRows();
      return rows.some(
        (row) =>
          row !== currentRow && IRCTCExt.NgetPassengersFlow.rowMatchesPassenger(row, passenger)
      );
    },

    optionMatchesPassenger(li, passenger) {
      const parsed = IRCTCExt.NgetPassengersFlow.parseAutocompleteOption(li);
      if (passengersLib().normalizeName(parsed.name) !== passengersLib().normalizeName(passenger.name)) return false;
      if (passenger.age && String(parsed.age).trim() !== String(passenger.age).trim()) return false;
      if (
        passenger.gender &&
        parsed.gender &&
        !passengersLib().segmentMatches(parsed.gender, passengersLib().genderToken(passenger.gender))
      ) {
        return false;
      }
      return true;
    },

    nameInputMatches(nameInput, passengerName) {
      return passengersLib().normalizeName(nameInput?.value || '') === passengersLib().normalizeName(passengerName);
    },

    async pickMasterListOption(nameInput, passenger) {
      const options = IRCTCExt.NgetPassengersFlow.visibleAutocompleteOptions();
      if (!options.length) return false;

      const currentRow = nameInput.closest('app-passenger');
      const match = options.find(
        (opt) =>
          !IRCTCExt.NgetPassengersFlow.shouldSkipAutocompleteOption(opt, passenger, currentRow) &&
          IRCTCExt.NgetPassengersFlow.optionMatchesPassenger(opt, passenger)
      );
      if (!match) return false;

      IRCTCExt.Events.click(match.querySelector('strong') || match);
      await IRCTCExt.Wait.delay(400);
      const row = nameInput.closest('app-passenger');
      return row
        ? IRCTCExt.NgetPassengersFlow.isRowIdentityComplete(row, passenger)
        : IRCTCExt.NgetPassengersFlow.nameInputMatches(nameInput, passenger.name);
    },

    isRowIdentityComplete(row, passenger) {
      if (!IRCTCExt.NgetPassengersFlow.rowMatchesPassenger(row, passenger)) return false;
      const parsed = IRCTCExt.NgetPassengersFlow.parsePassengerRow(row);
      if (passenger.age && !parsed.age) return false;
      if (passenger.gender && !parsed.gender) return false;
      return true;
    },

    async fillPassengerName(nameInput, passenger, row) {
      const name = String(passenger.name || '').trim();
      if (!name) return false;

      if (IRCTCExt.NgetPassengersFlow.isRowIdentityComplete(row, passenger)) {
        return true;
      }

      nameInput.focus();
      IRCTCExt.Events.setInputValue(nameInput, name, { blur: false });
      await IRCTCExt.Wait.delay(200);

      if (IRCTCExt.NgetPassengersFlow.isRowIdentityComplete(row, passenger)) {
        return true;
      }

      const pickedAfterSet = await IRCTCExt.Wait.poll(
        async () => {
          if (await IRCTCExt.NgetPassengersFlow.pickMasterListOption(nameInput, passenger)) return true;
          return null;
        },
        { timeout: 2000, interval: 150 }
      );
      if (pickedAfterSet) return true;

      const prefix = name.slice(0, Math.min(4, name.length));
      if (prefix) {
        IRCTCExt.Events.setInputValue(nameInput, '', { blur: false });
        await IRCTCExt.Events.typeSlowly(nameInput, prefix, 25);
        await IRCTCExt.Wait.delay(250);
        if (await IRCTCExt.NgetPassengersFlow.pickMasterListOption(nameInput, passenger)) return true;
      }

      IRCTCExt.Events.setInputValue(nameInput, name, { blur: false });
      await IRCTCExt.Wait.delay(200);
      if (await IRCTCExt.NgetPassengersFlow.pickMasterListOption(nameInput, passenger)) return true;

      return await IRCTCExt.NgetPassengersFlow.fillPassengerNameManual(nameInput, passenger, row);
    },

    async fillPassengerNameManual(nameInput, passenger, row) {
      const sel = IRCTCExt.NgetPassengersFlow.getSelectors();
      const name = String(passenger.name || '').trim();

      IRCTCExt.Events.setInputValue(nameInput, name, { blur: false });

      const ageInput = IRCTCExt.Wait.queryOne(sel.passengerAge, row);
      if (ageInput && !ageInput.readOnly && passenger.age) {
        IRCTCExt.Events.setInputValue(ageInput, String(passenger.age).trim());
      }

      const genderOk = await IRCTCExt.NgetPassengersFlow.selectGenderOnRow(row, passenger);
      if (!genderOk && passenger.gender) {
        throw new Error(`Could not select gender: ${passengersLib().genderLabel(passenger.gender)}`);
      }

      await IRCTCExt.Wait.delay(200);
      return IRCTCExt.NgetPassengersFlow.isRowIdentityComplete(row, passenger);
    },

    genderSelectValue(gender) {
      const token = String(gender || '').trim();
      const map = {
        M: 'M',
        F: 'F',
        T: 'T',
        Male: 'M',
        Female: 'F',
        Transgender: 'T'
      };
      if (map[token]) return map[token];
      const label = passengersLib().genderLabel(token);
      return map[label] || token;
    },

    async selectNativeSelectOption(select, passenger) {
      const targetValue = IRCTCExt.NgetPassengersFlow.genderSelectValue(passenger.gender);
      const option = [...select.options].find(
        (opt) =>
          opt.value === targetValue ||
          passengersLib().segmentMatches(opt.textContent, passengersLib().genderToken(passenger.gender))
      );
      if (!option) return false;

      select.focus();
      IRCTCExt.Events.click(select);
      select.value = option.value;
      select.selectedIndex = option.index;
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
      select.dispatchEvent(new Event('blur', { bubbles: true }));
      await IRCTCExt.Wait.delay(150);

      if (select.value === option.value) return true;

      IRCTCExt.Events.click(select);
      await IRCTCExt.Wait.delay(100);
      select.value = option.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      await IRCTCExt.Wait.delay(150);
      return select.value === option.value;
    },

    async selectGenderOnRow(row, passenger) {
      if (!passenger?.gender) return true;

      const currentGender = IRCTCExt.NgetPassengersFlow.readGenderFromRow(row);
      if (IRCTCExt.NgetPassengersFlow.genderMatchesPassenger(currentGender, passenger)) {
        return true;
      }

      const genderEl = IRCTCExt.NgetPassengersFlow.findEditableGenderElement(row);
      if (!genderEl) {
        return IRCTCExt.NgetPassengersFlow.genderMatchesPassenger(
          IRCTCExt.NgetPassengersFlow.readGenderFromRow(row),
          passenger
        );
      }

      const genderLabel = passengersLib().genderLabel(passenger.gender);
      const sel = IRCTCExt.NgetPassengersFlow.getSelectors();

      if (genderEl.tagName === 'SELECT') {
        const selected = await IRCTCExt.NgetPassengersFlow.selectNativeSelectOption(
          genderEl,
          passenger
        );
        if (selected) return true;
        return IRCTCExt.NgetPassengersFlow.genderMatchesPassenger(
          IRCTCExt.NgetPassengersFlow.readGenderFromRow(row),
          passenger
        );
      }

      if (genderEl.tagName === 'INPUT' && !genderEl.readOnly) {
        IRCTCExt.Events.setInputValue(genderEl, genderLabel);
        return IRCTCExt.NgetPassengersFlow.genderMatchesPassenger(
          IRCTCExt.NgetPassengersFlow.readGenderFromRow(row),
          passenger
        );
      }

      if (genderEl.closest?.('p-dropdown') || genderEl.matches?.('p-dropdown')) {
        const selected = await passengersLib().selectDropdownIn(row, sel.passengerGender, genderLabel);
        return (
          selected ||
          IRCTCExt.NgetPassengersFlow.genderMatchesPassenger(
            IRCTCExt.NgetPassengersFlow.readGenderFromRow(row),
            passenger
          )
        );
      }

      return false;
    },

    berthSelectValue(berth) {
      const label = String(berth || '').trim();
      const map = {
        Upper: 'UB',
        Lower: 'LB',
        Middle: 'MB',
        'Side Lower': 'SL',
        'Side Upper': 'SU',
        'No Preference': '',
        '': ''
      };
      return map[label] ?? map[label.replace(/\s+/g, ' ')] ?? '';
    },

    async selectBerthOnRow(row, passenger) {
      const labels = passengersLib().berthLabelsToTry(passenger?.berth);
      if (!labels.length) return true;

      const sel = IRCTCExt.NgetPassengersFlow.getSelectors();
      const berthSelect = IRCTCExt.Wait.queryOne(sel.passengerBerth, row);
      if (!berthSelect || berthSelect.tagName !== 'SELECT') return false;

      const targetValue = IRCTCExt.NgetPassengersFlow.berthSelectValue(passenger.berth);
      const current = berthSelect.value;
      if (current === targetValue) return true;

      const option = [...berthSelect.options].find(
        (opt) =>
          opt.value === targetValue ||
          labels.some((label) => passengersLib().dropdownValueMatches(opt.textContent, label))
      );
      if (!option) return false;

      berthSelect.value = option.value;
      berthSelect.dispatchEvent(new Event('input', { bubbles: true }));
      berthSelect.dispatchEvent(new Event('change', { bubbles: true }));
      await IRCTCExt.Wait.delay(150);
      return berthSelect.value === option.value;
    },

    rowBerthMatches(row, passenger) {
      const labels = passengersLib().berthLabelsToTry(passenger?.berth);
      if (!labels.length) return true;

      const parsed = IRCTCExt.NgetPassengersFlow.parsePassengerRow(row);
      return labels.some((label) => passengersLib().dropdownValueMatches(parsed.berth, label));
    },

    async fillPassengerRow(row, passenger, overlay) {
      const sel = IRCTCExt.NgetPassengersFlow.getSelectors();
      const nameInput = IRCTCExt.Wait.queryOne(sel.passengerName, row);
      if (!nameInput) throw new Error('Passenger name field not found');

      overlay?.setStatus(`Filling passenger: ${passenger.name}...`);
      const nameOk = await IRCTCExt.NgetPassengersFlow.fillPassengerName(nameInput, passenger, row);
      if (!nameOk) throw new Error(`Could not set passenger name: ${passenger.name}`);

      const berthOk = await IRCTCExt.NgetPassengersFlow.selectBerthOnRow(row, passenger);
      if (!berthOk && passengersLib().berthLabelsToTry(passenger?.berth).length) {
        throw new Error(`Could not select berth: ${passengersLib().berthLabel(passenger.berth)}`);
      }

      if (!IRCTCExt.NgetPassengersFlow.rowMatchesPassenger(row, passenger)) {
        const parsed = IRCTCExt.NgetPassengersFlow.parsePassengerRow(row);
        throw new Error(
          `Passenger row mismatch for ${passenger.name} (got name="${parsed.name}", age="${parsed.age}", gender="${parsed.gender}")`
        );
      }

      return true;
    },

    findEmptyRow(usedRows = new Set()) {
      const rows = IRCTCExt.NgetPassengersFlow.getPassengerRows();
      return rows.find((row) => !usedRows.has(row) && IRCTCExt.NgetPassengersFlow.isRowEmpty(row)) || null;
    },

    findMatchingRow(passenger, usedRows = new Set()) {
      const rows = IRCTCExt.NgetPassengersFlow.getPassengerRows();
      return (
        rows.find(
          (row) =>
            !usedRows.has(row) &&
            !IRCTCExt.NgetPassengersFlow.isRowEmpty(row) &&
            IRCTCExt.NgetPassengersFlow.rowMatchesPassenger(row, passenger)
        ) || null
      );
    },

    partitionRows(passengers) {
      const rows = IRCTCExt.NgetPassengersFlow.getPassengerRows();
      const matched = [];
      const unmatchedPassengers = [];
      const usedRows = new Set();

      for (const passenger of passengers) {
        const row = IRCTCExt.NgetPassengersFlow.findMatchingRow(passenger, usedRows);
        if (row) {
          matched.push({ passenger, row });
          usedRows.add(row);
        } else {
          unmatchedPassengers.push(passenger);
        }
      }

      const extraRows = rows.filter((row) => !usedRows.has(row));
      return { matched, unmatchedPassengers, extraRows };
    },

    async getOrCreateEmptyRow(usedRows) {
      let empty = IRCTCExt.NgetPassengersFlow.findEmptyRow(usedRows);
      if (empty) return empty;

      await IRCTCExt.NgetPassengersFlow.clickAddPassenger();
      empty = IRCTCExt.NgetPassengersFlow.findEmptyRow(usedRows);
      if (!empty) throw new Error('Could not find empty passenger row after adding');
      return empty;
    },

    findRowByName(passenger, usedRows = new Set()) {
      const configName = passengersLib().normalizeName(passenger.name);
      const rows = IRCTCExt.NgetPassengersFlow.getPassengerRows();
      return (
        rows.find((row) => {
          if (usedRows.has(row) || IRCTCExt.NgetPassengersFlow.isRowEmpty(row)) return false;
          const parsed = IRCTCExt.NgetPassengersFlow.parsePassengerRow(row);
          return passengersLib().normalizeName(parsed.name) === configName;
        }) || null
      );
    },

    passengerRowIsCorrect(row, passenger) {
      return (
        IRCTCExt.NgetPassengersFlow.rowMatchesPassenger(row, passenger) &&
        IRCTCExt.NgetPassengersFlow.rowBerthMatches(row, passenger)
      );
    },

    getFailingPassengers(passengers) {
      return passengers.filter((passenger) => {
        const row = IRCTCExt.NgetPassengersFlow.findMatchingRow(passenger);
        return !row || !IRCTCExt.NgetPassengersFlow.passengerRowIsCorrect(row, passenger);
      });
    },

    async fixPassengerRow(passenger, overlay, usedRows = new Set()) {
      overlay.setStatus(`Fixing passenger: ${passenger.name}...`);

      const matchingRow = IRCTCExt.NgetPassengersFlow.findMatchingRow(passenger, usedRows);
      if (matchingRow && IRCTCExt.NgetPassengersFlow.passengerRowIsCorrect(matchingRow, passenger)) {
        usedRows.add(matchingRow);
        return matchingRow;
      }

      const nameRow = IRCTCExt.NgetPassengersFlow.findRowByName(passenger, usedRows);
      if (nameRow) {
        await IRCTCExt.NgetPassengersFlow.deletePassengerRow(nameRow, overlay);
      } else if (matchingRow) {
        await IRCTCExt.NgetPassengersFlow.deletePassengerRow(matchingRow, overlay);
      }

      const row = await IRCTCExt.NgetPassengersFlow.getOrCreateEmptyRow(usedRows);
      usedRows.add(row);
      await IRCTCExt.NgetPassengersFlow.fillPassengerRow(row, passenger, overlay);
      return row;
    },

    async reviewPassengers(config, overlay) {
      return IRCTCExt.NgetPassengersFlow.verifyAndReconcilePassengerList(config, overlay);
    },

    async verifyAndReconcilePassengerList(config, overlay) {
      const passengers = (config.passengers || []).filter((p) => p.name && String(p.name).trim());
      const maxPasses = 3;

      for (let pass = 1; pass <= maxPasses; pass += 1) {
        overlay.setStatus(`Verifying passenger list (${pass}/${maxPasses})...`);
        await IRCTCExt.Wait.delay(400);

        let changed = false;
        let { matched, unmatchedPassengers, extraRows } =
          IRCTCExt.NgetPassengersFlow.partitionRows(passengers);

        for (const row of extraRows) {
          const parsed = IRCTCExt.NgetPassengersFlow.parsePassengerRow(row);
          if (!parsed.name && IRCTCExt.NgetPassengersFlow.isRowEmpty(row)) {
            if (IRCTCExt.NgetPassengersFlow.getPassengerRows().length > passengers.length) {
              await IRCTCExt.NgetPassengersFlow.deletePassengerRow(row, overlay);
              changed = true;
            }
            continue;
          }
          overlay.setStatus(`Removing extra passenger: ${parsed.name || 'unknown'}...`);
          await IRCTCExt.NgetPassengersFlow.deletePassengerRow(row, overlay);
          changed = true;
        }

        if (changed) {
          ({ matched, unmatchedPassengers, extraRows } =
            IRCTCExt.NgetPassengersFlow.partitionRows(passengers));
        }

        for (const { passenger, row } of matched) {
          if (!IRCTCExt.NgetPassengersFlow.rowBerthMatches(row, passenger)) {
            overlay.setStatus(`Updating berth for ${passenger.name}...`);
            const berthOk = await IRCTCExt.NgetPassengersFlow.selectBerthOnRow(row, passenger);
            if (!berthOk) {
              throw new Error(`Could not update berth for ${passenger.name}`);
            }
            changed = true;
          }
        }

        const usedRows = new Set(matched.map((item) => item.row));
        for (const passenger of unmatchedPassengers) {
          overlay.setStatus(`Adding missing passenger: ${passenger.name}...`);
          const row = await IRCTCExt.NgetPassengersFlow.getOrCreateEmptyRow(usedRows);
          usedRows.add(row);
          await IRCTCExt.NgetPassengersFlow.fillPassengerRow(row, passenger, overlay);
          changed = true;
        }

        if (!changed) {
          const finalRows = IRCTCExt.NgetPassengersFlow.getPassengerRows().filter(
            (row) => !IRCTCExt.NgetPassengersFlow.isRowEmpty(row)
          );
          if (finalRows.length !== passengers.length) {
            throw new Error(`Expected ${passengers.length} passenger(s), found ${finalRows.length}`);
          }

          const failingPassengers = IRCTCExt.NgetPassengersFlow.getFailingPassengers(passengers);

          if (failingPassengers.length) {
            if (pass === maxPasses) {
              throw new Error(`Could not verify passenger: ${failingPassengers[0]?.name || 'unknown'}`);
            }
            const usedRows = new Set();
            for (const passenger of failingPassengers) {
              await IRCTCExt.NgetPassengersFlow.fixPassengerRow(passenger, overlay, usedRows);
            }
            changed = true;
          } else {
            overlay.setStatus(`Verified ${passengers.length} passenger(s)`);
            return true;
          }
        }
      }

      throw new Error('Passenger list verification failed after multiple attempts');
    },

    async addPassengers(config, overlay) {
      overlay.setStep('Passengers');
      await IRCTCExt.Storage.updateState({ currentStep: 'passengers' });

      const passengers = (config.passengers || []).filter((p) => p.name && String(p.name).trim());
      if (!passengers.length) throw new Error('No passengers configured with names');

      await IRCTCExt.NgetPassengersFlow.ensurePassengerRows(1);

      const usedRows = new Set();
      for (let i = 0; i < passengers.length; i += 1) {
        const passenger = passengers[i];
        overlay.setStatus(`Adding passenger ${i + 1}/${passengers.length}: ${passenger.name}...`);

        let row = IRCTCExt.NgetPassengersFlow.findMatchingRow(passenger, usedRows);
        if (!row) {
          row = await IRCTCExt.NgetPassengersFlow.getOrCreateEmptyRow(usedRows);
          await IRCTCExt.NgetPassengersFlow.fillPassengerRow(row, passenger, overlay);
        } else {
          if (!IRCTCExt.NgetPassengersFlow.rowBerthMatches(row, passenger)) {
            await IRCTCExt.NgetPassengersFlow.selectBerthOnRow(row, passenger);
          }
        }

        usedRows.add(row);
      }

      await IRCTCExt.NgetPassengersFlow.verifyAndReconcilePassengerList(config, overlay);
      overlay.setStatus(`Verified ${passengers.length} passenger(s)`);
      return true;
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
