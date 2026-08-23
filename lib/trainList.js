window.IRCTCExt = window.IRCTCExt || {};

IRCTCExt.TrainList = {
  normalizeTrainText(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  },

  scoreTrainName(cardName, searchName) {
    const a = IRCTCExt.TrainList.normalizeTrainText(cardName);
    const b = IRCTCExt.TrainList.normalizeTrainText(searchName);
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
      IRCTCExt.TrainList.isPopulatedTrainCard(card)
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
    return card && IRCTCExt.TrainList.isPopulatedTrainCard(card) ? card : null;
  },

  findTrainCardByNumber(trainNo) {
    const direct = IRCTCExt.TrainList.findTrainCardByNumberDirect(trainNo);
    if (direct) return direct;

    const normalized = String(trainNo || '').trim();
    if (!normalized) return null;

    for (const card of IRCTCExt.TrainList.getPopulatedTrainCards()) {
      const heading = card.querySelector('.train-heading strong');
      if (heading && new RegExp(`\\(\\s*${normalized}\\s*\\)`).test(heading.textContent)) {
        return card;
      }
    }
    return null;
  },

  findTrainCardByNameDirect(trainName, minScore = 50) {
    if (!trainName) return null;

    const normalizedSearch = IRCTCExt.TrainList.normalizeTrainText(trainName);
    let bestCard = null;
    let bestScore = 0;

    for (const card of IRCTCExt.TrainList.getPopulatedTrainCards()) {
      const name = IRCTCExt.TrainList.getCardTrainName(card);
      const normalizedName = IRCTCExt.TrainList.normalizeTrainText(name);
      if (normalizedName === normalizedSearch) return card;

      const score = IRCTCExt.TrainList.scoreTrainName(name, trainName);
      if (score > bestScore) {
        bestScore = score;
        bestCard = card;
      }
    }

    return bestScore >= minScore ? bestCard : null;
  },

  findTrainCardByName(trainName, minScore = 50) {
    return IRCTCExt.TrainList.findTrainCardByNameDirect(trainName, minScore);
  },

  findTrainCard(journey = {}) {
    const trainNo = String(journey.trainNo || '').trim();
    const trainName = String(journey.trainName || '').trim();

    if (trainNo) {
      const byNumber = IRCTCExt.TrainList.findTrainCardByNumber(trainNo);
      if (byNumber) return byNumber;
    }

    if (trainName) {
      const byName = IRCTCExt.TrainList.findTrainCardByName(trainName);
      if (byName) return byName;
    }

    if (trainName || trainNo) return null;

    const cards = IRCTCExt.TrainList.getPopulatedTrainCards();
    return cards[0] || null;
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
    if (IRCTCExt.TrainList.classMatchesCode(codeEl, travelClass)) return true;

    const codeText = (codeEl?.textContent || classCard.textContent || '').trim();
    const normalizedClass = String(travelClass).trim().toUpperCase();
    if (new RegExp(`\\b${normalizedClass}\\b`).test(codeText.toUpperCase())) return true;

    return false;
  },

  findClassCard(card, travelClass) {
    for (const classCard of IRCTCExt.TrainList.getClassCards(card)) {
      if (IRCTCExt.TrainList.classCardMatchesTravelClass(classCard, travelClass)) return classCard;
    }
    return null;
  },

  parseClassStatus(classCard) {
    const statusEl = classCard?.querySelector('.class-status');
    if (!statusEl) return { type: '', text: '' };

    const text = (statusEl.textContent || '').trim();
    if (statusEl.classList.contains('AVAILABLE')) return { type: 'AVAILABLE', text };
    if (statusEl.classList.contains('RAC')) return { type: 'RAC', text };
    if (statusEl.classList.contains('REGRET')) return { type: 'REGRET', text };
    if (statusEl.classList.contains('WL')) return { type: 'WL', text };

    const upper = text.toUpperCase();
    if (upper.includes('AVAILABLE')) return { type: 'AVAILABLE', text };
    if (/\bRAC\b/.test(upper)) return { type: 'RAC', text };
    if (upper.includes('REGRET')) return { type: 'REGRET', text };
    if (upper.includes('WL')) return { type: 'WL', text };
    return { type: '', text };
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

  findAvailabilityButton(card) {
    const sel = IRCTCExt.SELECTORS.trainList;
    const direct = IRCTCExt.Wait.queryOne(sel.availabilityBtn, card);
    if (direct && IRCTCExt.Wait.isVisible(direct)) return direct;

    const buttons = card.querySelectorAll('button');
    return (
      [...buttons].find(
        (btn) => /check\s*availability/i.test(btn.textContent || '') && IRCTCExt.Wait.isVisible(btn)
      ) || null
    );
  },

  async loadAvailability(card, overlay, maxAttempts = 3) {
    if (IRCTCExt.TrainList.hasClassCards(card)) return true;

    card.scrollIntoView({ block: 'center', inline: 'nearest' });

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      if (IRCTCExt.TrainList.hasClassCards(card)) return true;

      const btn = IRCTCExt.TrainList.findAvailabilityButton(card);
      if (!btn) {
        if (IRCTCExt.TrainList.hasClassCards(card)) return true;
        throw new Error('Check Availability button not found');
      }

      overlay?.setStatus(
        attempt === 0 ? 'Loading availability...' : `Retrying availability (${attempt + 1}/${maxAttempts})...`
      );

      IRCTCExt.Events.click(btn);
      await IRCTCExt.Wait.delay(attempt === 0 ? 1000 : 1200);

      const loaded = await IRCTCExt.Wait.poll(() => IRCTCExt.TrainList.hasClassCards(card), {
        timeout: 12000,
        interval: 200
      });
      if (loaded) return true;
    }

    throw new Error('Class availability did not load');
  },

  async findClassCardWithScroll(card, travelClass, overlay) {
    for (let i = 0; i < 6; i += 1) {
      const classCard = IRCTCExt.TrainList.findClassCard(card, travelClass);
      if (classCard) return classCard;

      const scrollBtn = card.querySelector('.btn-scroll-next');
      if (!scrollBtn || !IRCTCExt.Wait.isVisible(scrollBtn)) break;

      overlay?.setStatus(`Scrolling to find class ${travelClass}...`);
      IRCTCExt.Events.click(scrollBtn);
      await IRCTCExt.Wait.delay(400);
    }
    return IRCTCExt.TrainList.findClassCard(card, travelClass);
  },

  async bookTrain(config, overlay) {
    const { journey } = config;
    const sel = IRCTCExt.SELECTORS.trainList;

    await IRCTCExt.Wait.waitFor(sel.container, { timeout: 20000 });
    overlay?.setStep('Train List');

    const trainName = String(journey.trainName || '').trim();
    const trainNo = String(journey.trainNo || '').trim();
    const searchLabel = trainNo || trainName || 'train';
    overlay?.setStatus(`Finding ${searchLabel}...`);

    const card = await IRCTCExt.Wait.poll(() => IRCTCExt.TrainList.findTrainCard(journey), {
      timeout: 12000,
      interval: 200
    });

    if (!card && (trainName || trainNo)) {
      throw new Error(`Train ${searchLabel} not found in results`);
    }
    if (!card) {
      throw new Error('No trains found on page');
    }

    const trainNum = IRCTCExt.TrainList.getCardTrainNumber(card) || trainNo || '';
    const matchedName = IRCTCExt.TrainList.getCardTrainName(card);
    const statusLabel = matchedName
      ? `Found train ${matchedName}${trainNum ? ` (${trainNum})` : ''}`
      : `Found train ${trainNum}`;
    overlay?.setStatus(`${statusLabel}, loading availability...`);

    await IRCTCExt.TrainList.loadAvailability(card, overlay);

    const travelClass = journey.travelClass || 'SL';
    overlay?.setStatus(`Selecting class ${travelClass}...`);
    const classCard = await IRCTCExt.TrainList.findClassCardWithScroll(card, travelClass, overlay);
    if (!classCard) throw new Error(`Class ${travelClass} not found for train ${trainNum}`);

    const status = IRCTCExt.TrainList.parseClassStatus(classCard);
    if (!IRCTCExt.TrainList.isBookableStatus(status.type)) {
      throw new Error(`${travelClass} shows ${status.text || status.type || 'not available'} — not bookable`);
    }

    const bookBtn = classCard.querySelector('button.btn-book');
    if (!bookBtn) throw new Error(`BOOK button not found for class ${travelClass}`);

    overlay?.setStatus(`Booking ${travelClass} (${status.text || status.type})...`);
    classCard.scrollIntoView({ block: 'center', inline: 'nearest' });
    IRCTCExt.Events.click(bookBtn);
    await IRCTCExt.Wait.delay(1000);

    await IRCTCExt.TrainList.confirmBookingAndWait(overlay);
    return true;
  },

  async confirmBookingAndWait(overlay) {
    if (location.pathname.includes('psgninput')) {
      return true;
    }

    overlay?.setStatus('Waiting for passenger input page...');
    const deadline = Date.now() + 25000;

    while (Date.now() < deadline) {
      if (location.pathname.includes('psgninput')) {
        return true;
      }

      await IRCTCExt.Wait.delay(300);
    }

    if (location.pathname.includes('psgninput')) {
      return true;
    }

    throw new Error('Did not reach passenger input page after booking');
  }
};
