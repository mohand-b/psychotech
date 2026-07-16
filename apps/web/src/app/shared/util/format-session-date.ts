export const DAY_MS = 86_400_000;

export function startOfDay(date: Date): number {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
}

export function startOfWeek(date: Date): number {
  const dayIndexFromMonday = (date.getDay() + 6) % 7;
  return startOfDay(date) - dayIndexFromMonday * DAY_MS;
}

export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatSessionDate(iso: string, now: Date): string {
  const date = new Date(iso);
  const time = date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const dayDiff = Math.round((startOfDay(now) - startOfDay(date)) / DAY_MS);
  if (dayDiff === 0) {
    return `Aujourd'hui · ${time}`;
  }
  if (dayDiff === 1) {
    return `Hier · ${time}`;
  }
  if (date.getTime() >= startOfWeek(now)) {
    const weekday = date.toLocaleDateString('fr-FR', { weekday: 'long' });
    return `${capitalize(weekday)} · ${time}`;
  }
  const day = date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
  });
  return `${day} · ${time}`;
}
