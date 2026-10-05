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
        berth = (selected?.textContent || '').replace(/\s+/g, ' ').trim();
        if (!berth && berthSelect.value === 'WS') berth = 'Window Side';
        else if (!berth) berth = String(berthSelect.value || '').trim();
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

    visibleAutocompletePanels() {
      const panelSelectors =
        IRCTCExt.NgetSelectors?.autocompletePanel || ['.ui-autocomplete-panel', 'ul.ui-autocomplete-items'];
      const panels = IRCTCExt.Wait.queryAll([
        '.ui-autocomplete-panel',
        '.p-autocomplete-panel',
        ...panelSelectors
      ]);
      return panels.filter((panel) => IRCTCExt.Wait.isVisible(panel));
    },

    visibleAutocompleteOptions(nameInput) {
      const panels = IRCTCExt.NgetPassengersFlow.visibleAutocompletePanels();
      let scopedPanels = panels;

      if (nameInput && panels.length > 1) {
        const anchor = nameInput.getBoundingClientRect();
        scopedPanels = [...panels]
          .map((panel) => {
            const rect = panel.getBoundingClientRect();
            const distance = Math.abs(rect.top - anchor.bottom) + Math.abs(rect.left - anchor.left) * 0.25;
            return { panel, distance };
          })
          .filter((item) => item.distance < 400)
          .sort((a, b) => a.distance - b.distance)
          .map((item) => item.panel);
      }

      const items = [];
      for (const panel of scopedPanels.length ? scopedPanels : panels) {
        panel.querySelectorAll('li.ui-autocomplete-list-item, li[role="option"]').forEach((li) => {
          if (IRCTCExt.Wait.isVisible(li)) items.push(li);
        });
      }

      if (items.length) return items;

      const sel = IRCTCExt.NgetPassengersFlow.getSelectors();
      return IRCTCExt.Wait.queryAll(sel.autocompleteOptions).filter((item) => IRCTCExt.Wait.isVisible(item));
    },

    findMasterListMatch(nameInput, passenger) {
      const options = IRCTCExt.NgetPassengersFlow.visibleAutocompleteOptions(nameInput);
      if (!options.length) return null;

      const currentRow = nameInput.closest('app-passenger');
      const candidates = options
        .map((opt, index) => ({ opt, index }))
        .filter(
          ({ opt }) =>
            !IRCTCExt.NgetPassengersFlow.shouldSkipAutocompleteOption(opt, passenger, currentRow) &&
            IRCTCExt.NgetPassengersFlow.optionMatchesPassenger(opt, passenger)
        )
        .map(({ opt, index }) => ({
          opt,
          index,
          score: IRCTCExt.NgetPassengersFlow.rankMasterListOption(opt, passenger, currentRow)
        }))
        .sort((a, b) => b.score - a.score);

      return candidates[0] || null;
    },

    passengerWithMasterOption(passenger, optionLi) {
      const parsed = IRCTCExt.NgetPassengersFlow.parseAutocompleteOption(optionLi);
      return {
        ...passenger,
        name: passenger.name || parsed.name,
        age: passenger.age || parsed.age,
        gender: passenger.gender || parsed.gender
      };
    },

    async applyDemographicsFromMasterOption(row, optionLi, passenger) {
      if (!row || !optionLi) return false;
      const merged = IRCTCExt.NgetPassengersFlow.passengerWithMasterOption(passenger, optionLi);
      const sel = IRCTCExt.NgetPassengersFlow.getSelectors();
      let changed = false;

      const parsed = IRCTCExt.NgetPassengersFlow.parsePassengerRow(row);
      const ageInput = IRCTCExt.Wait.queryOne(sel.passengerAge, row);
      const wantAge = String(merged.age || '').trim();
      if (wantAge && ageInput && IRCTCExt.Wait.isVisible(ageInput)) {
        const haveAge = String(parsed.age || ageInput.value || '').trim();
        if (haveAge !== wantAge) {
          IRCTCExt.Events.setInputValue(ageInput, wantAge, { blur: false });
          await IRCTCExt.Wait.delay(200);
          changed = true;
        }
      }

      const gender = IRCTCExt.NgetPassengersFlow.readGenderFromRow(row);
      if (merged.gender && IRCTCExt.NgetPassengersFlow.isPlaceholderGender(gender)) {
        const genderOk = await IRCTCExt.NgetPassengersFlow.selectGenderOnRow(row, merged);
        if (genderOk) changed = true;
      }

      return changed;
    },

    passengerHasAge(passenger) {
      return Boolean(String(passenger?.age || '').trim());
    },

    passengerHasGender(passenger) {
      return Boolean(String(passenger?.gender || '').trim());
    },

    passengerIdentityMode(passenger) {
      const hasAge = IRCTCExt.NgetPassengersFlow.passengerHasAge(passenger);
      const hasGender = IRCTCExt.NgetPassengersFlow.passengerHasGender(passenger);
      if (hasAge && hasGender) return 'full';
      if (!hasAge && !hasGender) return 'nameOnly';
      return 'partial';
    },

    normalizeOptionGender(gender) {
      const text = String(gender || '')
        .replace(/fa-check-circle.*/i, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (!text) return '';
      const token = passengersLib().genderToken(text);
      return token ? String(token).toLowerCase() : text.toLowerCase();
    },

    normalizeOptionAge(age) {
      const digits = String(age || '').replace(/\D/g, '');
      return digits || String(age || '').trim();
    },

    optionIdentityKey(parsed) {
      const name = passengersLib().normalizeName(parsed?.name);
      const age = IRCTCExt.NgetPassengersFlow.normalizeOptionAge(parsed?.age);
      const gender = IRCTCExt.NgetPassengersFlow.normalizeOptionGender(parsed?.gender);
      return `${name}|${age}|${gender}`;
    },

    rowIdentityKeyFromRow(row) {
      if (!row) return '';
      const parsed = IRCTCExt.NgetPassengersFlow.parsePassengerRow(row);
      return IRCTCExt.NgetPassengersFlow.optionIdentityKey(parsed);
    },

    isMasterIdentityUsedOnAnotherRow(optionKey, currentRow) {
      if (!optionKey || optionKey === '||') return false;
      const rows = IRCTCExt.NgetPassengersFlow.getPassengerRows();
      return rows.some((row) => {
        if (row === currentRow) return false;
        const key = IRCTCExt.NgetPassengersFlow.rowIdentityKeyFromRow(row);
        return key === optionKey;
      });
    },

    rowUsesMasterIdentity(row, optionKey) {
      if (!row || !optionKey) return false;
      return IRCTCExt.NgetPassengersFlow.rowIdentityKeyFromRow(row) === optionKey;
    },

    parseAutocompleteOption(li) {
      const strongName = (li.querySelector('strong')?.textContent || '').replace(/\s+/g, ' ').trim();
      const rawText = (li.textContent || '')
        .replace(/fa-check-circle/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
      const parts = rawText
        .split('|')
        .map((part) => part.trim())
        .filter(Boolean);

      let name = strongName;
      if (!name && parts.length) {
        name = parts[0];
      }

      let age = '';
      const agePart = parts.find((part) => /\d+\s*yrs?/i.test(part));
      if (agePart) {
        age = IRCTCExt.NgetPassengersFlow.normalizeOptionAge(agePart);
      }

      let gender = '';
      for (let i = parts.length - 1; i >= 0; i -= 1) {
        const part = parts[i].replace(/fa-check-circle.*/i, '').trim();
        if (!part || /\d+\s*yrs?/i.test(part)) continue;
        if (passengersLib().normalizeName(part) === passengersLib().normalizeName(name)) continue;
        if (/^\d+$/.test(part)) continue;
        gender = part;
        break;
      }

      return { name, age, gender };
    },

    optionGenderMatchesPassenger(parsed, passenger) {
      if (!parsed?.gender || !passenger?.gender) return false;
      return passengersLib().segmentMatches(
        parsed.gender,
        passengersLib().genderToken(passenger.gender)
      );
    },

    shouldSkipAutocompleteOption(li, passenger, currentRow) {
      const parsed = IRCTCExt.NgetPassengersFlow.parseAutocompleteOption(li);
      const optionKey = IRCTCExt.NgetPassengersFlow.optionIdentityKey(parsed);
      return IRCTCExt.NgetPassengersFlow.isMasterIdentityUsedOnAnotherRow(optionKey, currentRow);
    },

    optionMatchesPassenger(li, passenger) {
      const parsed = IRCTCExt.NgetPassengersFlow.parseAutocompleteOption(li);
      if (!parsed.name) return false;
      if (
        passengersLib().normalizeName(parsed.name) !== passengersLib().normalizeName(passenger.name)
      ) {
        return false;
      }

      const mode = IRCTCExt.NgetPassengersFlow.passengerIdentityMode(passenger);
      if (mode === 'nameOnly') return true;

      if (IRCTCExt.NgetPassengersFlow.passengerHasAge(passenger)) {
        const want = IRCTCExt.NgetPassengersFlow.normalizeOptionAge(passenger.age);
        const got = IRCTCExt.NgetPassengersFlow.normalizeOptionAge(parsed.age);
        if (want !== got) return false;
      }

      if (IRCTCExt.NgetPassengersFlow.passengerHasGender(passenger)) {
        if (!parsed.gender) return false;
        if (!IRCTCExt.NgetPassengersFlow.optionGenderMatchesPassenger(parsed, passenger)) return false;
      }

      if (mode === 'full') {
        if (!parsed.age || !parsed.gender) return false;
      }

      return true;
    },

    rankMasterListOption(opt, passenger, currentRow) {
      const parsed = IRCTCExt.NgetPassengersFlow.parseAutocompleteOption(opt);
      const optionKey = IRCTCExt.NgetPassengersFlow.optionIdentityKey(parsed);
      const usedElsewhere = IRCTCExt.NgetPassengersFlow.isMasterIdentityUsedOnAnotherRow(
        optionKey,
        currentRow
      );
      let score = 0;
      if (!usedElsewhere) score += 20;
      if (IRCTCExt.NgetPassengersFlow.passengerIdentityMode(passenger) === 'full') {
        if (parsed.age && parsed.gender) score += 10;
      }
      if (!opt.querySelector('.fa-check-circle')) score += 2;
      return score;
    },

    nameInputMatches(nameInput, passengerName) {
      return passengersLib().normalizeName(nameInput?.value || '') === passengersLib().normalizeName(passengerName);
    },

    clickMasterListOption(li) {
      if (!li) return;
      IRCTCExt.Events.click(li);
      IRCTCExt.Events.clickWithMouse(li);
    },

    async selectMasterListOptionByKeyboard(nameInput, optionIndex) {
      if (!nameInput || optionIndex < 0) return;
      nameInput.focus();
      for (let i = 0; i <= optionIndex; i += 1) {
        IRCTCExt.Events.pressKey(nameInput, 'ArrowDown');
        await IRCTCExt.Wait.delay(90);
      }
      IRCTCExt.Events.pressKey(nameInput, 'Enter');
      await IRCTCExt.Wait.delay(350);
    },

    async clearNameInputForMasterList(nameInput) {
      if (!nameInput) return;
      nameInput.focus();
      IRCTCExt.Events.setInputValue(nameInput, '', { blur: false });
      await IRCTCExt.Wait.delay(120);
      if (String(nameInput.value || '').trim()) {
        IRCTCExt.Events.setNativeValue(nameInput, '');
        nameInput.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward' }));
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
        nameInput.dispatchEvent(new Event('change', { bubbles: true }));
        await IRCTCExt.Wait.delay(120);
      }
    },

    async focusNameInputForMasterList(nameInput) {
      if (!nameInput) return;
      nameInput.focus();
      IRCTCExt.Events.click(nameInput);
      const wrapper = nameInput.closest('p-autocomplete, .ui-autocomplete');
      if (wrapper && wrapper !== nameInput) {
        IRCTCExt.Events.click(wrapper);
      }
      await IRCTCExt.Wait.delay(200);
    },

    async waitForMasterRowComplete(row, passenger, timeout = 2500) {
      return IRCTCExt.Wait.poll(
        () =>
          IRCTCExt.NgetPassengersFlow.isRowIdentityComplete(row, passenger)
            ? true
            : null,
        { timeout, interval: 120 }
      );
    },

    async commitMasterListSelection(nameInput, passenger, row, matchEntry) {
      if (!nameInput || !row || !matchEntry?.opt) return false;

      const effective = IRCTCExt.NgetPassengersFlow.passengerWithMasterOption(
        passenger,
        matchEntry.opt
      );

      IRCTCExt.NgetPassengersFlow.clickMasterListOption(matchEntry.opt);
      await IRCTCExt.Wait.delay(350);
      if (await IRCTCExt.NgetPassengersFlow.waitForMasterRowComplete(row, effective, 2500)) {
        return true;
      }

      await IRCTCExt.NgetPassengersFlow.selectMasterListOptionByKeyboard(nameInput, matchEntry.index);
      if (await IRCTCExt.NgetPassengersFlow.waitForMasterRowComplete(row, effective, 2500)) {
        return true;
      }

      await IRCTCExt.NgetPassengersFlow.applyDemographicsFromMasterOption(row, matchEntry.opt, passenger);
      return IRCTCExt.NgetPassengersFlow.isRowIdentityComplete(row, effective);
    },

    async pollMasterListPick(nameInput, passenger, row, timeout = 5000) {
      let committed = false;
      let lastMatch = null;

      const picked = await IRCTCExt.Wait.poll(
        async () => {
          if (committed && row) {
            const effective = lastMatch
              ? IRCTCExt.NgetPassengersFlow.passengerWithMasterOption(passenger, lastMatch.opt)
              : passenger;
            if (IRCTCExt.NgetPassengersFlow.isRowIdentityComplete(row, effective)) return true;
            if (lastMatch) {
              await IRCTCExt.NgetPassengersFlow.applyDemographicsFromMasterOption(
                row,
                lastMatch.opt,
                passenger
              );
              if (IRCTCExt.NgetPassengersFlow.isRowIdentityComplete(row, effective)) return true;
            }
            return null;
          }

          const match = IRCTCExt.NgetPassengersFlow.findMasterListMatch(nameInput, passenger);
          if (!match) {
            if (!String(nameInput.value || '').trim()) {
              await IRCTCExt.NgetPassengersFlow.focusNameInputForMasterList(nameInput);
            }
            return null;
          }

          if (!committed) {
            committed = true;
            lastMatch = match;
            await IRCTCExt.NgetPassengersFlow.commitMasterListSelection(
              nameInput,
              passenger,
              row,
              match
            );
          }

          const effective = IRCTCExt.NgetPassengersFlow.passengerWithMasterOption(
            passenger,
            match.opt
          );
          if (IRCTCExt.NgetPassengersFlow.isRowIdentityComplete(row, effective)) return true;
          return null;
        },
        { timeout, interval: 200 }
      );

      const effective = lastMatch
        ? IRCTCExt.NgetPassengersFlow.passengerWithMasterOption(passenger, lastMatch.opt)
        : passenger;
      const success =
        Boolean(picked) ||
        (row && IRCTCExt.NgetPassengersFlow.isRowIdentityComplete(row, effective));
      return { success, lastMatch };
    },

    rowHasRequiredDemographics(row) {
      const parsed = IRCTCExt.NgetPassengersFlow.parsePassengerRow(row);
      if (!parsed.name) return false;

      const sel = IRCTCExt.NgetPassengersFlow.getSelectors();
      const ageInput = IRCTCExt.Wait.queryOne(sel.passengerAge, row);
      if (ageInput && IRCTCExt.Wait.isVisible(ageInput)) {
        const ageText = String(parsed.age || ageInput.value || '').replace(/\D/g, '');
        const age = parseInt(ageText, 10);
        if (!Number.isFinite(age) || age < 1 || age > 125) return false;
      }

      const gender = IRCTCExt.NgetPassengersFlow.readGenderFromRow(row);
      if (IRCTCExt.NgetPassengersFlow.isPlaceholderGender(gender)) {
        const genderEl = IRCTCExt.NgetPassengersFlow.findEditableGenderElement(row);
        if (genderEl) return false;
      }

      return true;
    },

    isRowIdentityComplete(row, passenger) {
      if (!IRCTCExt.NgetPassengersFlow.rowMatchesPassenger(row, passenger)) return false;
      if (!IRCTCExt.NgetPassengersFlow.rowHasRequiredDemographics(row)) return false;
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

      // IRCTC master list only opens when the name field is empty and focused.
      await IRCTCExt.NgetPassengersFlow.clearNameInputForMasterList(nameInput);
      await IRCTCExt.NgetPassengersFlow.focusNameInputForMasterList(nameInput);
      const pickResult = await IRCTCExt.NgetPassengersFlow.pollMasterListPick(
        nameInput,
        passenger,
        row,
        6000
      );
      if (pickResult.success) return true;

      return await IRCTCExt.NgetPassengersFlow.fillPassengerNameManual(
        nameInput,
        passenger,
        row,
        pickResult.lastMatch?.opt || null
      );
    },

    async fillPassengerNameManual(nameInput, passenger, row, masterOptionLi = null) {
      const sel = IRCTCExt.NgetPassengersFlow.getSelectors();
      const merged = masterOptionLi
        ? IRCTCExt.NgetPassengersFlow.passengerWithMasterOption(passenger, masterOptionLi)
        : passenger;
      const name = String(merged.name || '').trim();
      const parsed = IRCTCExt.NgetPassengersFlow.parsePassengerRow(row);

      if (!parsed.name && name) {
        IRCTCExt.Events.setInputValue(nameInput, name, { blur: false });
      }

      if (masterOptionLi) {
        await IRCTCExt.NgetPassengersFlow.applyDemographicsFromMasterOption(row, masterOptionLi, passenger);
      }

      const ageInput = IRCTCExt.Wait.queryOne(sel.passengerAge, row);
      const wantAge = String(merged.age || '').trim();
      if (ageInput && IRCTCExt.Wait.isVisible(ageInput) && wantAge) {
        const haveAge = String(parsed.age || ageInput.value || '').trim();
        if (haveAge !== wantAge) {
          IRCTCExt.Events.setInputValue(ageInput, wantAge, { blur: false });
        }
      }

      const genderOk = await IRCTCExt.NgetPassengersFlow.selectGenderOnRow(row, merged);
      if (!genderOk && merged.gender) {
        throw new Error(`Could not select gender: ${passengersLib().genderLabel(merged.gender)}`);
      }

      await IRCTCExt.Wait.delay(200);
      return IRCTCExt.NgetPassengersFlow.isRowIdentityComplete(row, merged);
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
        'Window Side': 'WS',
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
          labels.some((label) => passengersLib().dropdownValueMatches(opt.textContent, label)) ||
          opt.value === targetValue
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

      if (!IRCTCExt.NgetPassengersFlow.passengerRowIsCorrect(row, passenger)) {
        const parsed = IRCTCExt.NgetPassengersFlow.parsePassengerRow(row);
        throw new Error(
          `Passenger row incomplete for ${passenger.name} (got name="${parsed.name}", age="${parsed.age}", gender="${parsed.gender}")`
        );
      }

      return true;
    },

    rowCompletenessScore(row) {
      const parsed = IRCTCExt.NgetPassengersFlow.parsePassengerRow(row);
      let score = 0;
      if (parsed.name) score += 10;
      if (parsed.age) score += 6;
      if (!IRCTCExt.NgetPassengersFlow.isPlaceholderGender(parsed.gender)) score += 6;
      if (parsed.berth) score += 1;
      return score;
    },

    async dedupeConfigPassengerRows(passengers, overlay) {
      const allowByName = new Map();
      for (const passenger of passengers) {
        const key = passengersLib().normalizeName(passenger.name);
        allowByName.set(key, (allowByName.get(key) || 0) + 1);
      }

      const buckets = new Map();
      for (const row of IRCTCExt.NgetPassengersFlow.getPassengerRows()) {
        const parsed = IRCTCExt.NgetPassengersFlow.parsePassengerRow(row);
        const key = passengersLib().normalizeName(parsed.name);
        if (!key || !allowByName.has(key)) continue;
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(row);
      }

      for (const [key, rows] of buckets) {
        const allow = allowByName.get(key) || 1;
        if (rows.length <= allow) continue;
        rows.sort(
          (a, b) =>
            IRCTCExt.NgetPassengersFlow.rowCompletenessScore(b) -
            IRCTCExt.NgetPassengersFlow.rowCompletenessScore(a)
        );
        for (let i = allow; i < rows.length; i += 1) {
          overlay?.setStatus(`Removing duplicate passenger: ${key}...`);
          await IRCTCExt.NgetPassengersFlow.deletePassengerRow(rows[i], overlay);
        }
      }
    },

    findEmptyRow(usedRows = new Set()) {
      const rows = IRCTCExt.NgetPassengersFlow.getPassengerRows();
      return rows.find((row) => !usedRows.has(row) && IRCTCExt.NgetPassengersFlow.isRowEmpty(row)) || null;
    },

    findIncompleteRowByName(passenger, usedRows = new Set()) {
      const configName = passengersLib().normalizeName(passenger.name);
      const rows = IRCTCExt.NgetPassengersFlow.getPassengerRows();
      return (
        rows.find((row) => {
          if (usedRows.has(row) || IRCTCExt.NgetPassengersFlow.isRowEmpty(row)) return false;
          const parsed = IRCTCExt.NgetPassengersFlow.parsePassengerRow(row);
          if (passengersLib().normalizeName(parsed.name) !== configName) return false;
          return !IRCTCExt.NgetPassengersFlow.passengerRowIsCorrect(row, passenger);
        }) || null
      );
    },

    findRowForPassenger(passenger, usedRows = new Set()) {
      const correct = IRCTCExt.NgetPassengersFlow.findMatchingRow(passenger, usedRows);
      if (correct) return correct;

      const empty = IRCTCExt.NgetPassengersFlow.findEmptyRow(usedRows);
      if (empty) return empty;

      return IRCTCExt.NgetPassengersFlow.findIncompleteRowByName(passenger, usedRows);
    },

    findMatchingRow(passenger, usedRows = new Set()) {
      const rows = IRCTCExt.NgetPassengersFlow.getPassengerRows();
      return (
        rows.find(
          (row) =>
            !usedRows.has(row) &&
            !IRCTCExt.NgetPassengersFlow.isRowEmpty(row) &&
            IRCTCExt.NgetPassengersFlow.passengerRowIsCorrect(row, passenger)
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
          continue;
        }

        const incomplete = IRCTCExt.NgetPassengersFlow.findIncompleteRowByName(passenger, usedRows);
        if (incomplete) {
          matched.push({ passenger, row: incomplete });
          usedRows.add(incomplete);
          continue;
        }

        unmatchedPassengers.push(passenger);
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

    async getOrCreateRowForPassenger(passenger, usedRows) {
      const existing = IRCTCExt.NgetPassengersFlow.findRowForPassenger(passenger, usedRows);
      if (existing) return existing;

      await IRCTCExt.NgetPassengersFlow.clickAddPassenger();
      const row =
        IRCTCExt.NgetPassengersFlow.findEmptyRow(usedRows) ||
        IRCTCExt.NgetPassengersFlow.findRowForPassenger(passenger, usedRows);
      if (!row) throw new Error(`Could not find row for passenger: ${passenger.name}`);
      return row;
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
        IRCTCExt.NgetPassengersFlow.rowHasRequiredDemographics(row) &&
        IRCTCExt.NgetPassengersFlow.rowBerthMatches(row, passenger)
      );
    },

    getFailingPassengers(passengers) {
      const usedRows = new Set();
      const failing = [];
      for (const passenger of passengers) {
        const row = IRCTCExt.NgetPassengersFlow.findRowForPassenger(passenger, usedRows);
        if (row) usedRows.add(row);
        if (!row || !IRCTCExt.NgetPassengersFlow.passengerRowIsCorrect(row, passenger)) {
          failing.push(passenger);
        }
      }
      return failing;
    },

    async fixPassengerRow(passenger, overlay, usedRows = new Set()) {
      overlay.setStatus(`Fixing passenger: ${passenger.name}...`);

      const matchingRow = IRCTCExt.NgetPassengersFlow.findMatchingRow(passenger, usedRows);
      if (matchingRow && IRCTCExt.NgetPassengersFlow.passengerRowIsCorrect(matchingRow, passenger)) {
        usedRows.add(matchingRow);
        return matchingRow;
      }

      const row = await IRCTCExt.NgetPassengersFlow.getOrCreateRowForPassenger(passenger, usedRows);
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

      await IRCTCExt.NgetPassengersFlow.dedupeConfigPassengerRows(passengers, overlay);

      for (let pass = 1; pass <= maxPasses; pass += 1) {
        overlay.setStatus(`Verifying passenger list (${pass}/${maxPasses})...`);
        await IRCTCExt.Wait.delay(400);

        await IRCTCExt.NgetPassengersFlow.dedupeConfigPassengerRows(passengers, overlay);

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
          if (!IRCTCExt.NgetPassengersFlow.passengerRowIsCorrect(row, passenger)) {
            overlay.setStatus(`Completing passenger: ${passenger.name}...`);
            await IRCTCExt.NgetPassengersFlow.fillPassengerRow(row, passenger, overlay);
            changed = true;
            continue;
          }
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
          const row = await IRCTCExt.NgetPassengersFlow.getOrCreateRowForPassenger(passenger, usedRows);
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
      await IRCTCExt.NgetPassengersFlow.dedupeConfigPassengerRows(passengers, overlay);

      const usedRows = new Set();
      for (let i = 0; i < passengers.length; i += 1) {
        const passenger = passengers[i];
        overlay.setStatus(`Adding passenger ${i + 1}/${passengers.length}: ${passenger.name}...`);

        let row = IRCTCExt.NgetPassengersFlow.findRowForPassenger(passenger, usedRows);
        if (!row) {
          row = await IRCTCExt.NgetPassengersFlow.getOrCreateRowForPassenger(passenger, usedRows);
        }

        if (!IRCTCExt.NgetPassengersFlow.passengerRowIsCorrect(row, passenger)) {
          await IRCTCExt.NgetPassengersFlow.fillPassengerRow(row, passenger, overlay);
        } else if (!IRCTCExt.NgetPassengersFlow.rowBerthMatches(row, passenger)) {
          await IRCTCExt.NgetPassengersFlow.selectBerthOnRow(row, passenger);
        }

        usedRows.add(row);
      }

      await IRCTCExt.NgetPassengersFlow.verifyAndReconcilePassengerList(config, overlay);
      overlay.setStatus(`Verified ${passengers.length} passenger(s)`);
      return true;
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
