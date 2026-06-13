export interface CalendarDay {
  year: number;
  month: number;
  day: number;
}

export function localCalendarDay(date: Date, timezone: string): CalendarDay {
  const parts = zonedParts(date, timezone, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
  };
}

export function localDayNumber(date: Date, timezone: string): number {
  return ordinal(localCalendarDay(date, timezone));
}

export function previousLocalDayNumber(date: Date, timezone: string): number {
  const { year, month, day } = localCalendarDay(date, timezone);
  const previous = new Date(Date.UTC(year, month - 1, day - 1));
  return ordinal({
    year: previous.getUTCFullYear(),
    month: previous.getUTCMonth() + 1,
    day: previous.getUTCDate(),
  });
}

export function nextLocalMidnight(now: Date, timezone: string): Date {
  const { year, month, day } = localCalendarDay(now, timezone);
  const nextDay = new Date(Date.UTC(year, month - 1, day + 1));
  return zonedMidnightToUtc(
    {
      year: nextDay.getUTCFullYear(),
      month: nextDay.getUTCMonth() + 1,
      day: nextDay.getUTCDate(),
    },
    timezone,
  );
}

function ordinal({ year, month, day }: CalendarDay): number {
  return year * 10000 + month * 100 + day;
}

function zonedMidnightToUtc(day: CalendarDay, timezone: string): Date {
  const utcGuess = Date.UTC(day.year, day.month - 1, day.day, 0, 0, 0);
  const offsetMs = zonedOffsetMs(new Date(utcGuess), timezone);
  return new Date(utcGuess - offsetMs);
}

function zonedOffsetMs(date: Date, timezone: string): number {
  const parts = zonedParts(date, timezone, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - date.getTime();
}

function zonedParts(
  date: Date,
  timezone: string,
  options: Intl.DateTimeFormatOptions,
): Record<string, string> {
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone: timezone, ...options });
  const result: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) {
    result[part.type] = part.value;
  }
  return result;
}
