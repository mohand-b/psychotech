const STALE_CHUNK_RELOAD_KEY = 'psychotech.stale-chunk-reload-at';
const STALE_CHUNK_RELOAD_COOLDOWN_MS = 30_000;

export function isStaleChunkError(error: unknown): boolean {
  return (
    error instanceof TypeError &&
    /dynamically imported module|import\(\)|Loading chunk/i.test(error.message)
  );
}

export function reloadOnceForStaleChunk(targetUrl?: string): boolean {
  const lastReloadAt = Number(
    window.sessionStorage.getItem(STALE_CHUNK_RELOAD_KEY) ?? 0,
  );
  if (Date.now() - lastReloadAt < STALE_CHUNK_RELOAD_COOLDOWN_MS) {
    return false;
  }
  window.sessionStorage.setItem(STALE_CHUNK_RELOAD_KEY, String(Date.now()));
  if (targetUrl) {
    window.location.assign(targetUrl);
  } else {
    window.location.reload();
  }
  return true;
}
