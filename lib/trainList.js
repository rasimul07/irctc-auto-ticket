window.IRCTCExt = window.IRCTCExt || {};

IRCTCExt.TrainList = {
  findTrainCard(trainNo) {
    const cards = document.querySelectorAll('app-train-avl-enq');
    if (!cards.length) return null;

    if (trainNo) {
      const normalized = String(trainNo).trim();
      for (const card of cards) {
        const numEl = card.querySelector('.train-number');
        if (numEl && numEl.textContent.trim() === normalized) return card;

        const heading = card.querySelector('.train-heading strong');
        if (heading && new RegExp(`\\(\\s*${normalized}\\s*\\)`).test(heading.textContent)) {
          return card;
        }
      }
      return null;
    }

    return cards[0];
  },

  classMatchesCode(classCodeEl, travelClass) {
    if (!classCodeEl || !travelClass) return false;
    const text = (classCodeEl.textContent || '').trim();
    const label = IRCTCExt.Stations.getClassLabel(travelClass);
    return text.includes(label) || text.includes(`(${travelClass})`) || text.endsWith(travelClass);
  },

  findClassCard(card, travelClass) {
    const classCards = card.querySelectorAll('.class-card');
    for (const classCard of classCards) {
      const codeEl = classCard.querySelector('.class-code');
      if (IRCTCExt.TrainList.classMatchesCode(codeEl, travelClass)) return classCard;
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

  hasClassCards(card) {
    return card.querySelectorAll('.available-classes .class-card').length > 0;
  },

  async loadAvailability(card, overlay) {
    if (IRCTCExt.TrainList.hasClassCards(card)) return true;

    const btn = card.querySelector('button.btn-availability');
    if (!btn) throw new Error('Check Availability button not found');

    overlay?.setStatus('Loading availability...');
    card.scrollIntoView({ block: 'center', inline: 'nearest' });
    IRCTCExt.Events.click(btn);
    await IRCTCExt.Wait.delay(800);

    const loaded = await IRCTCExt.Wait.poll(() => IRCTCExt.TrainList.hasClassCards(card), {
      timeout: 15000,
      interval: 200
    });
    if (!loaded) throw new Error('Class availability did not load');
    return true;
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
    overlay?.setStatus('Train list loaded, finding train...');

    let card = IRCTCExt.TrainList.findTrainCard(journey.trainNo);
    if (!card && journey.trainNo) {
      throw new Error(`Train ${journey.trainNo} not found in results`);
    }
    if (!card) {
      card = document.querySelector('app-train-avl-enq');
    }
    if (!card) throw new Error('No trains found on page');

    const trainNum = card.querySelector('.train-number')?.textContent?.trim() || journey.trainNo || '';
    overlay?.setStatus(`Found train ${trainNum}, loading availability...`);

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
    return true;
  }
};
