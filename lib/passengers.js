window.IRCTCExt = window.IRCTCExt || {};

IRCTCExt.Passengers = {
  normalizeName(name) {
    return (name || '').replace(/\s+/g, ' ').trim().toLowerCase();
  },

  extractRowName(row) {
    const nameEl = row.querySelector('.ep-passenger-name');
    if (!nameEl) return '';
    return (nameEl.textContent || '').replace(/\s+/g, ' ').trim();
  },

  parseRowDetails(row) {
    const detailsEl = row.querySelector('.ep-passenger-details');
    if (!detailsEl) return { age: '', gender: '', country: '', berth: '', food: '' };

    const text = (detailsEl.textContent || '')
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const parts = text.split('|').map((p) => p.trim());
    const agePart = (parts[0] || '').replace(/^age\s*/i, '').trim();

    return {
      age: agePart,
      gender: parts[1] || '',
      country: parts[2] || '',
      berth: parts[3] || '',
      food: parts[4] || ''
    };
  },

  foodToken(food) {
    const map = {
      Veg: 'VEG',
      'Non-Veg': 'NON_VEG',
      'No Food': 'NO_FOOD'
    };
    return (map[food] || food || '').toLowerCase();
  },

  foodLabel(food) {
    const map = {
      Veg: 'Veg',
      'Non-Veg': 'Non-Veg',
      'No Food': 'No Food'
    };
    return map[food] || food || '';
  },

  genderToken(gender) {
    const map = {
      M: 'male',
      F: 'female',
      T: 'transgender'
    };
    return (map[gender] || gender || '').toLowerCase();
  },

  genderLabel(gender) {
    const map = {
      M: 'Male',
      F: 'Female',
      T: 'Transgender'
    };
    return map[gender] || gender || 'Male';
  },

  berthToken(berth) {
    const map = {
      'No Preference': 'no preference',
      Upper: 'upper',
      Lower: 'lower',
      Middle: 'middle',
      'Window Side': 'window side',
      'Side Lower': 'window side',
      'Side Upper': 'side upper'
    };
    return (map[berth] || berth || '').toLowerCase();
  },

  segmentMatches(actual, expected) {
    const a = (actual || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const e = (expected || '').replace(/\s+/g, ' ').trim().toLowerCase();
    if (!e) return false;
    return a === e || a.includes(e) || e.includes(a);
  },

  nameMatchesRow(row, passenger) {
    const rowName = IRCTCExt.Passengers.normalizeName(IRCTCExt.Passengers.extractRowName(row));
    const configName = IRCTCExt.Passengers.normalizeName(passenger.name);
    return rowName === configName;
  },

  scoreRowMatch(row, passenger) {
    const details = IRCTCExt.Passengers.parseRowDetails(row);
    let score = 0;

    if (passenger.age && String(details.age).trim() === String(passenger.age).trim()) {
      score += 3;
    }
    if (passenger.gender && IRCTCExt.Passengers.segmentMatches(details.gender, IRCTCExt.Passengers.genderToken(passenger.gender))) {
      score += 2;
    }
    if (passenger.berth && IRCTCExt.Passengers.segmentMatches(details.berth, IRCTCExt.Passengers.berthToken(passenger.berth))) {
      score += 2;
    }
    if (passenger.food && IRCTCExt.Passengers.segmentMatches(details.food, IRCTCExt.Passengers.foodToken(passenger.food))) {
      score += 1;
    }

    return score;
  },

  findPassengerRow(rows, passenger, usedRows) {
    const candidates = rows.filter(
      (row) => !usedRows.has(row) && IRCTCExt.Passengers.nameMatchesRow(row, passenger)
    );

    if (!candidates.length) return null;

    if (candidates.length === 1) return candidates[0];

    let best = candidates[0];
    let bestScore = IRCTCExt.Passengers.scoreRowMatch(best, passenger);

    for (let i = 1; i < candidates.length; i += 1) {
      const row = candidates[i];
      const score = IRCTCExt.Passengers.scoreRowMatch(row, passenger);
      if (score > bestScore) {
        bestScore = score;
        best = row;
      }
    }

    return best;
  },

  partitionPassengers(rows, passengers) {
    const matched = [];
    const unmatched = [];
    const usedRows = new Set();

    for (const passenger of passengers) {
      const row = IRCTCExt.Passengers.findPassengerRow(rows, passenger, usedRows);
      if (row) {
        matched.push({ passenger, row });
        usedRows.add(row);
      } else {
        unmatched.push(passenger);
      }
    }

    return { matched, unmatched };
  },

  toggleRowCheckbox(row) {
    const box = row.querySelector('.ui-chkbox-box');
    if (!box) {
      IRCTCExt.Events.click(row);
      return;
    }
    if (box.classList.contains('ui-state-active')) return;
    IRCTCExt.Events.click(box);
  },

  countPassengerListCards() {
    return IRCTCExt.Passengers.getPassengerListCards().length;
  },

  getPassengerListCards() {
    const sel = IRCTCExt.SELECTORS.passengers;
    const cards = IRCTCExt.Wait.queryAll(sel.passengerListCard);
    return cards.filter((card) => IRCTCExt.Wait.isVisible(card));
  },

  parsePassengerListCard(card) {
    const sel = IRCTCExt.SELECTORS.passengers;
    const nameEl = IRCTCExt.Wait.queryOne(sel.passengerCardName, card);
    const rawName = (nameEl?.textContent || '').replace(/\s+/g, ' ').trim();
    const name = rawName.replace(/^\d+\.\s*/, '').trim();

    const details = { name, age: '', gender: '', country: '', berth: '', dob: '' };
    const detailRow = IRCTCExt.Wait.queryOne(sel.passengerCardDetails, card) || card;
    const items = detailRow.querySelectorAll('.detail-item');

    for (const item of items) {
      const text = (item.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text) continue;

      const labelEl = item.querySelector('.detail-label');
      if (labelEl) {
        const label = (labelEl.textContent || '').replace(/:\s*$/, '').trim().toLowerCase();
        const valueEl = item.querySelector('.detail-value');
        const value = (valueEl?.textContent || text.replace(labelEl.textContent, ''))
          .replace(/\s+/g, ' ')
          .trim();
        if (label === 'age') details.age = value;
        else if (label === 'dob') details.dob = value;
        continue;
      }

      if (/^(male|female|transgender)$/i.test(text)) {
        details.gender = text;
      } else if (/^india$/i.test(text)) {
        details.country = text;
      } else if (
        /^(upper|lower|middle|window side|side lower|side upper|no preference)$/i.test(text)
      ) {
        details.berth = text;
      }
    }

    return details;
  },

  nameMatchesListCard(card, passenger) {
    const parsed = IRCTCExt.Passengers.parsePassengerListCard(card);
    return (
      IRCTCExt.Passengers.normalizeName(parsed.name) ===
      IRCTCExt.Passengers.normalizeName(passenger.name)
    );
  },

  scoreListCardMatch(card, passenger) {
    if (!IRCTCExt.Passengers.nameMatchesListCard(card, passenger)) return -1;

    const details = IRCTCExt.Passengers.parsePassengerListCard(card);
    let score = 10;

    if (passenger.age && String(details.age).trim() === String(passenger.age).trim()) {
      score += 3;
    }
    if (
      passenger.gender &&
      details.gender &&
      IRCTCExt.Passengers.segmentMatches(
        details.gender,
        IRCTCExt.Passengers.genderToken(passenger.gender)
      )
    ) {
      score += 2;
    }

    const berth = (passenger.berth || '').trim();
    if (berth && berth !== 'No Preference') {
      if (
        details.berth &&
        IRCTCExt.Passengers.segmentMatches(details.berth, IRCTCExt.Passengers.berthToken(berth))
      ) {
        score += 2;
      }
    } else {
      score += 1;
    }

    return score;
  },

  findListCardForPassenger(cards, passenger, usedCards) {
    const candidates = cards.filter(
      (card) => !usedCards.has(card) && IRCTCExt.Passengers.nameMatchesListCard(card, passenger)
    );
    if (!candidates.length) return null;
    if (candidates.length === 1) return candidates[0];

    let best = candidates[0];
    let bestScore = IRCTCExt.Passengers.scoreListCardMatch(best, passenger);

    for (let i = 1; i < candidates.length; i += 1) {
      const card = candidates[i];
      const score = IRCTCExt.Passengers.scoreListCardMatch(card, passenger);
      if (score > bestScore) {
        bestScore = score;
        best = card;
      }
    }

    return best;
  },

  partitionListCards(cards, passengers) {
    const matched = [];
    const unmatchedPassengers = [];
    const usedCards = new Set();

    for (const passenger of passengers) {
      const card = IRCTCExt.Passengers.findListCardForPassenger(cards, passenger, usedCards);
      if (card) {
        matched.push({ passenger, card });
        usedCards.add(card);
      } else {
        unmatchedPassengers.push(passenger);
      }
    }

    const extraCards = cards.filter((card) => !usedCards.has(card));
    return { matched, unmatchedPassengers, extraCards };
  },

  getMismatchType(card, passenger) {
    const details = IRCTCExt.Passengers.parsePassengerListCard(card);

    if (!IRCTCExt.Passengers.nameMatchesListCard(card, passenger)) return 'name';
    if (passenger.age && String(details.age).trim() !== String(passenger.age).trim()) {
      return 'age';
    }

    if (
      passenger.gender &&
      (!details.gender ||
        !IRCTCExt.Passengers.segmentMatches(
          details.gender,
          IRCTCExt.Passengers.genderToken(passenger.gender)
        ))
    ) {
      return 'gender';
    }

    const berth = (passenger.berth || '').trim();
    if (berth && berth !== 'No Preference') {
      if (
        !details.berth ||
        !IRCTCExt.Passengers.segmentMatches(details.berth, IRCTCExt.Passengers.berthToken(berth))
      ) {
        return 'berth';
      }
    }

    return null;
  },

  cardMatchesPassenger(card, passenger) {
    return IRCTCExt.Passengers.getMismatchType(card, passenger) === null;
  },

  isEditPassengerModalOpen() {
    const sel = IRCTCExt.SELECTORS.passengers;
    const modal = IRCTCExt.Wait.queryOne(sel.editPassengerModal);
    if (!modal || !IRCTCExt.Wait.isVisible(modal)) return false;
    const title = IRCTCExt.Wait.queryOne(sel.newPassengerTitle, modal);
    return !!(title && /passenger/i.test(title.textContent || ''));
  },

  async confirmPassengerDeleteIfNeeded() {
    const sel = IRCTCExt.SELECTORS.passengers;
    const dialogs = [...document.querySelectorAll('.ui-dialog, [role="dialog"]')].filter((dialog) =>
      IRCTCExt.Wait.isVisible(dialog)
    );

    for (const dialog of dialogs) {
      const buttons = [...dialog.querySelectorAll('button')].filter((btn) =>
        IRCTCExt.Wait.isVisible(btn)
      );
      const confirmBtn =
        buttons.find((btn) => /delete|confirm|yes|ok/i.test(btn.textContent || '')) ||
        IRCTCExt.Wait.queryOne(sel.passengerDeleteConfirmBtn, dialog);
      if (confirmBtn) {
        IRCTCExt.Events.click(confirmBtn);
        await IRCTCExt.Wait.delay(300);
        return true;
      }
    }

    return false;
  },

  async deletePassengerCard(card, overlay) {
    const sel = IRCTCExt.SELECTORS.passengers;
    const name = IRCTCExt.Passengers.parsePassengerListCard(card).name;
    overlay.setStatus(`Deleting passenger: ${name}...`);

    const deleteBtn = IRCTCExt.Wait.queryOne(sel.passengerDeleteBtn, card);
    if (!deleteBtn || !IRCTCExt.Wait.isVisible(deleteBtn)) {
      throw new Error(`Delete button not found for ${name}`);
    }

    IRCTCExt.Events.click(deleteBtn);
    await IRCTCExt.Wait.delay(400);
    await IRCTCExt.Passengers.confirmPassengerDeleteIfNeeded();

    const removed = await IRCTCExt.Wait.poll(
      () => (!document.contains(card) ? true : null),
      { timeout: 10000, interval: 200 }
    );
    if (!removed) throw new Error(`Passenger card was not removed: ${name}`);
    return true;
  },

  async editPassengerCard(card, passenger, overlay) {
    const sel = IRCTCExt.SELECTORS.passengers;
    overlay.setStatus(`Editing passenger: ${passenger.name}...`);

    const editBtn = IRCTCExt.Wait.queryOne(sel.passengerEditBtn, card);
    if (!editBtn || !IRCTCExt.Wait.isVisible(editBtn)) {
      throw new Error(`Edit button not found for ${passenger.name}`);
    }

    IRCTCExt.Events.click(editBtn);
    await IRCTCExt.Wait.delay(500);

    const modal = await IRCTCExt.Wait.poll(
      () =>
        IRCTCExt.Passengers.isEditPassengerModalOpen()
          ? IRCTCExt.Wait.queryOne(sel.editPassengerModal)
          : null,
      { timeout: 10000, interval: 200 }
    );
    if (!modal) throw new Error(`Edit modal did not open for ${passenger.name}`);

    if (passenger.gender) {
      const genderLabel = IRCTCExt.Passengers.genderLabel(passenger.gender);
      const genderOk = await IRCTCExt.Passengers.selectDropdownIn(
        modal,
        sel.newPassengerGender,
        genderLabel
      );
      if (!genderOk) throw new Error(`Could not set gender for ${passenger.name}`);
    }

    const berth = (passenger.berth || '').trim();
    if (berth && berth !== 'No Preference') {
      const berthDropdown = IRCTCExt.Wait.queryOne(sel.newPassengerBerth, modal);
      if (berthDropdown && IRCTCExt.Wait.isVisible(berthDropdown)) {
        const berthOk = await IRCTCExt.Passengers.selectDropdownIn(modal, sel.newPassengerBerth, berth);
        if (!berthOk) throw new Error(`Could not set berth for ${passenger.name}`);
      }
    }

    const foodLabel = IRCTCExt.Passengers.foodLabel(passenger.food);
    if (foodLabel) {
      const foodDropdown = IRCTCExt.Wait.queryOne(sel.newPassengerFood, modal);
      if (foodDropdown && IRCTCExt.Wait.isVisible(foodDropdown)) {
        await IRCTCExt.Passengers.selectDropdownIn(modal, sel.newPassengerFood, foodLabel);
      }
    }

    const saveBtn =
      IRCTCExt.Wait.queryOne(sel.editPassengerSaveBtn, modal) ||
      IRCTCExt.Wait.queryOne(sel.newPassengerAddBtn, modal);
    if (!saveBtn) throw new Error('Save button not found in edit passenger modal');

    IRCTCExt.Events.click(saveBtn);

    await IRCTCExt.Wait.poll(
      () => (IRCTCExt.Passengers.isEditPassengerModalOpen() ? null : true),
      { timeout: 12000, interval: 200 }
    );

    await IRCTCExt.Wait.delay(300);
    return true;
  },

  async verifyAndReconcilePassengerList(config, overlay) {
    const passengers = (config.passengers || []).filter((p) => p.name && String(p.name).trim());
    const maxPasses = 3;

    for (let pass = 1; pass <= maxPasses; pass += 1) {
      overlay.setStatus(`Verifying passenger list (${pass}/${maxPasses})...`);
      await IRCTCExt.Wait.delay(400);

      let changed = false;
      let cards = IRCTCExt.Passengers.getPassengerListCards();
      let { matched, unmatchedPassengers, extraCards } = IRCTCExt.Passengers.partitionListCards(
        cards,
        passengers
      );

      for (const card of extraCards) {
        await IRCTCExt.Passengers.deletePassengerCard(card, overlay);
        changed = true;
      }

      if (changed) {
        cards = IRCTCExt.Passengers.getPassengerListCards();
        ({ matched, unmatchedPassengers, extraCards } = IRCTCExt.Passengers.partitionListCards(
          cards,
          passengers
        ));
      }

      for (const { passenger, card } of matched) {
        const mismatch = IRCTCExt.Passengers.getMismatchType(card, passenger);
        if (!mismatch) continue;

        if (mismatch === 'name' || mismatch === 'age') {
          await IRCTCExt.Passengers.deletePassengerCard(card, overlay);
          const expectedCount = IRCTCExt.Passengers.countPassengerListCards() + 1;
          await IRCTCExt.Passengers.addNewPassenger(passenger, overlay, expectedCount);
        } else {
          await IRCTCExt.Passengers.editPassengerCard(card, passenger, overlay);
        }
        changed = true;
      }

      for (const passenger of unmatchedPassengers) {
        const expectedCount = IRCTCExt.Passengers.countPassengerListCards() + 1;
        await IRCTCExt.Passengers.addNewPassenger(passenger, overlay, expectedCount);
        changed = true;
      }

      if (!changed) {
        const finalCards = IRCTCExt.Passengers.getPassengerListCards();
        if (finalCards.length !== passengers.length) {
          throw new Error(
            `Expected ${passengers.length} passenger(s), found ${finalCards.length}`
          );
        }

        const usedCards = new Set();
        const allMatch = passengers.every((passenger) => {
          const card = IRCTCExt.Passengers.findListCardForPassenger(
            finalCards,
            passenger,
            usedCards
          );
          if (!card || !IRCTCExt.Passengers.cardMatchesPassenger(card, passenger)) {
            return false;
          }
          usedCards.add(card);
          return true;
        });

        if (!allMatch) {
          const failing = passengers.find((passenger) => {
            const card = IRCTCExt.Passengers.findListCardForPassenger(
              finalCards,
              passenger,
              new Set()
            );
            return !card || !IRCTCExt.Passengers.cardMatchesPassenger(card, passenger);
          });
          if (pass === maxPasses) {
            throw new Error(`Could not verify passenger: ${failing?.name || 'unknown'}`);
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

  isExistingModalOpen() {
    const sel = IRCTCExt.SELECTORS.passengers;
    const mask = IRCTCExt.Wait.queryOne(sel.existingModal);
    if (!mask || !IRCTCExt.Wait.isVisible(mask)) return false;
    const title = IRCTCExt.Wait.queryOne(sel.existingModalTitle, mask);
    return !!(title && /add existing passenger/i.test(title.textContent || ''));
  },

  isNewPassengerModalOpen() {
    const sel = IRCTCExt.SELECTORS.passengers;
    const modal = IRCTCExt.Wait.queryOne(sel.newPassengerModal);
    if (!modal || !IRCTCExt.Wait.isVisible(modal)) return false;
    const title = IRCTCExt.Wait.queryOne(sel.newPassengerTitle, modal);
    return !!(title && /add passenger/i.test(title.textContent || ''));
  },

  async closeModalCancel(cancelSelectors, isOpenFn) {
    if (!isOpenFn()) return;

    const cancelBtn = IRCTCExt.Wait.queryOne(cancelSelectors);
    if (!cancelBtn) throw new Error('Cancel button not found');
    IRCTCExt.Events.click(cancelBtn);

    const closed = await IRCTCExt.Wait.poll(
      () => (isOpenFn() ? null : true),
      { timeout: 8000, interval: 200 }
    );
    if (!closed) throw new Error('Modal did not close after Cancel');
  },

  async waitForPassengerCount(minCount) {
    const count = await IRCTCExt.Wait.poll(
      () => {
        const current = IRCTCExt.Passengers.countPassengerListCards();
        return current >= minCount ? current : null;
      },
      { timeout: 15000, interval: 300 }
    );
    if (!count) {
      throw new Error(`Passengers were not added (expected at least ${minCount})`);
    }
    return count;
  },

  async openExistingPassengerModal(overlay) {
    const sel = IRCTCExt.SELECTORS.passengers;

    if (IRCTCExt.Passengers.isExistingModalOpen()) {
      return IRCTCExt.Wait.queryOne(sel.existingModal);
    }

    overlay.setStatus('Opening existing passenger list...');
    const existingBtn = await IRCTCExt.Wait.waitFor(sel.existingPassengerBtn, {
      timeout: 20000,
      visible: true
    });
    if (!existingBtn) throw new Error('Existing Passenger button not found');

    IRCTCExt.Events.click(existingBtn);

    const modalReady = await IRCTCExt.Wait.poll(
      () => (IRCTCExt.Passengers.isExistingModalOpen() ? IRCTCExt.Wait.queryOne(sel.existingModal) : null),
      { timeout: 12000, interval: 200 }
    );
    if (!modalReady) throw new Error('Add existing passenger modal did not open');
    return modalReady;
  },

  async addMatchedFromExisting(modal, matched, overlay, expectedMinCount) {
    const sel = IRCTCExt.SELECTORS.passengers;

    overlay.setStatus(`Adding ${matched.length} passenger(s) from existing list...`);
    for (const { passenger, row } of matched) {
      overlay.setStatus(`Selecting ${passenger.name} from existing list...`);
      IRCTCExt.Passengers.toggleRowCheckbox(row);
      await IRCTCExt.Wait.delay(200);
    }

    const addBtn = IRCTCExt.Wait.queryOne(sel.existingPassengerAddBtn, modal);
    if (!addBtn) throw new Error('Add button not found in existing passenger modal');

    IRCTCExt.Events.click(addBtn);
    return IRCTCExt.Passengers.waitForPassengerCount(expectedMinCount);
  },

  async openNewPassengerModal(overlay) {
    const sel = IRCTCExt.SELECTORS.passengers;

    if (IRCTCExt.Passengers.isNewPassengerModalOpen()) {
      return IRCTCExt.Wait.queryOne(sel.newPassengerModal);
    }

    const newBtn = await IRCTCExt.Wait.waitFor(sel.newPassengerBtn, { timeout: 15000, visible: true });
    if (!newBtn) throw new Error('New Passenger button not found');

    IRCTCExt.Events.click(newBtn);

    const modalReady = await IRCTCExt.Wait.poll(
      () => (IRCTCExt.Passengers.isNewPassengerModalOpen() ? IRCTCExt.Wait.queryOne(sel.newPassengerModal) : null),
      { timeout: 12000, interval: 200 }
    );
    if (!modalReady) throw new Error('Add Passenger modal did not open');
    return modalReady;
  },

  normalizeDropdownText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
  },

  getDropdownShownValue(dropdownEl) {
    const label = dropdownEl?.querySelector('.ui-dropdown-label');
    const text = (label?.textContent || '').replace(/\s+/g, ' ').trim();
    if (!text || /^(select|choose)$/i.test(text)) return '';
    return text;
  },

  dropdownValueMatches(shown, expected) {
    const a = IRCTCExt.Passengers.normalizeDropdownText(shown);
    const b = IRCTCExt.Passengers.normalizeDropdownText(expected);
    if (!a || !b) return false;
    return a === b || a.includes(b) || b.includes(a);
  },

  visiblePassengerDropdownOptions() {
    const panels = [
      ...IRCTCExt.Wait.queryAll('.ap-dropdown-panel'),
      ...IRCTCExt.Wait.queryAll('.ui-dropdown-panel')
    ].filter((panel) => IRCTCExt.Wait.isVisible(panel));

    const items = panels.flatMap((panel) =>
      Array.from(
        panel.querySelectorAll('li.ui-dropdown-item, .ui-dropdown-item, li[role="option"]')
      ).filter((item) => IRCTCExt.Wait.isVisible(item))
    );

    if (items.length) return items;
    return IRCTCExt.Wait.queryAll(IRCTCExt.SELECTORS.passengers.passengerDropdownItem).filter((item) =>
      IRCTCExt.Wait.isVisible(item)
    );
  },

  findDropdownOption(options, labelText) {
    const target = IRCTCExt.Passengers.normalizeDropdownText(labelText);
    return (
      options.find(
        (opt) => IRCTCExt.Passengers.normalizeDropdownText(opt.textContent) === target
      ) ||
      options.find((opt) => {
        const text = IRCTCExt.Passengers.normalizeDropdownText(opt.textContent);
        return text === target || text.startsWith(`${target} `) || text.endsWith(` ${target}`);
      }) ||
      options.find((opt) => IRCTCExt.Events.optionMatches(opt, labelText))
    );
  },

  async selectDropdownIn(root, triggerSelectors, labelText) {
    const trigger = IRCTCExt.Wait.queryOne(triggerSelectors, root);
    if (!trigger || !IRCTCExt.Wait.isVisible(trigger)) return false;

    const dropdown = trigger.closest('p-dropdown') || trigger;
    const shown = IRCTCExt.Passengers.getDropdownShownValue(dropdown);
    if (IRCTCExt.Passengers.dropdownValueMatches(shown, labelText)) return true;

    const clickTarget = dropdown.querySelector('.ui-dropdown-trigger') || trigger;
    IRCTCExt.Events.click(clickTarget);
    await IRCTCExt.Wait.delay(400);

    const options = await IRCTCExt.Wait.poll(
      () => {
        const list = IRCTCExt.Passengers.visiblePassengerDropdownOptions();
        return list.length ? list : null;
      },
      { timeout: 8000, interval: 150 }
    );
    if (!options?.length) return false;

    const match = IRCTCExt.Passengers.findDropdownOption(options, labelText);
    if (!match) return false;

    IRCTCExt.Events.click(match.querySelector('span') || match);
    await IRCTCExt.Wait.delay(300);

    let updated = IRCTCExt.Passengers.getDropdownShownValue(dropdown);
    if (IRCTCExt.Passengers.dropdownValueMatches(updated, labelText)) return true;

    IRCTCExt.Events.click(clickTarget);
    await IRCTCExt.Wait.delay(300);
    const retryOptions = IRCTCExt.Passengers.visiblePassengerDropdownOptions();
    const retryMatch = IRCTCExt.Passengers.findDropdownOption(retryOptions, labelText);
    if (!retryMatch) return false;
    IRCTCExt.Events.click(retryMatch.querySelector('span') || retryMatch);
    await IRCTCExt.Wait.delay(300);

    updated = IRCTCExt.Passengers.getDropdownShownValue(dropdown);
    return IRCTCExt.Passengers.dropdownValueMatches(updated, labelText);
  },

  async fillNewPassengerForm(passenger, modalRoot) {
    const sel = IRCTCExt.SELECTORS.passengers;

    const nameInput = IRCTCExt.Wait.queryOne(sel.newPassengerName, modalRoot);
    if (!nameInput) throw new Error('Passenger name field not found');
    await IRCTCExt.Events.typeSlowly(nameInput, passenger.name.trim(), 40);
    await IRCTCExt.Wait.delay(300);

    const ageInput = IRCTCExt.Wait.queryOne(sel.newPassengerAge, modalRoot);
    if (!ageInput) throw new Error('Passenger age field not found');
    IRCTCExt.Events.setInputValue(ageInput, String(passenger.age || '').trim());

    const genderLabel = IRCTCExt.Passengers.genderLabel(passenger.gender);
    const genderOk = await IRCTCExt.Passengers.selectDropdownIn(
      modalRoot,
      sel.newPassengerGender,
      genderLabel
    );
    if (!genderOk) throw new Error(`Could not select gender: ${genderLabel}`);

    const nationalityDropdown = IRCTCExt.Wait.queryOne(sel.newPassengerNationality, modalRoot);
    if (nationalityDropdown && IRCTCExt.Wait.isVisible(nationalityDropdown)) {
      const dropdown = nationalityDropdown.closest('p-dropdown') || nationalityDropdown;
      const current = IRCTCExt.Passengers.getDropdownShownValue(dropdown);
      if (!IRCTCExt.Passengers.dropdownValueMatches(current, 'India')) {
        await IRCTCExt.Passengers.selectDropdownIn(modalRoot, sel.newPassengerNationality, 'India');
      }
    }

    const berth = (passenger.berth || '').trim();
    if (berth && berth !== 'No Preference') {
      const berthDropdown = IRCTCExt.Wait.queryOne(sel.newPassengerBerth, modalRoot);
      if (berthDropdown && IRCTCExt.Wait.isVisible(berthDropdown)) {
        await IRCTCExt.Passengers.selectDropdownIn(modalRoot, sel.newPassengerBerth, berth);
      }
    }

    const foodLabel = IRCTCExt.Passengers.foodLabel(passenger.food);
    if (foodLabel) {
      const foodDropdown = IRCTCExt.Wait.queryOne(sel.newPassengerFood, modalRoot);
      if (foodDropdown && IRCTCExt.Wait.isVisible(foodDropdown)) {
        await IRCTCExt.Passengers.selectDropdownIn(modalRoot, sel.newPassengerFood, foodLabel);
      }
    }

    return true;
  },

  async submitNewPassenger(modalRoot, expectedMinCount) {
    const sel = IRCTCExt.SELECTORS.passengers;
    const addBtn = IRCTCExt.Wait.queryOne(sel.newPassengerAddBtn, modalRoot);
    if (!addBtn) throw new Error('Add button not found in new passenger modal');

    IRCTCExt.Events.click(addBtn);

    await IRCTCExt.Wait.poll(
      () => (IRCTCExt.Passengers.isNewPassengerModalOpen() ? null : true),
      { timeout: 12000, interval: 200 }
    );

    return IRCTCExt.Passengers.waitForPassengerCount(expectedMinCount);
  },

  async addNewPassenger(passenger, overlay, expectedMinCount) {
    overlay.setStatus(`Adding new passenger: ${passenger.name}...`);
    const modal = await IRCTCExt.Passengers.openNewPassengerModal(overlay);
    await IRCTCExt.Passengers.fillNewPassengerForm(passenger, modal);
    return IRCTCExt.Passengers.submitNewPassenger(modal, expectedMinCount);
  },

  async addPassengers(config, overlay) {
    const sel = IRCTCExt.SELECTORS.passengers;
    overlay.setStep('Passengers');
    await IRCTCExt.Storage.updateState({ currentStep: 'passengers' });

    const passengers = (config.passengers || []).filter((p) => p.name && String(p.name).trim());
    if (!passengers.length) throw new Error('No passengers configured with names');

    const startCount = IRCTCExt.Passengers.countPassengerListCards();
    let expectedCount = startCount;

    overlay.setStatus(`Matching ${passengers.length} passenger(s) in existing list...`);
    const existingModal = await IRCTCExt.Passengers.openExistingPassengerModal(overlay);
    const rows = IRCTCExt.Wait.queryAll(sel.existingPassengerRow, existingModal);
    const { matched, unmatched } = IRCTCExt.Passengers.partitionPassengers(rows, passengers);

    if (matched.length) {
      expectedCount += matched.length;
      await IRCTCExt.Passengers.addMatchedFromExisting(existingModal, matched, overlay, expectedCount);
    }

    if (IRCTCExt.Passengers.isExistingModalOpen()) {
      await IRCTCExt.Passengers.closeModalCancel(
        sel.existingPassengerCancelBtn,
        IRCTCExt.Passengers.isExistingModalOpen
      );
    }

    for (const passenger of unmatched) {
      expectedCount += 1;
      await IRCTCExt.Passengers.addNewPassenger(passenger, overlay, expectedCount);
    }

    const finalCount = IRCTCExt.Passengers.countPassengerListCards();
    if (finalCount < startCount + passengers.length) {
      throw new Error(`Expected ${passengers.length} passenger(s), found ${finalCount - startCount}`);
    }

    await IRCTCExt.Passengers.verifyAndReconcilePassengerList(config, overlay);
    overlay.setStatus(`Verified ${passengers.length} passenger(s)`);
    return true;
  },

  async selectExistingPassengers(config, overlay) {
    return IRCTCExt.Passengers.addPassengers(config, overlay);
  }
};
