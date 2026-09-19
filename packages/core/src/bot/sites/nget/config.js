(function (root) {
  root.IRCTCExt = root.IRCTCExt || {};

  IRCTCExt.NgetConfig = {
    id: 'nget',
    label: 'Classic — nget',
    homeUrl: 'https://www.irctc.co.in/nget',
    trainSearchUrl: 'https://www.irctc.co.in/nget/train-search',
    trainSearchPath: '/nget/train-search',
    urlPattern: 'https://www.irctc.co.in/nget/*',
    trainSearchUrlPattern: 'https://www.irctc.co.in/nget/train-search*',
    errorPagePath: '/nget/error'
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
