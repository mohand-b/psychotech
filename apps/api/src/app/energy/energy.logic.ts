import {
  EnergyStateDto,
  SessionMode,
  SubscriptionTier,
} from '@psychotech/shared';
import { localDayNumber, nextLocalMidnight } from '../common/timezone.util';

export { nextLocalMidnight };

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
  return localDayNumber(lastResetAt, timezone) < localDayNumber(now, timezone);
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
