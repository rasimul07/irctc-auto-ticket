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
    gatewayUrl: 'https://pg.irctcpayments.com/',
    gatewayHost: 'pg.irctcpayments.com',
    gatewayUrlPattern: 'https://pg.irctcpayments.com/*',
    gatewayAuthRedirectPath: '/pg/api/v2/authRedirect',
    thirdPartyGatewayHosts: ['pg.irctcpayments.com', 'irctcipay.com', 'phonepe.com'],
    errorPagePath: '/nget/error'
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
