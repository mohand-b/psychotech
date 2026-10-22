import {
  EnergyStateDto,
  SESSION_ENERGY_COST,
  SessionMode,
} from '@psychotech/shared';

interface AffordabilityInput {
  balance: number;
  cost: number;
}

export interface GiftCodeUsage {
  maxRedemptions: number | null;
  redemptionCount: number;
}

export function energyCost(mode: SessionMode): number {
  return SESSION_ENERGY_COST[mode];
}

export function canAfford({ balance, cost }: AffordabilityInput): boolean {
  return balance >= cost;
}

export function isGiftCodeExhausted({
  maxRedemptions,
  redemptionCount,
}: GiftCodeUsage): boolean {
  return maxRedemptions !== null && redemptionCount >= maxRedemptions;
}

export function buildEnergyState(balance: number): EnergyStateDto {
  return {
    balance,
    canStartFull: canAfford({ balance, cost: energyCost(SessionMode.FULL) }),
    canStartAxis: canAfford({
      balance,
      cost: energyCost(SessionMode.TARGETED),
    }),
  };
}
