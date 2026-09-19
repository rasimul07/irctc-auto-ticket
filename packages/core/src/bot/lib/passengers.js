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
      'Side Lower': 'side lower',
      'Side Upper': 'side upper'
    };
    return (map[berth] || berth || '').toLowerCase();
  },

  berthLabel(berth) {
    const value = String(berth || '').trim();
    if (!value || value === 'No Preference') return '';
    return value;
  },

  berthLabelsToTry(berth) {
    const label = IRCTCExt.Passengers.berthLabel(berth);
    if (!label) return [];
    if (label === 'Window Side') return ['Window Side', 'Side Lower'];
    return [label];
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

  rowMatchesPassengerStrict(row, passenger) {
    if (!IRCTCExt.Passengers.nameMatchesRow(row, passenger)) return false;

    const details = IRCTCExt.Passengers.parseRowDetails(row);
    if (passenger.age && String(details.age).trim() !== String(passenger.age).trim()) {
      return false;
    }
    if (
      passenger.gender &&
      (!details.gender ||
        !IRCTCExt.Passengers.segmentMatches(
          details.gender,
          IRCTCExt.Passengers.genderToken(passenger.gender)
        ))
    ) {
      return false;
    }

    return true;
  },

  findExistingRowStrict(rows, passenger, usedRows = new Set()) {
    const candidates = rows.filter(
      (row) => !usedRows.has(row) && IRCTCExt.Passengers.rowMatchesPassengerStrict(row, passenger)
    );
    return candidates[0] || null;
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

  listCardMatchesPassengerStrict(card, passenger) {
    const details = IRCTCExt.Passengers.parsePassengerListCard(card);
    if (
      IRCTCExt.Passengers.normalizeName(details.name) !==
      IRCTCExt.Passengers.normalizeName(passenger.name)
    ) {
      return false;
    }
    if (passenger.age && String(details.age).trim() !== String(passenger.age).trim()) {
      return false;
    }
    if (
      passenger.gender &&
      (!details.gender ||
        !IRCTCExt.Passengers.segmentMatches(
          details.gender,
          IRCTCExt.Passengers.genderToken(passenger.gender)
        ))
    ) {
      return false;
    }
    return true;
  },

  findListCardStrict(cards, passenger, usedCards = new Set()) {
    return (
      cards.find(
        (card) => !usedCards.has(card) && IRCTCExt.Passengers.listCardMatchesPassengerStrict(card, passenger)
      ) || null
    );
  },

  passengerAlreadyOnList(passenger, usedCards = new Set()) {
    const cards = IRCTCExt.Passengers.getPassengerListCards();
    return !!IRCTCExt.Passengers.findListCardStrict(cards, passenger, usedCards);
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
      const card = IRCTCExt.Passengers.findListCardStrict(cards, passenger, usedCards);
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

  isIdentityMismatch(mismatchType) {
    return mismatchType === 'name' || mismatchType === 'age' || mismatchType === 'gender';
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

    const berthOk = await IRCTCExt.Passengers.selectBerthPreference(modal, passenger);
    if (!berthOk) {
      throw new Error(
        `Could not set berth for ${passenger.name}: ${IRCTCExt.Passengers.berthLabel(passenger.berth)}`
      );
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
        const parsed = IRCTCExt.Passengers.parsePassengerListCard(card);
        overlay.setStatus(`Removing extra passenger: ${parsed.name || 'unknown'}...`);
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

      for (let i = 0; i < matched.length; i += 1) {
        const { passenger, card } = matched[i];
        overlay.setStatus(
          `Verifying passenger ${i + 1}/${passengers.length}: ${passenger.name}...`
        );
        const mismatch = IRCTCExt.Passengers.getMismatchType(card, passenger);
        if (!mismatch) continue;

        if (IRCTCExt.Passengers.isIdentityMismatch(mismatch)) {
          await IRCTCExt.Passengers.deletePassengerCard(card, overlay);
          const expectedCount = IRCTCExt.Passengers.countPassengerListCards() + 1;
          overlay.setStatus(`Re-adding missing: ${passenger.name}...`);
          await IRCTCExt.Passengers.addOnePassenger(passenger, overlay, expectedCount);
        } else {
          await IRCTCExt.Passengers.editPassengerCard(card, passenger, overlay);
        }
        changed = true;
      }

      for (const passenger of unmatchedPassengers) {
        const expectedCount = IRCTCExt.Passengers.countPassengerListCards() + 1;
        overlay.setStatus(`Re-adding missing: ${passenger.name}...`);
        await IRCTCExt.Passengers.addOnePassenger(passenger, overlay, expectedCount);
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
          const card = IRCTCExt.Passengers.findListCardStrict(finalCards, passenger, usedCards);
          if (!card || !IRCTCExt.Passengers.listCardMatchesPassengerStrict(card, passenger)) {
            return false;
          }
          if (!IRCTCExt.Passengers.cardMatchesPassenger(card, passenger)) {
            return false;
          }
          usedCards.add(card);
          return true;
        });

        if (!allMatch) {
          const failing = passengers.find((passenger) => {
            const card = IRCTCExt.Passengers.findListCardStrict(finalCards, passenger, new Set());
            return (
              !card ||
              !IRCTCExt.Passengers.listCardMatchesPassengerStrict(card, passenger) ||
              !IRCTCExt.Passengers.cardMatchesPassenger(card, passenger)
            );
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
    const hidden = dropdownEl?.querySelector('.ui-helper-hidden-accessible input[role="listbox"]');
    const ariaValue = (hidden?.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
    if (ariaValue && !/^(select|choose)$/i.test(ariaValue)) return ariaValue;

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

  isDropdownOpen(dropdown) {
    return !!dropdown?.querySelector('.ui-dropdown-open');
  },

  getDropdownHostClass(dropdown) {
    if (!dropdown) return '';
    const fromHost = [...dropdown.classList].find((cls) => /^ng-tns-c\d+-\d+$/.test(cls));
    if (fromHost) return fromHost;

    const inner = dropdown.querySelector('[class*="ng-tns-c"]');
    if (!inner) return '';
    return [...inner.classList].find((cls) => /^ng-tns-c\d+-\d+$/.test(cls)) || '';
  },

  getDropdownPanel(dropdown) {
    const inner = dropdown?.querySelector('.ap-dropdown-panel, .ui-dropdown-panel');
    if (inner && IRCTCExt.Wait.isVisible(inner)) return inner;

    if (!IRCTCExt.Passengers.isDropdownOpen(dropdown)) return null;

    const hostClass = IRCTCExt.Passengers.getDropdownHostClass(dropdown);
    if (hostClass) {
      const linkedPanels = [...IRCTCExt.Wait.queryAll('.ap-dropdown-panel'), ...IRCTCExt.Wait.queryAll('.ui-dropdown-panel')].filter(
        (panel) => panel.classList.contains(hostClass) && IRCTCExt.Wait.isVisible(panel)
      );
      if (linkedPanels.length === 1) return linkedPanels[0];
      if (linkedPanels.length > 1) {
        const dropdownRect = dropdown.getBoundingClientRect();
        const nearest = linkedPanels.reduce((best, panel) => {
          const rect = panel.getBoundingClientRect();
          const dist =
            Math.abs(rect.left - dropdownRect.left) + Math.max(0, rect.top - dropdownRect.bottom);
          return !best || dist < best.dist ? { panel, dist } : best;
        }, null);
        if (nearest) return nearest.panel;
      }
    }

    const panels = [...IRCTCExt.Wait.queryAll('.ap-dropdown-panel'), ...IRCTCExt.Wait.queryAll('.ui-dropdown-panel')].filter(
      (panel) => IRCTCExt.Wait.isVisible(panel)
    );
    if (!panels.length) return null;
    if (panels.length === 1) return panels[0];

    const dropdownRect = dropdown.getBoundingClientRect();
    return (
      panels.find((panel) => {
        const rect = panel.getBoundingClientRect();
        return Math.abs(rect.left - dropdownRect.left) < 24 && rect.top >= dropdownRect.top - 8;
      }) || panels[0]
    );
  },

  dropdownOptionsInPanel(panel) {
    return Array.from(
      panel.querySelectorAll('li[role="option"], li.ui-dropdown-item, .ui-dropdown-item')
    ).filter((item) => IRCTCExt.Wait.isVisible(item));
  },

  visiblePassengerDropdownOptions(panel = null) {
    if (panel) return IRCTCExt.Passengers.dropdownOptionsInPanel(panel);

    const panels = [
      ...IRCTCExt.Wait.queryAll('.ap-dropdown-panel'),
      ...IRCTCExt.Wait.queryAll('.ui-dropdown-panel')
    ].filter((item) => IRCTCExt.Wait.isVisible(item));

    const items = panels.flatMap((item) => IRCTCExt.Passengers.dropdownOptionsInPanel(item));

    if (items.length) return items;
    return IRCTCExt.Wait.queryAll(IRCTCExt.SELECTORS.passengers.passengerDropdownItem).filter((item) =>
      IRCTCExt.Wait.isVisible(item)
    );
  },

  findDropdownOption(options, labelText) {
    const target = IRCTCExt.Passengers.normalizeDropdownText(labelText);
    const token = IRCTCExt.Passengers.berthToken(labelText);
    return (
      options.find(
        (opt) => IRCTCExt.Passengers.normalizeDropdownText(opt.getAttribute('aria-label')) === target
      ) ||
      options.find(
        (opt) => IRCTCExt.Passengers.normalizeDropdownText(opt.textContent) === target
      ) ||
      options.find((opt) => {
        const text = IRCTCExt.Passengers.normalizeDropdownText(opt.textContent);
        return text === target || text.startsWith(`${target} `) || text.endsWith(` ${target}`);
      }) ||
      options.find((opt) =>
        IRCTCExt.Passengers.segmentMatches(opt.textContent, token)
      ) ||
      options.find((opt) => IRCTCExt.Events.optionMatches(opt, labelText))
    );
  },

  findDropdownOptionInPanel(panel, labelText) {
    if (!panel) return null;
    return IRCTCExt.Passengers.findDropdownOption(
      IRCTCExt.Passengers.dropdownOptionsInPanel(panel),
      labelText
    );
  },

  clickDropdownOption(option) {
    IRCTCExt.Events.clickPrimeDropdownItem(option);
  },

  getDropdownOpenTrigger(dropdown) {
    return (
      dropdown?.querySelector('.ui-dropdown-trigger-icon.pi-chevron-down') ||
      dropdown?.querySelector('.ui-dropdown-trigger-icon') ||
      dropdown?.querySelector('.ui-dropdown-trigger') ||
      dropdown
    );
  },

  async waitForDropdownValue(dropdown, labelText, timeout = 2000) {
    const matched = await IRCTCExt.Wait.poll(
      () => {
        const shown = IRCTCExt.Passengers.getDropdownShownValue(dropdown);
        return IRCTCExt.Passengers.dropdownValueMatches(shown, labelText) ? shown : null;
      },
      { timeout, interval: 100 }
    );
    return !!matched;
  },

  async ensureDropdownOpen(dropdown) {
    if (IRCTCExt.Passengers.isDropdownOpen(dropdown)) return true;

    const clickTarget = IRCTCExt.Passengers.getDropdownOpenTrigger(dropdown);
    IRCTCExt.Events.clickWithMouse(clickTarget);
    await IRCTCExt.Wait.delay(400);
    return IRCTCExt.Passengers.isDropdownOpen(dropdown);
  },

  async selectDropdownOptionFromPanel(dropdown, panel, labelText) {
    const match = IRCTCExt.Passengers.findDropdownOptionInPanel(panel, labelText);
    if (!match) return false;

    const hiddenInput = dropdown.querySelector('.ui-helper-hidden-accessible input, input[role="listbox"]');
    hiddenInput?.focus();

    IRCTCExt.Passengers.clickDropdownOption(match);
    if (await IRCTCExt.Passengers.waitForDropdownValue(dropdown, labelText)) return true;

    IRCTCExt.Passengers.clickDropdownOption(match);
    if (await IRCTCExt.Passengers.waitForDropdownValue(dropdown, labelText)) return true;

    return await IRCTCExt.Passengers.selectDropdownViaKeyboard(dropdown, labelText);
  },

  async selectDropdownViaKeyboard(dropdown, labelText) {
    const input = dropdown.querySelector('.ui-helper-hidden-accessible input, input[role="listbox"]');
    if (!input) return false;

    if (!(await IRCTCExt.Passengers.ensureDropdownOpen(dropdown))) return false;

    const panel = IRCTCExt.Passengers.getDropdownPanel(dropdown);
    const options = panel ? IRCTCExt.Passengers.dropdownOptionsInPanel(panel) : [];
    const target = IRCTCExt.Passengers.normalizeDropdownText(labelText);
    const targetIndex = options.findIndex((opt) => {
      const aria = IRCTCExt.Passengers.normalizeDropdownText(opt.getAttribute('aria-label'));
      const text = IRCTCExt.Passengers.normalizeDropdownText(opt.textContent);
      return aria === target || text === target;
    });
    if (targetIndex < 0) return false;

    input.focus();
    IRCTCExt.Events.pressKey(input, 'Home');
    await IRCTCExt.Wait.delay(80);

    for (let i = 0; i <= targetIndex; i += 1) {
      if (i > 0) {
        IRCTCExt.Events.pressKey(input, 'ArrowDown');
        await IRCTCExt.Wait.delay(80);
      }
    }

    IRCTCExt.Events.pressKey(input, 'Enter');
    return await IRCTCExt.Passengers.waitForDropdownValue(dropdown, labelText);
  },

  async selectBerthPreference(root, passenger) {
    const labels = IRCTCExt.Passengers.berthLabelsToTry(passenger?.berth);
    if (!labels.length) return true;

    const sel = IRCTCExt.SELECTORS.passengers;
    const berthTrigger = IRCTCExt.Wait.queryOne(sel.newPassengerBerth, root);
    if (!berthTrigger || !IRCTCExt.Wait.isVisible(berthTrigger)) return false;

    const dropdown = berthTrigger.closest('p-dropdown') || berthTrigger;
    const current = IRCTCExt.Passengers.getDropdownShownValue(dropdown);
    if (labels.some((label) => IRCTCExt.Passengers.dropdownValueMatches(current, label))) {
      return true;
    }

    for (const label of labels) {
      const selected = await IRCTCExt.Passengers.selectDropdownIn(root, sel.newPassengerBerth, label);
      if (selected) return true;
    }

    return false;
  },

  async selectDropdownIn(root, triggerSelectors, labelText) {
    const trigger = IRCTCExt.Wait.queryOne(triggerSelectors, root);
    if (!trigger || !IRCTCExt.Wait.isVisible(trigger)) return false;

    const dropdown = trigger.closest('p-dropdown') || trigger;
    const shown = IRCTCExt.Passengers.getDropdownShownValue(dropdown);
    if (IRCTCExt.Passengers.dropdownValueMatches(shown, labelText)) return true;

    const trySelect = async () => {
      if (!(await IRCTCExt.Passengers.ensureDropdownOpen(dropdown))) return false;

      const panel = await IRCTCExt.Wait.poll(
        () => IRCTCExt.Passengers.getDropdownPanel(dropdown),
        { timeout: 8000, interval: 150 }
      );
      if (!panel) return false;

      return IRCTCExt.Passengers.selectDropdownOptionFromPanel(dropdown, panel, labelText);
    };

    if (await trySelect()) return true;
    if (await IRCTCExt.Passengers.selectDropdownViaKeyboard(dropdown, labelText)) return true;

    const clickTarget = IRCTCExt.Passengers.getDropdownOpenTrigger(dropdown) || trigger;
    if (IRCTCExt.Passengers.isDropdownOpen(dropdown)) {
      IRCTCExt.Events.clickWithMouse(clickTarget);
      await IRCTCExt.Wait.delay(250);
    }

    if (await trySelect()) return true;
    if (await IRCTCExt.Passengers.selectDropdownViaKeyboard(dropdown, labelText)) return true;

    return IRCTCExt.Passengers.dropdownValueMatches(
      IRCTCExt.Passengers.getDropdownShownValue(dropdown),
      labelText
    );
  },

  visiblePassengerAutocompleteOptions() {
    const sel = IRCTCExt.SELECTORS.passengers;
    const panels = IRCTCExt.Wait.queryAll(sel.newPassengerAutocompletePanel).filter((item) =>
      IRCTCExt.Wait.isVisible(item)
    );
    if (panels.length) return panels;

    return IRCTCExt.Wait.queryAll(IRCTCExt.SELECTORS.autocompletePanel).filter((item) =>
      IRCTCExt.Wait.isVisible(item)
    );
  },

  nameInputMatches(nameInput, passengerName) {
    const actual = IRCTCExt.Passengers.normalizeName(nameInput?.value || '');
    const expected = IRCTCExt.Passengers.normalizeName(passengerName);
    return actual === expected;
  },

  async pickPassengerNameAutocomplete(nameInput, passengerName) {
    const options = IRCTCExt.Passengers.visiblePassengerAutocompleteOptions();
    if (!options.length) return false;

    const match =
      options.find((opt) =>
        IRCTCExt.Passengers.normalizeName(opt.textContent) ===
        IRCTCExt.Passengers.normalizeName(passengerName)
      ) || options.find((opt) => IRCTCExt.Events.optionMatches(opt, passengerName));

    if (!match) return false;

    IRCTCExt.Events.click(match.querySelector('span') || match);
    await IRCTCExt.Wait.delay(200);
    return IRCTCExt.Passengers.nameInputMatches(nameInput, passengerName);
  },

  async fillPassengerNameAutocomplete(nameInput, passengerName) {
    const name = String(passengerName || '').trim();
    if (!name) return false;

    nameInput.focus();
    IRCTCExt.Events.setInputValue(nameInput, name, { blur: false });
    await IRCTCExt.Wait.delay(200);

    if (IRCTCExt.Passengers.nameInputMatches(nameInput, name)) return true;

    const pickedAfterSet = await IRCTCExt.Wait.poll(
      async () => {
        if (await IRCTCExt.Passengers.pickPassengerNameAutocomplete(nameInput, name)) return true;
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
      if (await IRCTCExt.Passengers.pickPassengerNameAutocomplete(nameInput, name)) return true;
    }

    IRCTCExt.Events.setInputValue(nameInput, name, { blur: false });
    await IRCTCExt.Wait.delay(200);
    if (IRCTCExt.Passengers.nameInputMatches(nameInput, name)) return true;

    return await IRCTCExt.Passengers.pickPassengerNameAutocomplete(nameInput, name);
  },

  readNewPassengerForm(modalRoot) {
    const sel = IRCTCExt.SELECTORS.passengers;
    const nameInput = IRCTCExt.Wait.queryOne(sel.newPassengerName, modalRoot);
    const ageInput = IRCTCExt.Wait.queryOne(sel.newPassengerAge, modalRoot);

    const genderTrigger = IRCTCExt.Wait.queryOne(sel.newPassengerGender, modalRoot);
    const berthTrigger = IRCTCExt.Wait.queryOne(sel.newPassengerBerth, modalRoot);
    const foodTrigger = IRCTCExt.Wait.queryOne(sel.newPassengerFood, modalRoot);

    const genderDropdown = genderTrigger?.closest('p-dropdown') || genderTrigger;
    const berthDropdown = berthTrigger?.closest('p-dropdown') || berthTrigger;
    const foodDropdown = foodTrigger?.closest('p-dropdown') || foodTrigger;

    return {
      name: (nameInput?.value || '').replace(/\s+/g, ' ').trim(),
      age: String(ageInput?.value || '').trim(),
      gender: genderDropdown ? IRCTCExt.Passengers.getDropdownShownValue(genderDropdown) : '',
      berth: berthDropdown ? IRCTCExt.Passengers.getDropdownShownValue(berthDropdown) : '',
      food: foodDropdown ? IRCTCExt.Passengers.getDropdownShownValue(foodDropdown) : ''
    };
  },

  verifyNewPassengerForm(passenger, modalRoot) {
    const form = IRCTCExt.Passengers.readNewPassengerForm(modalRoot);
    const mismatches = [];

    if (
      IRCTCExt.Passengers.normalizeName(form.name) !==
      IRCTCExt.Passengers.normalizeName(passenger.name)
    ) {
      mismatches.push(`name (expected "${passenger.name}", got "${form.name}")`);
    }

    if (passenger.age && String(form.age).trim() !== String(passenger.age).trim()) {
      mismatches.push(`age (expected "${passenger.age}", got "${form.age}")`);
    }

    const genderLabel = IRCTCExt.Passengers.genderLabel(passenger.gender);
    if (
      passenger.gender &&
      form.gender &&
      !IRCTCExt.Passengers.segmentMatches(form.gender, IRCTCExt.Passengers.genderToken(passenger.gender)) &&
      !IRCTCExt.Passengers.dropdownValueMatches(form.gender, genderLabel)
    ) {
      mismatches.push(`gender (expected "${genderLabel}", got "${form.gender}")`);
    }

    const berthLabel = IRCTCExt.Passengers.berthLabel(passenger.berth);
    if (berthLabel) {
      const berthMatches =
        IRCTCExt.Passengers.segmentMatches(form.berth, IRCTCExt.Passengers.berthToken(passenger.berth)) ||
        IRCTCExt.Passengers.berthLabelsToTry(passenger.berth).some((label) =>
          IRCTCExt.Passengers.dropdownValueMatches(form.berth, label)
        );
      if (!berthMatches) {
        mismatches.push(`berth (expected "${berthLabel}", got "${form.berth || 'Select'}")`);
      }
    }

    const foodLabel = IRCTCExt.Passengers.foodLabel(passenger.food);
    if (foodLabel && form.food) {
      if (
        !IRCTCExt.Passengers.segmentMatches(form.food, IRCTCExt.Passengers.foodToken(passenger.food)) &&
        !IRCTCExt.Passengers.dropdownValueMatches(form.food, foodLabel)
      ) {
        mismatches.push(`food (expected "${foodLabel}", got "${form.food}")`);
      }
    }

    return { ok: mismatches.length === 0, mismatches, form };
  },

  hasNewPassengerValidationErrors(modalRoot) {
    const sel = IRCTCExt.SELECTORS.passengers;
    const errors = IRCTCExt.Wait.queryAll(sel.newPassengerValidationError, modalRoot).filter((el) => {
      if (!IRCTCExt.Wait.isVisible(el)) return false;
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      return text.length > 0;
    });
    return errors.length > 0;
  },

  async waitForNewPassengerFormReady(modalRoot) {
    const sel = IRCTCExt.SELECTORS.passengers;
    const ready = await IRCTCExt.Wait.poll(
      () => {
        const addBtn = IRCTCExt.Wait.queryOne(sel.newPassengerAddBtn, modalRoot);
        if (!addBtn || !IRCTCExt.Wait.isVisible(addBtn) || addBtn.disabled) return null;
        if (IRCTCExt.Passengers.hasNewPassengerValidationErrors(modalRoot)) return null;
        return addBtn;
      },
      { timeout: 5000, interval: 150 }
    );
    return !!ready;
  },

  async refillNewPassengerFields(passenger, modalRoot, fields) {
    const sel = IRCTCExt.SELECTORS.passengers;

    if (fields.includes('name')) {
      const nameInput = IRCTCExt.Wait.queryOne(sel.newPassengerName, modalRoot);
      if (!nameInput) throw new Error('Passenger name field not found');
      const nameOk = await IRCTCExt.Passengers.fillPassengerNameAutocomplete(nameInput, passenger.name);
      if (!nameOk) throw new Error(`Could not set passenger name: ${passenger.name}`);
    }

    if (fields.includes('age')) {
      const ageInput = IRCTCExt.Wait.queryOne(sel.newPassengerAge, modalRoot);
      if (!ageInput) throw new Error('Passenger age field not found');
      IRCTCExt.Events.setInputValue(ageInput, String(passenger.age || '').trim());
    }

    if (fields.includes('gender')) {
      const genderLabel = IRCTCExt.Passengers.genderLabel(passenger.gender);
      const genderOk = await IRCTCExt.Passengers.selectDropdownIn(
        modalRoot,
        sel.newPassengerGender,
        genderLabel
      );
      if (!genderOk) throw new Error(`Could not select gender: ${genderLabel}`);
    }

    if (fields.includes('berth')) {
      const berthOk = await IRCTCExt.Passengers.selectBerthPreference(modalRoot, passenger);
      if (!berthOk) {
        throw new Error(`Could not select berth: ${IRCTCExt.Passengers.berthLabel(passenger.berth)}`);
      }
    }

    if (fields.includes('food')) {
      const foodLabel = IRCTCExt.Passengers.foodLabel(passenger.food);
      if (foodLabel) {
        const foodDropdown = IRCTCExt.Wait.queryOne(sel.newPassengerFood, modalRoot);
        if (foodDropdown && IRCTCExt.Wait.isVisible(foodDropdown)) {
          const foodOk = await IRCTCExt.Passengers.selectDropdownIn(modalRoot, sel.newPassengerFood, foodLabel);
          if (!foodOk) throw new Error(`Could not select food: ${foodLabel}`);
        }
      }
    }
  },

  mismatchFieldsFromVerification(mismatches) {
    const fields = new Set();
    for (const item of mismatches) {
      if (item.startsWith('name')) fields.add('name');
      else if (item.startsWith('age')) fields.add('age');
      else if (item.startsWith('gender')) fields.add('gender');
      else if (item.startsWith('berth')) fields.add('berth');
      else if (item.startsWith('food')) fields.add('food');
    }
    return [...fields];
  },

  async fillNewPassengerForm(passenger, modalRoot, overlay) {
    const sel = IRCTCExt.SELECTORS.passengers;

    await IRCTCExt.Passengers.refillNewPassengerFields(passenger, modalRoot, [
      'name',
      'age',
      'gender',
      'berth'
    ]);

    const nationalityDropdown = IRCTCExt.Wait.queryOne(sel.newPassengerNationality, modalRoot);
    if (nationalityDropdown && IRCTCExt.Wait.isVisible(nationalityDropdown)) {
      const dropdown = nationalityDropdown.closest('p-dropdown') || nationalityDropdown;
      const current = IRCTCExt.Passengers.getDropdownShownValue(dropdown);
      if (!IRCTCExt.Passengers.dropdownValueMatches(current, 'India')) {
        await IRCTCExt.Passengers.selectDropdownIn(modalRoot, sel.newPassengerNationality, 'India');
      }
    }

    const foodLabel = IRCTCExt.Passengers.foodLabel(passenger.food);
    if (foodLabel) {
      const foodDropdown = IRCTCExt.Wait.queryOne(sel.newPassengerFood, modalRoot);
      if (foodDropdown && IRCTCExt.Wait.isVisible(foodDropdown)) {
        await IRCTCExt.Passengers.selectDropdownIn(modalRoot, sel.newPassengerFood, foodLabel);
      }
    }

    let verification = IRCTCExt.Passengers.verifyNewPassengerForm(passenger, modalRoot);
    if (!verification.ok) {
      overlay?.setStatus(`Re-checking passenger details for ${passenger.name}...`);
      const retryFields = IRCTCExt.Passengers.mismatchFieldsFromVerification(verification.mismatches);
      if (retryFields.length) {
        await IRCTCExt.Passengers.refillNewPassengerFields(passenger, modalRoot, retryFields);
      }
      verification = IRCTCExt.Passengers.verifyNewPassengerForm(passenger, modalRoot);
    }

    if (!verification.ok) {
      throw new Error(`Passenger form mismatch: ${verification.mismatches.join('; ')}`);
    }

    return true;
  },

  async submitNewPassenger(passenger, modalRoot, expectedMinCount) {
    const sel = IRCTCExt.SELECTORS.passengers;

    const verification = IRCTCExt.Passengers.verifyNewPassengerForm(passenger, modalRoot);
    if (!verification.ok) {
      throw new Error(`Cannot add passenger — form mismatch: ${verification.mismatches.join('; ')}`);
    }

    const formReady = await IRCTCExt.Passengers.waitForNewPassengerFormReady(modalRoot);
    if (!formReady) {
      throw new Error('Add Passenger form still has validation errors');
    }

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
    await IRCTCExt.Passengers.fillNewPassengerForm(passenger, modal, overlay);
    return IRCTCExt.Passengers.submitNewPassenger(passenger, modal, expectedMinCount);
  },

  async addOneFromExistingModal(passenger, overlay, expectedMinCount) {
    const sel = IRCTCExt.SELECTORS.passengers;
    const modal = await IRCTCExt.Passengers.openExistingPassengerModal(overlay);
    const rows = IRCTCExt.Wait.queryAll(sel.existingPassengerRow, modal);
    const row = IRCTCExt.Passengers.findExistingRowStrict(rows, passenger);

    if (!row) {
      if (IRCTCExt.Passengers.isExistingModalOpen()) {
        await IRCTCExt.Passengers.closeModalCancel(
          sel.existingPassengerCancelBtn,
          IRCTCExt.Passengers.isExistingModalOpen
        );
      }
      return false;
    }

    overlay.setStatus(`Adding ${passenger.name} from existing list...`);
    IRCTCExt.Passengers.toggleRowCheckbox(row);
    await IRCTCExt.Wait.delay(200);

    const addBtn = IRCTCExt.Wait.queryOne(sel.existingPassengerAddBtn, modal);
    if (!addBtn) throw new Error('Existing passenger Add button not found');
    IRCTCExt.Events.click(addBtn);

    await IRCTCExt.Passengers.waitForPassengerCount(expectedMinCount);

    if (IRCTCExt.Passengers.isExistingModalOpen()) {
      await IRCTCExt.Passengers.closeModalCancel(
        sel.existingPassengerCancelBtn,
        IRCTCExt.Passengers.isExistingModalOpen
      );
    }

    return true;
  },

  async addOnePassenger(passenger, overlay, expectedMinCount) {
    if (IRCTCExt.Passengers.passengerAlreadyOnList(passenger)) {
      return 'skipped';
    }

    const fromExisting = await IRCTCExt.Passengers.addOneFromExistingModal(
      passenger,
      overlay,
      expectedMinCount
    );
    if (fromExisting) return 'existing';

    await IRCTCExt.Passengers.addNewPassenger(passenger, overlay, expectedMinCount);
    return 'new';
  },

  async addPassengers(config, overlay) {
    overlay.setStep('Passengers');
    await IRCTCExt.Storage.updateState({ currentStep: 'passengers' });

    const passengers = (config.passengers || []).filter((p) => p.name && String(p.name).trim());
    if (!passengers.length) throw new Error('No passengers configured with names');

    for (let i = 0; i < passengers.length; i += 1) {
      const passenger = passengers[i];
      overlay.setStatus(`Adding passenger ${i + 1}/${passengers.length}: ${passenger.name}...`);
      const expectedCount = IRCTCExt.Passengers.countPassengerListCards() + 1;
      await IRCTCExt.Passengers.addOnePassenger(passenger, overlay, expectedCount);
    }

    await IRCTCExt.Passengers.verifyAndReconcilePassengerList(config, overlay);
    overlay.setStatus(`Verified ${passengers.length} passenger(s)`);
    return true;
  },

  async selectExistingPassengers(config, overlay) {
    return IRCTCExt.Passengers.addPassengers(config, overlay);
  }
};
