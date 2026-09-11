(function (root) {
  root.IRCTCExt = root.IRCTCExt || {};

  IRCTCExt.EticketConfig = {
    id: 'eticket',
    label: 'Beta — eticket',
    homeUrl: 'https://www.irctc.co.in/eticket',
    trainSearchUrl: 'https://www.irctc.co.in/eticket/train-search',
    trainSearchPath: '/eticket/train-search',
    urlPattern: 'https://www.irctc.co.in/eticket/*',
    trainSearchUrlPattern: 'https://www.irctc.co.in/eticket/train-search*',
    errorPagePath: '/eticket/error'
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
