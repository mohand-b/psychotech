const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
const INSTANT_THRESHOLD_MS = 45_000;

export function formatRelativeTime(iso: string, now: Date): string {
  const elapsedMs = now.getTime() - new Date(iso).getTime();
  if (elapsedMs < INSTANT_THRESHOLD_MS) {
    return 'à l’instant';
  }
  if (elapsedMs < HOUR_MS) {
    return `il y a ${Math.max(1, Math.floor(elapsedMs / MINUTE_MS))} min`;
  }
  if (elapsedMs < DAY_MS) {
    return `il y a ${Math.floor(elapsedMs / HOUR_MS)} h`;
  }
  if (elapsedMs < 2 * DAY_MS) {
    return 'hier';
  }
  return `il y a ${Math.floor(elapsedMs / DAY_MS)} j`;
}
