import {
  EnergyStateDto,
  SESSION_ENERGY_COST,
  SessionMode,
} from '@psychotech/shared';
import { localDayNumber, nextLocalMidnight } from '../common/timezone.util';

export { nextLocalMidnight };

interface AffordabilityInput {
  balance: number;
  cost: number;
}

interface EnergyStateInput {
  balance: number;
  capacity: number;
  timezone: string;
}

export function energyCost(mode: SessionMode): number {
  return SESSION_ENERGY_COST[mode];
}

export function canAfford({ balance, cost }: AffordabilityInput): boolean {
  return balance >= cost;
}

export function isDailyResetDue(
  lastResetAt: Date,
  now: Date,
  timezone: string,
): boolean {
  return localDayNumber(lastResetAt, timezone) < localDayNumber(now, timezone);
}

export function refilledBalance(balance: number, capacity: number): number {
  return Math.max(balance, capacity);
}

export function buildEnergyState(
  { balance, capacity, timezone }: EnergyStateInput,
  now: Date,
): EnergyStateDto {
  return {
    balance,
    capacity,
    resetsAt: nextLocalMidnight(now, timezone).toISOString(),
    canStartFull: canAfford({ balance, cost: energyCost(SessionMode.FULL) }),
    canStartAxis: canAfford({
      balance,
      cost: energyCost(SessionMode.TARGETED),
    }),
  };
}
