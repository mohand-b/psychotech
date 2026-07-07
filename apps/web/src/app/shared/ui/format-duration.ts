export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatSecondsTenths(milliseconds: number): string {
  const seconds = (milliseconds / 1000).toLocaleString('fr-FR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return `${seconds} s`;
}

export function formatDayTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const startOfDay = (value: Date) =>
    new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const dayDiff = Math.round(
    (startOfDay(now) - startOfDay(date)) / 86_400_000,
  );
  const time = date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  if (dayDiff === 0) {
    return `Aujourd'hui, ${time}`;
  }
  if (dayDiff === 1) {
    return `Hier, ${time}`;
  }
  const day = date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
  });
  return `${day}, ${time}`;
}
