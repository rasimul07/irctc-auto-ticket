window.IRCTCExt = window.IRCTCExt || {};

IRCTCExt.EticketTrainList = {
  setStatus(overlay, msg) {
    overlay?.setStatus(msg);
  },

  isInViewport(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth;
  },

  scrollIntoViewIfNeeded(el) {
    if (!el || IRCTCExt.EticketTrainList.isInViewport(el)) return;
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
    const a = IRCTCExt.EticketTrainList.normalizeTrainText(cardName);
    const b = IRCTCExt.EticketTrainList.normalizeTrainText(searchName);
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

  isPopulatedTrainCard(card) {
    if (!card || !IRCTCExt.Wait.isVisible(card)) return false;
    const sel = IRCTCExt.SELECTORS.trainList;
    return !!(
      IRCTCExt.Wait.queryOne(sel.trainListing, card) &&
      IRCTCExt.Wait.queryOne(sel.trainNumber, card)
    );
  },

  getPopulatedTrainCards() {
    const sel = IRCTCExt.SELECTORS.trainList;
    return [...document.querySelectorAll(sel.trainCard?.[0] || 'app-train-avl-enq')].filter((card) =>
      IRCTCExt.EticketTrainList.isPopulatedTrainCard(card)
    );
  },

  getCardTrainName(card) {
    const sel = IRCTCExt.SELECTORS.trainList;
    const nameEl = IRCTCExt.Wait.queryOne(sel.trainName, card);
    return (nameEl?.textContent || '').trim();
  },

  getCardTrainNumber(card) {
    const sel = IRCTCExt.SELECTORS.trainList;
    const numEl = IRCTCExt.Wait.queryOne(sel.trainNumber, card);
    return (numEl?.textContent || '').trim();
  },

  findTrainCardByNumberDirect(trainNo) {
    if (!trainNo) return null;

    const normalized = String(trainNo).trim();
    const sel = IRCTCExt.SELECTORS.trainList;
    const numEl = [...document.querySelectorAll(`${sel.trainCard?.[0] || 'app-train-avl-enq'} ${sel.trainNumber?.[0] || '.train-number'}`)].find(
      (el) => (el.textContent || '').trim() === normalized
    );
    const card = numEl?.closest('app-train-avl-enq') || null;
    return card && IRCTCExt.EticketTrainList.isPopulatedTrainCard(card) ? card : null;
  },

  findTrainCardByNumber(trainNo) {
    const direct = IRCTCExt.EticketTrainList.findTrainCardByNumberDirect(trainNo);
    if (direct) return direct;

    const normalized = String(trainNo || '').trim();
    if (!normalized) return null;

    for (const card of IRCTCExt.EticketTrainList.getPopulatedTrainCards()) {
      const heading = card.querySelector('.train-heading strong');
      if (heading && new RegExp(`\\(\\s*${normalized}\\s*\\)`).test(heading.textContent)) {
        return card;
      }
    }
    return null;
  },

  findTrainCardByNameDirect(trainName, minScore = 50) {
    if (!trainName) return null;

    const normalizedSearch = IRCTCExt.EticketTrainList.normalizeTrainText(trainName);
    let bestCard = null;
    let bestScore = 0;

    for (const card of IRCTCExt.EticketTrainList.getPopulatedTrainCards()) {
      const name = IRCTCExt.EticketTrainList.getCardTrainName(card);
      const normalizedName = IRCTCExt.EticketTrainList.normalizeTrainText(name);
      if (normalizedName === normalizedSearch) return card;

      const score = IRCTCExt.EticketTrainList.scoreTrainName(name, trainName);
      if (score > bestScore) {
        bestScore = score;
        bestCard = card;
      }
    }

    return bestScore >= minScore ? bestCard : null;
  },

  findTrainCardByName(trainName, minScore = 50) {
    return IRCTCExt.EticketTrainList.findTrainCardByNameDirect(trainName, minScore);
  },

  findTrainCard(journey = {}) {
    const trainNo = String(journey.trainNo || '').trim();
    const trainName = String(journey.trainName || '').trim();

    if (trainNo) {
      const byNumber = IRCTCExt.EticketTrainList.findTrainCardByNumber(trainNo);
      if (byNumber) return byNumber;
    }

    if (trainName) {
      const byName = IRCTCExt.EticketTrainList.findTrainCardByName(trainName);
      if (byName) return byName;
    }

    if (trainName || trainNo) return null;

    const cards = IRCTCExt.EticketTrainList.getPopulatedTrainCards();
    return cards[0] || null;
  },

  async waitForTrainListReady(overlay) {
    IRCTCExt.EticketTrainList.setStatus(overlay, 'Waiting for train list...');
    const sel = IRCTCExt.SELECTORS.trainList;

    const ready = await IRCTCExt.Wait.poll(
      () => {
        if (IRCTCExt.EticketTrainList.getPopulatedTrainCards().length > 0) return true;
        const container = IRCTCExt.Wait.queryOne(sel.container);
        return container && IRCTCExt.Wait.isVisible(container) ? true : null;
      },
      { timeout: 20000, interval: 100 }
    );

    if (!ready) throw new Error('Train list did not load');
  },

  async findTrainCardWithPoll(journey, searchLabel, overlay) {
    IRCTCExt.EticketTrainList.setStatus(overlay, `Searching train list for ${searchLabel}...`);

    let card = IRCTCExt.EticketTrainList.findTrainCard(journey);
    if (card) return card;

    card = await IRCTCExt.Wait.poll(() => IRCTCExt.EticketTrainList.findTrainCard(journey), {
      timeout: 8000,
      interval: 100
    });

    if (!card && (journey.trainName || journey.trainNo)) {
      throw new Error(`Train ${searchLabel} not found in results`);
    }
    if (!card) {
      throw new Error('No trains found on page');
    }
    return card;
  },

  classMatchesCode(classCodeEl, travelClass) {
    if (!classCodeEl || !travelClass) return false;
    const text = (classCodeEl.textContent || '').trim();
    const label = IRCTCExt.Stations.getClassLabel(travelClass);
    return text.includes(label) || text.includes(`(${travelClass})`) || text.endsWith(travelClass);
  },

  hasClassCards(card) {
    if (!card) return false;

    const sel = IRCTCExt.SELECTORS.trainList;
    if (card.querySelectorAll(`${sel.availableClasses?.[0] || '.available-classes'} ${sel.classCard?.[0] || '.class-card'}`).length > 0) {
      return true;
    }

    const classCards = card.querySelectorAll(sel.classCard?.[0] || '.class-card');
    for (const classCard of classCards) {
      if (
        classCard.querySelector(sel.classStatus?.[0] || '.class-status') ||
        classCard.querySelector(sel.bookBtn?.[0] || 'button.btn-book')
      ) {
        return true;
      }
    }

    if (card.querySelectorAll(sel.classCell?.[0] || 'div.pre-avl').length > 0) return true;

    const bookButtons = card.querySelectorAll(sel.bookBtn?.[0] || 'button.btn-book');
    return [...bookButtons].some((btn) => IRCTCExt.Wait.isVisible(btn));
  },

  getClassCards(card) {
    const sel = IRCTCExt.SELECTORS.trainList;
    const cards = card.querySelectorAll(sel.classCard?.[0] || '.class-card');
    if (cards.length) return [...cards];

    return [...card.querySelectorAll(sel.classCell?.[0] || 'div.pre-avl')];
  },

  classCardMatchesTravelClass(classCard, travelClass) {
    if (!classCard || !travelClass) return false;

    const sel = IRCTCExt.SELECTORS.trainList;
    const codeEl = classCard.querySelector(sel.classCode?.[0] || '.class-code');
    if (IRCTCExt.EticketTrainList.classMatchesCode(codeEl, travelClass)) return true;

    const codeText = (codeEl?.textContent || classCard.textContent || '').trim();
    const normalizedClass = String(travelClass).trim().toUpperCase();
    if (new RegExp(`\\b${normalizedClass}\\b`).test(codeText.toUpperCase())) return true;

    return false;
  },

  findClassCard(card, travelClass) {
    for (const classCard of IRCTCExt.EticketTrainList.getClassCards(card)) {
      if (IRCTCExt.EticketTrainList.classCardMatchesTravelClass(classCard, travelClass)) return classCard;
    }
    return null;
  },

  parseClassStatus(classCard) {
    const sel = IRCTCExt.SELECTORS.trainList;
    const statusEl = classCard?.querySelector(sel.classStatus?.[0] || '.class-status');
    if (!statusEl) return { type: '', text: '' };

    const text = (statusEl.textContent || '').trim();
    const status = { type: '', text };

    if (statusEl.classList.contains('AVAILABLE')) status.type = 'AVAILABLE';
    else if (statusEl.classList.contains('RAC')) status.type = 'RAC';
    else if (statusEl.classList.contains('WL')) status.type = 'WL';
    else if (statusEl.classList.contains('REGRET')) status.type = 'REGRET';

    if (!status.type) {
      const upper = text.toUpperCase();
      if (upper.includes('AVAILABLE')) status.type = 'AVAILABLE';
      else if (/\bRAC\b/.test(upper)) status.type = 'RAC';
      else if (upper.includes('WL')) status.type = 'WL';
      else if (upper.includes('REGRET')) status.type = 'REGRET';
    }

    if (IRCTCExt.EticketTrainList.isHighLoadStatus(status)) {
      status.type = 'HIGH_LOAD';
    }

    return status;
  },

  isHighLoadStatus(status) {
    const text = String(status?.text || '');
    return /high\s*load|please\s*retry/i.test(text);
  },

  isRetryableAvailabilityError(status) {
    return IRCTCExt.EticketTrainList.isHighLoadStatus(status) || status?.type === 'HIGH_LOAD';
  },

  isBookableStatus(statusType) {
    return statusType === 'AVAILABLE' || statusType === 'RAC';
  },

  isAvailabilityButtonBusy(btn) {
    if (!btn) return false;
    if (btn.disabled) return true;
    if (btn.getAttribute('aria-disabled') === 'true') return true;
    if (btn.classList.contains('ui-button-loading')) return true;
    return /\b(checking|loading)\b/i.test(btn.textContent || '');
  },

  findRefreshAvailabilityButton(card) {
    const sel = IRCTCExt.SELECTORS.trainList;
    const candidates = IRCTCExt.Wait.queryAll(sel.refreshAvailabilityBtn || sel.availabilityBtn, card);
    const refreshBtn = candidates.find(
      (btn) => /refresh\s*availability/i.test(btn.textContent || '') && IRCTCExt.Wait.isVisible(btn)
    );
    if (refreshBtn) return refreshBtn;

    const buttons = card.querySelectorAll('button');
    return (
      [...buttons].find(
        (btn) => /refresh\s*availability/i.test(btn.textContent || '') && IRCTCExt.Wait.isVisible(btn)
      ) || null
    );
  },

  findClassRefreshIcon(classCard) {
    if (!classCard) return null;
    const sel = IRCTCExt.SELECTORS.trainList;
    const icons = IRCTCExt.Wait.queryAll(sel.classRefreshIcon, classCard);
    return icons.find((icon) => IRCTCExt.Wait.isVisible(icon)) || null;
  },

  findAvailabilityButton(card) {
    const refreshBtn = IRCTCExt.EticketTrainList.findRefreshAvailabilityButton(card);
    if (refreshBtn && !IRCTCExt.EticketTrainList.isAvailabilityButtonBusy(refreshBtn)) {
      return refreshBtn;
    }

    const sel = IRCTCExt.SELECTORS.trainList;
    const direct = IRCTCExt.Wait.queryOne(sel.availabilityBtn, card);
    if (direct && IRCTCExt.Wait.isVisible(direct) && !IRCTCExt.EticketTrainList.isAvailabilityButtonBusy(direct)) {
      return direct;
    }

    const buttons = card.querySelectorAll('button');
    return (
      [...buttons].find((btn) => {
        if (!IRCTCExt.Wait.isVisible(btn)) return false;
        if (IRCTCExt.EticketTrainList.isAvailabilityButtonBusy(btn)) return false;
        return /check\s*availability|refresh\s*availability/i.test(btn.textContent || '');
      }) || null
    );
  },

  findAvailabilityRefreshControl(card, classCard) {
    const refreshBtn = IRCTCExt.EticketTrainList.findRefreshAvailabilityButton(card);
    if (refreshBtn && !IRCTCExt.EticketTrainList.isAvailabilityButtonBusy(refreshBtn)) {
      return refreshBtn;
    }
    return IRCTCExt.EticketTrainList.findClassRefreshIcon(classCard);
  },

  async waitForBookableClass(card, classCard, travelClass, overlay) {
    let attempt = 0;

    while (await IRCTCExt.Bot.isRunning()) {
      const control = await IRCTCExt.Bot.checkControlState();
      if (control === 'stopped') {
        throw new Error('Booking stopped');
      }
      if (control === 'paused') {
        IRCTCExt.EticketTrainList.setStatus(overlay, 'Paused — click Resume to continue...');
        await IRCTCExt.Bot.waitUntilResumedOrStopped();
        if (!(await IRCTCExt.Bot.isRunning())) {
          throw new Error('Booking stopped');
        }
        continue;
      }
      const status = IRCTCExt.EticketTrainList.parseClassStatus(classCard);
      if (IRCTCExt.EticketTrainList.isBookableStatus(status.type)) {
        return status;
      }

      if (!IRCTCExt.EticketTrainList.isRetryableAvailabilityError(status)) {
        throw new Error(
          `${travelClass} shows ${status.text || status.type || 'not available'} — not bookable`
        );
      }

      attempt += 1;
      IRCTCExt.EticketTrainList.setStatus(
        overlay,
        `High load on ${travelClass} — refreshing (attempt ${attempt})...`
      );

      const refreshControl = IRCTCExt.EticketTrainList.findAvailabilityRefreshControl(card, classCard);
      if (refreshControl) {
        IRCTCExt.EticketTrainList.scrollIntoViewIfNeeded(classCard);
        IRCTCExt.Events.click(refreshControl);
      }

      await IRCTCExt.Wait.delay(600);

      const previousText = status.text;
      await IRCTCExt.Wait.poll(
        () => {
          const next = IRCTCExt.EticketTrainList.parseClassStatus(classCard);
          if (IRCTCExt.EticketTrainList.isBookableStatus(next.type)) return next;
          if (next.text !== previousText) return next;
          return null;
        },
        { timeout: 8000, interval: 200 }
      );
    }

    throw new Error('Booking stopped');
  },

  async loadAvailability(card, overlay, travelClass, maxAttempts = 3, forceRefresh = false) {
    if (!forceRefresh && IRCTCExt.EticketTrainList.hasClassCards(card)) {
      IRCTCExt.EticketTrainList.setStatus(
        overlay,
        `Availability already loaded — selecting class ${travelClass}...`
      );
      return true;
    }

    IRCTCExt.EticketTrainList.scrollIntoViewIfNeeded(card);

    if (forceRefresh && IRCTCExt.EticketTrainList.hasClassCards(card)) {
      const classCard = IRCTCExt.EticketTrainList.findClassCard(card, travelClass);
      const refreshControl =
        IRCTCExt.EticketTrainList.findAvailabilityRefreshControl(card, classCard) ||
        IRCTCExt.EticketTrainList.findRefreshAvailabilityButton(card);

      if (refreshControl) {
        IRCTCExt.EticketTrainList.setStatus(
          overlay,
          `Tatkal window open — refreshing availability for class ${travelClass}...`
        );
        IRCTCExt.Events.click(refreshControl);
        await IRCTCExt.Wait.delay(500);
        return true;
      }
    }

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      if (!forceRefresh && IRCTCExt.EticketTrainList.hasClassCards(card)) {
        IRCTCExt.EticketTrainList.setStatus(
          overlay,
          `Availability loaded — selecting class ${travelClass}...`
        );
        return true;
      }

      const btn =
        IRCTCExt.EticketTrainList.findRefreshAvailabilityButton(card) ||
        IRCTCExt.EticketTrainList.findAvailabilityButton(card);
      if (!btn) {
        if (IRCTCExt.EticketTrainList.hasClassCards(card)) return true;
        throw new Error('Check Availability button not found');
      }

      IRCTCExt.EticketTrainList.setStatus(
        overlay,
        attempt === 0
          ? 'Clicking Check/Refresh Availability...'
          : `Retrying Check/Refresh Availability (${attempt + 1}/${maxAttempts})...`
      );

      IRCTCExt.Events.click(btn);
      await IRCTCExt.Wait.delay(attempt === 0 ? 350 : 500);

      const loaded = await IRCTCExt.Wait.poll(() => IRCTCExt.EticketTrainList.hasClassCards(card), {
        timeout: 8000,
        interval: 100
      });
      if (loaded) {
        IRCTCExt.EticketTrainList.setStatus(
          overlay,
          `Availability loaded — selecting class ${travelClass}...`
        );
        return true;
      }
    }

    throw new Error('Class availability did not load');
  },

  async findClassCardWithScroll(card, travelClass, overlay) {
    for (let i = 0; i < 6; i += 1) {
      const classCard = IRCTCExt.EticketTrainList.findClassCard(card, travelClass);
      if (classCard) return classCard;

      const scrollBtn = card.querySelector('.btn-scroll-next');
      if (!scrollBtn || !IRCTCExt.Wait.isVisible(scrollBtn)) break;

      IRCTCExt.EticketTrainList.setStatus(overlay, `Scrolling to find class ${travelClass}...`);
      IRCTCExt.Events.click(scrollBtn);
      await IRCTCExt.Wait.delay(250);
    }
    return IRCTCExt.EticketTrainList.findClassCard(card, travelClass);
  },

  async waitForTatkalWindowIfNeeded(config, overlay) {
    const isTatkal =
      IRCTCExt.Stations?.isTatkalQuota?.(config.journey?.quota) || !!config.schedule?.enabled;
    if (!isTatkal) return false;

    const info = IRCTCExt.Stations?.getTatkalOpeningTime?.(config);
    if (!info || !info.isPending || info.remainingMs <= 0) return false;

    overlay?.setStep('Waiting for Tatkal');

    while (Date.now() < info.targetMs) {
      if (await IRCTCExt.Bot.wasStopped()) return false;

      const remainingMs = info.targetMs - Date.now();
      if (remainingMs <= 0) break;

      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
      overlay?.setStatus(
        `Train found! Tatkal window opens at ${info.targetTimeStr} IST. Refreshing availability in ${remainingSec}s...`
      );

      const pollInterval = remainingMs < 1000 ? 50 : remainingMs < 5000 ? 150 : 350;
      await IRCTCExt.Wait.delay(pollInterval);
    }

    overlay?.setStatus('Tatkal window open! Refreshing availability now...');
    overlay?.setStep('Train List');
    await IRCTCExt.Wait.delay(200);
    return true;
  },

  async bookTrain(config, overlay) {
    const { journey } = config;

    overlay?.setStep('Train List');
    await IRCTCExt.EticketTrainList.waitForTrainListReady(overlay);

    const trainName = String(journey.trainName || '').trim();
    const trainNo = String(journey.trainNo || '').trim();
    const searchLabel = trainNo || trainName || 'train';
    const travelClass = journey.travelClass || 'SL';

    const card = await IRCTCExt.EticketTrainList.findTrainCardWithPoll(journey, searchLabel, overlay);

    const trainNum = IRCTCExt.EticketTrainList.getCardTrainNumber(card) || trainNo || '';
    const matchedName = IRCTCExt.EticketTrainList.getCardTrainName(card);
    const foundLabel =
      trainNum && matchedName
        ? `Found train ${trainNum} — ${matchedName}`
        : matchedName
          ? `Found train ${matchedName}`
          : `Found train ${trainNum}`;
    IRCTCExt.EticketTrainList.setStatus(overlay, foundLabel);

    const wasTatkalPending = await IRCTCExt.EticketTrainList.waitForTatkalWindowIfNeeded(
      config,
      overlay
    );

    await IRCTCExt.EticketTrainList.loadAvailability(
      card,
      overlay,
      travelClass,
      3,
      wasTatkalPending
    );

    const classCard = await IRCTCExt.EticketTrainList.findClassCardWithScroll(card, travelClass, overlay);
    if (!classCard) throw new Error(`Class ${travelClass} not found for train ${trainNum}`);

    const status = await IRCTCExt.EticketTrainList.waitForBookableClass(
      card,
      classCard,
      travelClass,
      overlay
    );

    const bookBtn = classCard.querySelector('button.btn-book');
    if (!bookBtn) throw new Error(`BOOK button not found for class ${travelClass}`);

    IRCTCExt.EticketTrainList.setStatus(
      overlay,
      `Class ${travelClass} available (${status.text || status.type}) — clicking Book...`
    );
    IRCTCExt.EticketTrainList.scrollIntoViewIfNeeded(classCard);
    IRCTCExt.Events.click(bookBtn);
    await IRCTCExt.Wait.delay(400);

    IRCTCExt.EticketTrainList.setStatus(overlay, 'Book clicked — waiting for passenger page...');
    await IRCTCExt.EticketTrainList.confirmBookingAndWait(overlay);
    return true;
  },

  async confirmBookingAndWait(overlay) {
    if (location.pathname.includes('psgninput')) {
      return true;
    }

    const deadline = Date.now() + 25000;

    while (Date.now() < deadline) {
      if (location.pathname.includes('psgninput')) {
        return true;
      }

      await IRCTCExt.Wait.delay(100);
    }

    if (location.pathname.includes('psgninput')) {
      return true;
    }

    throw new Error('Did not reach passenger input page after booking');
  }
};
