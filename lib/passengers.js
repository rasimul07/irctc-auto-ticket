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

  berthToken(berth) {
    const map = {
      'No Preference': 'no preference',
      Upper: 'upper',
      Lower: 'lower',
      Middle: 'middle',
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

    if (!candidates.length) {
      throw new Error(`Saved passenger not found: "${passenger.name}"`);
    }

    if (candidates.length === 1) {
      return candidates[0];
    }

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
    return IRCTCExt.Wait.queryAll(IRCTCExt.SELECTORS.passengers.passengerListCard).length;
  },

  async selectExistingPassengers(config, overlay) {
    const sel = IRCTCExt.SELECTORS.passengers;
    overlay.setStep('Passengers');
    overlay.setStatus('Opening existing passenger list...');
    await IRCTCExt.Storage.updateState({ currentStep: 'passengers' });

    const existingBtn = await IRCTCExt.Wait.waitFor(sel.existingPassengerBtn, {
      timeout: 20000,
      visible: true
    });
    if (!existingBtn) throw new Error('Existing Passenger button not found');

    IRCTCExt.Events.click(existingBtn);

    const modalReady = await IRCTCExt.Wait.poll(
      () => {
        const mask = IRCTCExt.Wait.queryOne(sel.existingModal);
        if (!mask || !IRCTCExt.Wait.isVisible(mask)) return null;
        const title = IRCTCExt.Wait.queryOne(sel.existingModalTitle, mask);
        if (!title || !/add existing passenger/i.test(title.textContent || '')) return null;
        return mask;
      },
      { timeout: 12000, interval: 200 }
    );
    if (!modalReady) throw new Error('Add existing passenger modal did not open');

    const passengers = (config.passengers || []).filter((p) => p.name && String(p.name).trim());
    if (!passengers.length) throw new Error('No passengers configured with names');

    const rows = IRCTCExt.Wait.queryAll(sel.existingPassengerRow, modalReady);
    if (!rows.length) throw new Error('No saved passengers found in modal');

    const usedRows = new Set();
    for (let i = 0; i < passengers.length; i += 1) {
      const p = passengers[i];
      overlay.setStatus(`Selecting passenger ${i + 1}: ${p.name}`);
      const row = IRCTCExt.Passengers.findPassengerRow(rows, p, usedRows);
      usedRows.add(row);
      IRCTCExt.Passengers.toggleRowCheckbox(row);
      await IRCTCExt.Wait.delay(200);
    }

    const addBtn = IRCTCExt.Wait.queryOne(sel.existingPassengerAddBtn, modalReady);
    if (!addBtn) throw new Error('Add button not found in existing passenger modal');

    overlay.setStatus('Adding selected passengers...');
    IRCTCExt.Events.click(addBtn);

    const expectedCount = passengers.length;
    const added = await IRCTCExt.Wait.poll(
      () => {
        const mask = IRCTCExt.Wait.queryOne(sel.existingModal);
        if (mask && IRCTCExt.Wait.isVisible(mask)) return null;
        const count = IRCTCExt.Passengers.countPassengerListCards();
        return count >= expectedCount ? count : null;
      },
      { timeout: 15000, interval: 300 }
    );
    if (!added) {
      throw new Error(`Passengers were not added (expected ${expectedCount})`);
    }

    overlay.setStatus(`Added ${expectedCount} passenger(s)`);
    return true;
  }
};
