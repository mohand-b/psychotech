import { formatNumericDayMonth } from './format-day-month-year';

export const DAY_MS = 86_400_000;

export function computeStartOfDay(date: Date): number {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
}

export function computeStartOfWeek(date: Date): number {
  const dayIndexFromMonday = (date.getDay() + 6) % 7;
  return computeStartOfDay(date) - dayIndexFromMonday * DAY_MS;
}

export function countDaysSince(
  value: string | Date,
  now: Date = new Date(),
): number {
  return Math.round(
    (computeStartOfDay(now) - computeStartOfDay(new Date(value))) / DAY_MS,
  );
}

export function capitalizeFirstLetter(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatTimeOfDay(date: Date): string {
  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatSessionDate(iso: string, now: Date): string {
  const date = new Date(iso);
  const time = formatTimeOfDay(date);
  const dayDiff = Math.round(
    (computeStartOfDay(now) - computeStartOfDay(date)) / DAY_MS,
  );
  if (dayDiff === 0) {
    return `Aujourd'hui · ${time}`;
  }
  if (dayDiff === 1) {
    return `Hier · ${time}`;
  }
  if (date.getTime() >= computeStartOfWeek(now)) {
    const weekday = date.toLocaleDateString('fr-FR', { weekday: 'long' });
    return `${capitalizeFirstLetter(weekday)} · ${time}`;
  }
  return `${formatNumericDayMonth(date)} · ${time}`;
}
