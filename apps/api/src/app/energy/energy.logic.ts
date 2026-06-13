import {
  EnergyStateDto,
  SessionMode,
  SubscriptionTier,
} from '@psychotech/shared';

const ENERGY_COST_BY_MODE: Record<SessionMode, number> = {
  [SessionMode.FULL]: 5,
  [SessionMode.TARGETED]: 1,
  [SessionMode.TUTORIAL]: 0,
};

interface AffordabilityInput {
  tier: SubscriptionTier;
  balance: number;
  cost: number;
}

interface EnergyStateInput {
  balance: number;
  capacity: number;
  tier: SubscriptionTier;
  timezone: string;
}

interface CalendarDay {
  year: number;
  month: number;
  day: number;
}

export function energyCost(mode: SessionMode): number {
  return ENERGY_COST_BY_MODE[mode];
}

export function canAfford({ tier, balance, cost }: AffordabilityInput): boolean {
  if (tier === SubscriptionTier.UNLIMITED) {
    return true;
  }
  if (tier === SubscriptionTier.FREE) {
    return cost === 0;
  }
  return balance >= cost;
}

export function isDailyResetDue(
  lastResetAt: Date,
  now: Date,
  timezone: string,
): boolean {
  return ordinalDay(localDay(lastResetAt, timezone)) < ordinalDay(localDay(now, timezone));
}

export function nextLocalMidnight(now: Date, timezone: string): Date {
  const { year, month, day } = localDay(now, timezone);
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

export function buildEnergyState(
  { balance, capacity, tier, timezone }: EnergyStateInput,
  now: Date,
): EnergyStateDto {
  return {
    balance,
    capacity,
    tier,
    resetsAt: nextLocalMidnight(now, timezone).toISOString(),
    canStartFull: canAfford({ tier, balance, cost: energyCost(SessionMode.FULL) }),
    canStartAxis: canAfford({
      tier,
      balance,
      cost: energyCost(SessionMode.TARGETED),
    }),
  };
}

function ordinalDay({ year, month, day }: CalendarDay): number {
  return year * 10000 + month * 100 + day;
}

function localDay(date: Date, timezone: string): CalendarDay {
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
