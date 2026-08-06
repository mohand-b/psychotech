import {
  EnergyStateDto,
  SESSION_ENERGY_COST,
  SessionMode,
} from '@psychotech/shared';

interface AffordabilityInput {
  balance: number;
  cost: number;
}

export function energyCost(mode: SessionMode): number {
  return SESSION_ENERGY_COST[mode];
}

export function canAfford({ balance, cost }: AffordabilityInput): boolean {
  return balance >= cost;
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
