import {
  EnergyStateDto,
  SESSION_ENERGY_COST,
  SessionMode,
  SubscriptionTier,
} from '@psychotech/shared';
import { localDayNumber, nextLocalMidnight } from '../common/timezone.util';

export { nextLocalMidnight };

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

export function energyCost(mode: SessionMode): number {
  return SESSION_ENERGY_COST[mode];
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
  return localDayNumber(lastResetAt, timezone) < localDayNumber(now, timezone);
}

export function refilledBalance(balance: number, capacity: number): number {
  return Math.max(balance, capacity);
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
