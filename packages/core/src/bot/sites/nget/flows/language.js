(function (root) {
  root.IRCTCExt = root.IRCTCExt || {};
  if (IRCTCExt.NgetLanguageFlow) return;

  IRCTCExt.NgetLanguageFlow = {
    isEnglishButton(btn) {
      if (!btn) return false;
      const text = (btn.textContent || '').trim();
      if (/^english$/i.test(text)) return true;
      const aria = btn.getAttribute('aria-label') || '';
      return /english/i.test(text) && /welcome to irctc/i.test(aria);
    },

    getDialogRoot() {
      const dialog = IRCTCExt.Wait.queryOne(IRCTCExt.NgetSelectors.languageDialog);
      if (!dialog || !IRCTCExt.Wait.isVisible(dialog)) return null;
      const text = (dialog.textContent || '').replace(/\s+/g, ' ');
      if (!/welcome to irctc/i.test(text)) return null;
      if (!/preferred language/i.test(text)) return null;
      return dialog;
    },

    isLanguageModalVisible() {
      return !!IRCTCExt.NgetLanguageFlow.getDialogRoot();
    },

    findEnglishButton() {
      const dialog = IRCTCExt.NgetLanguageFlow.getDialogRoot();
      if (!dialog) return null;

      const primaryButtons = IRCTCExt.Wait.queryAll(IRCTCExt.NgetSelectors.languageButtons, dialog);
      const byText = primaryButtons.find((btn) => IRCTCExt.NgetLanguageFlow.isEnglishButton(btn));
      if (byText) return byText;

      const rows = IRCTCExt.Wait.queryAll(IRCTCExt.NgetSelectors.languageButtonRow, dialog);
      for (const row of rows) {
        const submitButtons = IRCTCExt.Wait.queryAll(
          ['button[type="submit"].btn-primary', 'button.btn-primary'],
          row
        );
        const english = submitButtons.find((btn) => /english/i.test((btn.textContent || '').trim()));
        if (english) return english;
      }

      const submitButtons = IRCTCExt.Wait.queryAll(IRCTCExt.NgetSelectors.languageEnglishSubmit, dialog);
      return submitButtons.find((btn) => IRCTCExt.NgetLanguageFlow.isEnglishButton(btn)) || null;
    },

    submitEnglishButton(englishBtn) {
      IRCTCExt.Events.click(englishBtn);

      const form = englishBtn.closest('form');
      if (!form) return;

      if (typeof form.requestSubmit === 'function') {
        try {
          form.requestSubmit(englishBtn);
        } catch {
          form.requestSubmit();
        }
        return;
      }

      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    },

    async clickEnglishAndWaitForClose(englishBtn, overlay) {
      overlay?.setStatus?.('Selecting English...');
      IRCTCExt.NgetLanguageFlow.submitEnglishButton(englishBtn);
      await IRCTCExt.Wait.delay(500);

      if (!IRCTCExt.NgetLanguageFlow.isLanguageModalVisible()) {
        return true;
      }

      IRCTCExt.NgetLanguageFlow.submitEnglishButton(englishBtn);
      await IRCTCExt.Wait.delay(400);

      const closed = await IRCTCExt.Wait.poll(
        () => (!IRCTCExt.NgetLanguageFlow.isLanguageModalVisible() ? true : null),
        { timeout: 10000, interval: 200 }
      );

      return !!closed;
    },

    async dismissPreferredLanguage(overlay) {
      overlay?.setStep?.('Language');
      overlay?.setStatus?.('Waiting for language prompt...');

      const modalShown = await IRCTCExt.Wait.poll(
        () => (IRCTCExt.NgetLanguageFlow.isLanguageModalVisible() ? true : null),
        { timeout: 12000, interval: 200 }
      );

      if (!modalShown) {
        overlay?.setStatus?.('Language prompt not shown — continuing.');
        return false;
      }

      const englishBtn = IRCTCExt.NgetLanguageFlow.findEnglishButton();
      if (!englishBtn) {
        throw new Error('English language button not found on IRCTC language prompt.');
      }

      const closed = await IRCTCExt.NgetLanguageFlow.clickEnglishAndWaitForClose(englishBtn, overlay);
      if (!closed) {
        throw new Error('Language prompt did not close after selecting English.');
      }

      overlay?.setStatus?.('English selected.');
      await IRCTCExt.Wait.delay(300);
      return true;
    },

    async dismissIfPresent(overlay) {
      return IRCTCExt.NgetLanguageFlow.dismissPreferredLanguage(overlay);
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
