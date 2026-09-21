(function (root) {
  root.IRCTCExt = root.IRCTCExt || {};
  if (IRCTCExt.NgetTrainList) return;

  IRCTCExt.NgetTrainList = {
    setStatus(overlay, msg) {
      overlay?.setStatus(msg);
    },

    scrollIntoViewIfNeeded(el) {
      if (!el) return;
      el.scrollIntoView({ block: 'center', inline: 'nearest' });
    },

    normalizeTrainText(text) {
      return String(text || '')
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    },

    scoreTrainName(cardName, searchName) {
      const a = IRCTCExt.NgetTrainList.normalizeTrainText(cardName);
      const b = IRCTCExt.NgetTrainList.normalizeTrainText(searchName);
      if (!b) return 0;
      if (a === b) return 100;
      if (a.includes(b) || b.includes(a)) return 80;

      const wordsA = a.split(' ').filter(Boolean);
      const wordsB = b.split(' ').filter(Boolean);
      if (!wordsB.length) return 0;

      const overlap = wordsB.filter((word) =>
        wordsA.some((cardWord) => cardWord.includes(word) || word.includes(cardWord))
      ).length;
      return Math.round((overlap / wordsB.length) * 70);
    },

    parseCardHeading(text) {
      const raw = String(text || '').trim();
      const match = raw.match(/^(.+?)\s*\(\s*(\d+)\s*\)\s*$/);
      if (!match) return { name: raw, number: '' };
      return { name: match[1].trim(), number: match[2].trim() };
    },

    getCardHeading(card) {
      const sel = IRCTCExt.SELECTORS.trainList;
      const el = IRCTCExt.Wait.queryOne(sel.trainHeading, card);
      return (el?.textContent || '').trim();
    },

    getCardTrainName(card) {
      return IRCTCExt.NgetTrainList.parseCardHeading(IRCTCExt.NgetTrainList.getCardHeading(card)).name;
    },

    getCardTrainNumber(card) {
      return IRCTCExt.NgetTrainList.parseCardHeading(IRCTCExt.NgetTrainList.getCardHeading(card)).number;
    },

    resolveTrainCard(el) {
      if (!el) return null;
      if (el.matches?.('app-train-avl-enq')) return el;
      return el.closest('app-train-avl-enq');
    },

    isPopulatedTrainCard(card) {
      if (!card) return false;
      const heading = IRCTCExt.Wait.queryOne(IRCTCExt.SELECTORS.trainList.trainHeading, card);
      return !!(heading && IRCTCExt.Wait.isVisible(heading));
    },

    getPopulatedTrainCards() {
      const sel = IRCTCExt.SELECTORS.trainList;
      const headingSelector = sel.trainHeading?.[0] || '.train-heading strong';
      const cards = [];
      const seen = new Set();

      for (const heading of document.querySelectorAll(headingSelector)) {
        if (!IRCTCExt.Wait.isVisible(heading)) continue;
        const card = IRCTCExt.NgetTrainList.resolveTrainCard(heading);
        if (!card || seen.has(card)) continue;
        if (!IRCTCExt.NgetTrainList.isPopulatedTrainCard(card)) continue;
        seen.add(card);
        cards.push(card);
      }

      if (cards.length) return cards;

      return [...document.querySelectorAll(sel.trainCard?.[0] || 'app-train-avl-enq')].filter((card) =>
        IRCTCExt.NgetTrainList.isPopulatedTrainCard(card)
      );
    },

    findTrainCardByNumber(trainNo) {
      const normalized = String(trainNo || '').trim();
      if (!normalized) return null;

      for (const card of IRCTCExt.NgetTrainList.getPopulatedTrainCards()) {
        if (IRCTCExt.NgetTrainList.getCardTrainNumber(card) === normalized) return card;
      }

      const headingSelector = IRCTCExt.SELECTORS.trainList.trainHeading?.[0] || '.train-heading strong';
      const numberPattern = new RegExp(`\\(\\s*${normalized}\\s*\\)`);
      for (const heading of document.querySelectorAll(headingSelector)) {
        if (!IRCTCExt.Wait.isVisible(heading)) continue;
        if (!numberPattern.test(heading.textContent || '')) continue;
        const card = IRCTCExt.NgetTrainList.resolveTrainCard(heading);
        if (card && IRCTCExt.NgetTrainList.isPopulatedTrainCard(card)) return card;
      }

      return null;
    },

    findTrainCardByName(trainName, minScore = 50) {
      if (!trainName) return null;

      const normalizedSearch = IRCTCExt.NgetTrainList.normalizeTrainText(trainName);
      let bestCard = null;
      let bestScore = 0;

      for (const card of IRCTCExt.NgetTrainList.getPopulatedTrainCards()) {
        const name = IRCTCExt.NgetTrainList.getCardTrainName(card);
        const normalizedName = IRCTCExt.NgetTrainList.normalizeTrainText(name);
        if (normalizedName === normalizedSearch) return card;

        const score = IRCTCExt.NgetTrainList.scoreTrainName(name, trainName);
        if (score > bestScore) {
          bestScore = score;
          bestCard = card;
        }
      }

      return bestScore >= minScore ? bestCard : null;
    },

    findTrainCard(journey = {}) {
      const trainNo = String(journey.trainNo || '').trim();
      const trainName = String(journey.trainName || '').trim();

      if (trainNo) {
        const byNumber = IRCTCExt.NgetTrainList.findTrainCardByNumber(trainNo);
        if (byNumber) return byNumber;

        if (!/^\d+$/.test(trainNo)) {
          const byNoAsName = IRCTCExt.NgetTrainList.findTrainCardByName(trainNo);
          if (byNoAsName) return byNoAsName;
        }
      }

      if (trainName) {
        const byName = IRCTCExt.NgetTrainList.findTrainCardByName(trainName);
        if (byName) return byName;
      }

      if (trainName || trainNo) return null;
      return IRCTCExt.NgetTrainList.getPopulatedTrainCards()[0] || null;
    },

    async waitForTrainListReady(overlay) {
      IRCTCExt.NgetTrainList.setStatus(overlay, 'Waiting for train list...');

      const ready = await IRCTCExt.Wait.poll(
        () => (IRCTCExt.NgetTrainList.getPopulatedTrainCards().length > 0 ? true : null),
        { timeout: 20000, interval: 100 }
      );

      if (!ready) throw new Error('Train list did not load');
    },

    async findTrainCardWithPoll(journey, searchLabel, overlay) {
      IRCTCExt.NgetTrainList.setStatus(overlay, `Searching train list for ${searchLabel}...`);

      let card = IRCTCExt.NgetTrainList.findTrainCard(journey);
      if (card) return card;

      card = await IRCTCExt.Wait.poll(() => IRCTCExt.NgetTrainList.findTrainCard(journey), {
        timeout: 8000,
        interval: 100
      });

      if (!card && (journey.trainName || journey.trainNo)) {
        throw new Error(`Train ${searchLabel} not found in results`);
      }
      if (!card) throw new Error('No trains found on page');
      return card;
    },

    classCellMatchesTravelClass(classCell, travelClass) {
      if (!classCell || !travelClass) return false;

      const labelEl = classCell.querySelector('strong');
      const text = (labelEl?.textContent || classCell.textContent || '').trim();
      const normalizedClass = String(travelClass).trim().toUpperCase();
      const classLabel = IRCTCExt.Stations.getClassLabel(travelClass);

      if (text.includes(classLabel)) return true;
      if (new RegExp(`\\(\\s*${normalizedClass}\\s*\\)`).test(text)) return true;
      if (new RegExp(`\\b${normalizedClass}\\b`).test(text.toUpperCase())) return true;

      return false;
    },

    isClassPickerCell(cell) {
      if (!cell || IRCTCExt.NgetTrainList.isDateAvailabilityCell(cell)) return false;

      if (IRCTCExt.NgetTrainList.findClassRefreshControl(cell)) return true;

      const strong = cell.querySelector('div:first-child strong, strong');
      const label = (strong?.textContent || '').trim();
      if (!label) return false;
      if (/\b(mon|tue|wed|thu|fri|sat|sun)\b/i.test(label)) return false;

      return (
        /\([A-Z0-9]{1,3}\)/.test(label) ||
        /sleeper|tier|class|chair|sitting|economy|anubhuti|vistadome/i.test(label)
      );
    },

    isDateAvailabilityCell(cell) {
      if (!cell) return false;
      if (cell.querySelector('.AVAILABLE, .RAC, .WL, .REGRET')) return true;
      const label = IRCTCExt.NgetTrainList.getDateCellLabel(cell);
      return /\b(mon|tue|wed|thu|fri|sat|sun)\b/i.test(label);
    },

    getClassPickerCells(card) {
      const sel = IRCTCExt.SELECTORS.trainList;
      const cells = [...card.querySelectorAll(sel.classPickerCell?.[0] || 'div.pre-avl')];
      return cells.filter((cell) => IRCTCExt.NgetTrainList.isClassPickerCell(cell));
    },

    getClassCells(card) {
      return IRCTCExt.NgetTrainList.getClassPickerCells(card);
    },

    getDatePanel(card) {
      const sel = IRCTCExt.SELECTORS.trainList;
      return IRCTCExt.Wait.queryOne(sel.datePanel, card);
    },

    getDateAvailabilityCells(card) {
      const panel = IRCTCExt.NgetTrainList.getDatePanel(card);
      if (!panel) return [];

      const container = panel.closest('.col-xs-12') || card;
      const cells = [...container.querySelectorAll('div.pre-avl')];
      return cells.filter((cell) => IRCTCExt.NgetTrainList.isDateAvailabilityCell(cell));
    },

    getDateCellLabel(dateCell) {
      const sel = IRCTCExt.SELECTORS.trainList;
      const labelEl = IRCTCExt.Wait.queryOne(sel.dateLabel, dateCell) || dateCell.querySelector('strong');
      return (labelEl?.textContent || '').trim();
    },

    findClassCell(card, travelClass) {
      for (const classCell of IRCTCExt.NgetTrainList.getClassPickerCells(card)) {
        if (IRCTCExt.NgetTrainList.classCellMatchesTravelClass(classCell, travelClass)) {
          return classCell;
        }
      }
      return null;
    },

    async findClassCellWithScroll(card, travelClass, overlay) {
      for (let i = 0; i < 8; i += 1) {
        const classCell = IRCTCExt.NgetTrainList.findClassCell(card, travelClass);
        if (classCell) {
          IRCTCExt.NgetTrainList.scrollIntoViewIfNeeded(classCell);
          return classCell;
        }

        const scrollHost = card.querySelector('[style*="overflow-x"]') || card.querySelector('table');
        if (scrollHost && scrollHost.scrollWidth > scrollHost.clientWidth) {
          IRCTCExt.NgetTrainList.setStatus(overlay, `Scrolling to find class ${travelClass}...`);
          scrollHost.scrollLeft += Math.min(180, scrollHost.clientWidth);
          await IRCTCExt.Wait.delay(250);
          continue;
        }
        break;
      }

      const classCell = IRCTCExt.NgetTrainList.findClassCell(card, travelClass);
      if (classCell) IRCTCExt.NgetTrainList.scrollIntoViewIfNeeded(classCell);
      return classCell;
    },

    findClassRefreshControl(classCell) {
      if (!classCell) return null;

      const sel = IRCTCExt.SELECTORS.trainList;
      const links = IRCTCExt.Wait.queryAll(sel.classRefreshLink, classCell);
      const link = links.find(
        (el) => /refresh/i.test(el.textContent || '') && IRCTCExt.Wait.isVisible(el)
      );
      if (link) return link;

      const icons = IRCTCExt.Wait.queryAll(sel.classRefreshIcon, classCell);
      const icon = icons.find((el) => IRCTCExt.Wait.isVisible(el));
      if (icon) return icon;

      return null;
    },

    async waitForDatePanel(card, overlay) {
      const loaded = await IRCTCExt.Wait.poll(
        () => {
          const panel = IRCTCExt.NgetTrainList.getDatePanel(card);
          if (!panel || !IRCTCExt.Wait.isVisible(panel)) return null;
          return IRCTCExt.NgetTrainList.getDateAvailabilityCells(card).length > 0 ? true : null;
        },
        { timeout: 10000, interval: 200 }
      );

      if (!loaded) throw new Error('Date availability panel did not load');
      return true;
    },

    parseDateCellStatus(dateCell) {
      const sel = IRCTCExt.SELECTORS.trainList;
      const statusEl = IRCTCExt.Wait.queryOne(sel.dateStatus, dateCell);
      const text = (statusEl?.textContent || dateCell?.textContent || '').replace(/\s+/g, ' ').trim();
      const status = { type: '', text };

      const upper = text.toUpperCase();
      if (/high\s*load|please\s*retry/i.test(text)) status.type = 'HIGH_LOAD';
      else if (statusEl?.classList.contains('AVAILABLE') || upper.includes('AVAILABLE')) status.type = 'AVAILABLE';
      else if (statusEl?.classList.contains('RAC') || /\bRAC\b/.test(upper)) status.type = 'RAC';
      else if (statusEl?.classList.contains('WL') || /\bWL\b/.test(upper)) status.type = 'WL';
      else if (statusEl?.classList.contains('REGRET') || upper.includes('REGRET') || /not available/i.test(text)) {
        status.type = 'REGRET';
      }

      return status;
    },

    findDateCell(card, journeyDate) {
      if (!journeyDate) return null;

      for (const dateCell of IRCTCExt.NgetTrainList.getDateAvailabilityCells(card)) {
        const label = IRCTCExt.NgetTrainList.getDateCellLabel(dateCell);
        if (IRCTCExt.Stations.dateLabelsMatch(journeyDate, label)) return dateCell;
      }

      return null;
    },

    classTabMatchesTravelClass(tab, travelClass) {
      if (!tab || !travelClass) return false;
      const text = (tab.textContent || '').trim();
      const normalizedClass = String(travelClass).trim().toUpperCase();
      const classLabel = IRCTCExt.Stations.getClassLabel(travelClass);

      if (text.includes(classLabel)) return true;
      if (new RegExp(`\\(\\s*${normalizedClass}\\s*\\)`).test(text)) return true;
      if (new RegExp(`\\b${normalizedClass}\\b`).test(text.toUpperCase())) return true;

      return false;
    },

    async ensureClassTabActive(card, travelClass, overlay) {
      const sel = IRCTCExt.SELECTORS.trainList;
      const active = IRCTCExt.Wait.queryOne(sel.classTabActive, card);
      if (active && IRCTCExt.NgetTrainList.classTabMatchesTravelClass(active, travelClass)) return;

      const tabs = IRCTCExt.Wait.queryAll(sel.classTabItem, card);
      const match = tabs.find((tab) => IRCTCExt.NgetTrainList.classTabMatchesTravelClass(tab, travelClass));
      if (!match) return;

      IRCTCExt.NgetTrainList.setStatus(overlay, `Selecting class tab ${travelClass}...`);
      IRCTCExt.Events.click(match.querySelector('a') || match);
      await IRCTCExt.Wait.delay(300);
    },

    isHighLoadStatus(status) {
      const text = String(status?.text || '');
      return /high\s*load|please\s*retry/i.test(text) || status?.type === 'HIGH_LOAD';
    },

    isRetryableAvailabilityError(status) {
      return IRCTCExt.NgetTrainList.isHighLoadStatus(status);
    },

    isBookableStatus(statusType) {
      return statusType === 'AVAILABLE' || statusType === 'RAC';
    },

    async refreshClassAvailability(classPickerCell, card, overlay, travelClass) {
      IRCTCExt.NgetTrainList.scrollIntoViewIfNeeded(classPickerCell);

      const refresh = IRCTCExt.NgetTrainList.findClassRefreshControl(classPickerCell);
      if (!refresh) throw new Error(`Refresh control not found for class ${travelClass}`);

      IRCTCExt.NgetTrainList.setStatus(overlay, `Refreshing availability for ${travelClass}...`);
      IRCTCExt.Events.click(refresh);
      await IRCTCExt.Wait.delay(500);
      await IRCTCExt.NgetTrainList.waitForDatePanel(card, overlay);
      return true;
    },

    async waitForBookableDate(card, journeyDate, travelClass, classPickerCell, overlay) {
      let attempt = 0;
      const dateLabel = IRCTCExt.Stations.formatDateForNgetCard(journeyDate) || journeyDate;

      while (await IRCTCExt.Bot.isRunning()) {
        const control = await IRCTCExt.Bot.checkControlState();
        if (control === 'stopped') throw new Error('Booking stopped');
        if (control === 'paused') {
          IRCTCExt.NgetTrainList.setStatus(overlay, 'Paused — click Resume to continue...');
          await IRCTCExt.Bot.waitUntilResumedOrStopped();
          if (!(await IRCTCExt.Bot.isRunning())) throw new Error('Booking stopped');
          continue;
        }

        await IRCTCExt.NgetTrainList.waitForDatePanel(card, overlay);
        await IRCTCExt.NgetTrainList.ensureClassTabActive(card, travelClass, overlay);

        const dateCell = IRCTCExt.NgetTrainList.findDateCell(card, journeyDate);
        if (!dateCell) {
          throw new Error(`Journey date not found in availability (${dateLabel})`);
        }

        const status = IRCTCExt.NgetTrainList.parseDateCellStatus(dateCell);
        if (IRCTCExt.NgetTrainList.isBookableStatus(status.type)) {
          return { dateCell, status };
        }

        if (!IRCTCExt.NgetTrainList.isRetryableAvailabilityError(status)) {
          throw new Error(
            `${dateLabel} shows ${status.text || status.type || 'not available'} — not bookable`
          );
        }

        attempt += 1;
        IRCTCExt.NgetTrainList.setStatus(
          overlay,
          `High load on ${dateLabel} — refreshing (attempt ${attempt})...`
        );
        await IRCTCExt.NgetTrainList.refreshClassAvailability(
          classPickerCell,
          card,
          overlay,
          travelClass
        );
        await IRCTCExt.Wait.delay(400);
      }

      throw new Error('Booking stopped');
    },

    selectDateCell(dateCell) {
      if (!dateCell) return;
      IRCTCExt.NgetTrainList.scrollIntoViewIfNeeded(dateCell);
      IRCTCExt.Events.click(dateCell);
    },

    findBookNowButton(card) {
      const sel = IRCTCExt.SELECTORS.trainList;
      const enabled = IRCTCExt.Wait.queryOne(sel.bookNowEnabled, card);
      if (enabled && IRCTCExt.Wait.isVisible(enabled)) return enabled;

      const buttons = card.querySelectorAll(sel.bookNowBtn?.[0] || 'button.train_Search');
      return (
        [...buttons].find(
          (btn) =>
            /book\s*now/i.test(btn.textContent || '') &&
            !btn.classList.contains('disable-book') &&
            IRCTCExt.Wait.isVisible(btn)
        ) || null
      );
    },

    async waitForBookNowEnabled(card, overlay, travelClass) {
      return IRCTCExt.Wait.poll(
        () => IRCTCExt.NgetTrainList.findBookNowButton(card),
        { timeout: 15000, interval: 200 }
      );
    },

    async confirmBookingAndWait(overlay) {
      if (location.pathname.includes('psgninput')) return true;

      const deadline = Date.now() + 25000;
      while (Date.now() < deadline) {
        if (location.pathname.includes('psgninput')) return true;
        await IRCTCExt.Wait.delay(100);
      }

      if (location.pathname.includes('psgninput')) return true;
      throw new Error('Did not reach passenger input page after booking');
    },

    async bookTrain(config, overlay) {
      const { journey } = config;

      overlay?.setStep('Train List');
      await IRCTCExt.NgetTrainList.waitForTrainListReady(overlay);

      const trainName = String(journey.trainName || '').trim();
      const trainNo = String(journey.trainNo || '').trim();
      const searchLabel = trainNo || trainName || 'train';
      const travelClass = journey.travelClass || 'SL';

      const card = await IRCTCExt.NgetTrainList.findTrainCardWithPoll(journey, searchLabel, overlay);

      const trainNum = IRCTCExt.NgetTrainList.getCardTrainNumber(card) || trainNo || '';
      const matchedName = IRCTCExt.NgetTrainList.getCardTrainName(card);
      const foundLabel =
        trainNum && matchedName
          ? `Found train ${trainNum} — ${matchedName}`
          : matchedName
            ? `Found train ${matchedName}`
            : `Found train ${trainNum}`;
      IRCTCExt.NgetTrainList.setStatus(overlay, foundLabel);

      const classPickerCell = await IRCTCExt.NgetTrainList.findClassCellWithScroll(card, travelClass, overlay);
      if (!classPickerCell) throw new Error(`Class ${travelClass} not found for train ${trainNum}`);

      if (!journey.date) throw new Error('Journey date is required for nget train-list booking');

      await IRCTCExt.NgetTrainList.refreshClassAvailability(
        classPickerCell,
        card,
        overlay,
        travelClass
      );

      const { dateCell, status } = await IRCTCExt.NgetTrainList.waitForBookableDate(
        card,
        journey.date,
        travelClass,
        classPickerCell,
        overlay
      );

      const dateLabel =
        IRCTCExt.NgetTrainList.getDateCellLabel(dateCell) ||
        IRCTCExt.Stations.formatDateForNgetCard(journey.date);
      IRCTCExt.NgetTrainList.setStatus(
        overlay,
        `Selecting ${dateLabel} (${status.text || status.type})...`
      );
      IRCTCExt.NgetTrainList.selectDateCell(dateCell);
      await IRCTCExt.Wait.delay(300);

      let bookBtn = IRCTCExt.NgetTrainList.findBookNowButton(card);
      if (!bookBtn) {
        IRCTCExt.NgetTrainList.setStatus(overlay, 'Waiting for Book Now to enable...');
        bookBtn = await IRCTCExt.NgetTrainList.waitForBookNowEnabled(card, overlay, travelClass);
      }
      if (!bookBtn) throw new Error('Book Now button did not become enabled');

      IRCTCExt.NgetTrainList.setStatus(
        overlay,
        `${dateLabel} available (${status.text || status.type}) — clicking Book Now...`
      );
      IRCTCExt.NgetTrainList.scrollIntoViewIfNeeded(bookBtn);
      IRCTCExt.Events.click(bookBtn);
      await IRCTCExt.Wait.delay(400);

      IRCTCExt.NgetTrainList.setStatus(overlay, 'Book Now clicked — waiting for passenger page...');
      await IRCTCExt.NgetTrainList.confirmBookingAndWait(overlay);
      return true;
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
