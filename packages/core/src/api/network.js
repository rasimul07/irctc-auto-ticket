export const OFFLINE_MESSAGE = 'You are offline. Connect to the internet and try again.';

const NETWORK_ERROR_PATTERN = /ENOTFOUND|ECONNREFUSED|ETIMEDOUT|ECONNRESET|getaddrinfo|network error|failed to fetch/i;
const NETWORK_ERROR_CODES = new Set(['NETWORK_OFFLINE', 'SERVICE_UNAVAILABLE', 'DB_UNAVAILABLE']);

export function isBrowserOnline() {
  return typeof navigator === 'undefined' || navigator.onLine;
}

export function isNetworkError(err) {
  if (!err) return false;
  if (err.code && NETWORK_ERROR_CODES.has(err.code)) return true;
  const message = String(err.message || err);
  return NETWORK_ERROR_PATTERN.test(message);
}

export function toUserNetworkMessage(err, fallback = 'Could not reach access API.') {
  if (!isBrowserOnline() || isNetworkError(err)) {
    return OFFLINE_MESSAGE;
  }
  return err?.message || fallback;
}

export function watchOnlineStatus(onOnline, onOffline) {
  const target = typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : null;
  if (!target?.addEventListener) return () => {};

  const handleOnline = () => onOnline?.();
  const handleOffline = () => onOffline?.();

  target.addEventListener('online', handleOnline);
  target.addEventListener('offline', handleOffline);

  return () => {
    target.removeEventListener('online', handleOnline);
    target.removeEventListener('offline', handleOffline);
  };
}
