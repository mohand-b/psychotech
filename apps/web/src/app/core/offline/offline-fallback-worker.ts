const OFFLINE_FALLBACK_WORKER_URL = '/sw.js';

export function registerOfflineFallbackWorker(
  browserNavigator: Navigator,
): void {
  if (!('serviceWorker' in browserNavigator)) {
    return;
  }
  browserNavigator.serviceWorker
    .register(OFFLINE_FALLBACK_WORKER_URL)
    .catch(() => undefined);
}
