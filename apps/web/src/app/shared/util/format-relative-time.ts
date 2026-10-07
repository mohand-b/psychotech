import { countDaysSince } from './format-session-date';

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
const INSTANT_THRESHOLD_MS = 45_000;
const DAYS_PER_MONTH = 30;
const DAYS_PER_YEAR = 365;

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

export function formatElapsedDaysLabel(iso: string, now: Date): string {
  const days = countDaysSince(iso, now);
  if (days <= 0) {
    return 'Aujourd’hui';
  }
  if (days === 1) {
    return 'Hier';
  }
  if (days < DAYS_PER_MONTH) {
    return `Il y a ${days} jours`;
  }
  if (days < DAYS_PER_YEAR) {
    return `Il y a ${Math.floor(days / DAYS_PER_MONTH)} mois`;
  }
  const years = Math.floor(days / DAYS_PER_YEAR);
  return `Il y a ${years} ${years > 1 ? 'ans' : 'an'}`;
}
