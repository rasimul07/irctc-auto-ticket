(function (root) {
  root.IRCTCExt = root.IRCTCExt || {};

  if (!IRCTCExt.SiteRegistry) {
    IRCTCExt.SiteRegistry = {
      SITES: {},

      register(site) {
        if (site?.id) this.SITES[site.id] = site;
      },

      getSiteId(config) {
        return config?.preferences?.bookingSite === 'nget' ? 'nget' : 'eticket';
      },

      get(config) {
        const id = this.getSiteId(config);
        return this.SITES[id] || this.SITES.eticket;
      },

      getById(id) {
        return this.SITES[id] || this.SITES.eticket;
      },

      activateSelectors(config) {
        const site = this.get(config);
        if (!site) {
          throw new Error('Booking site profile not loaded. Reload the extension.');
        }
        if (site.selectors) IRCTCExt.SELECTORS = site.selectors;
        return site;
      }
    };
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
