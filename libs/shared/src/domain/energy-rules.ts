import { SessionMode } from '../enums';

export const ENERGY_CAPACITY = 5;

export const ENERGY_UNIT_PRICE_EUR = 0.2;

export const SESSION_ENERGY_COST: Record<SessionMode, number> = {
  [SessionMode.FULL]: 5,
  [SessionMode.TARGETED]: 1,
  [SessionMode.TUTORIAL]: 0,
};

export const ENERGY_INSUFFICIENT_ERROR_CODE = 'ENERGY_INSUFFICIENT';

export function energyTopUpQuantity(balance: number): number {
  return Math.max(0, ENERGY_CAPACITY - Math.max(0, balance));
}

export function energyTopUpPriceEur(balance: number): number {
  return energyTopUpQuantity(balance) * ENERGY_UNIT_PRICE_EUR;
}
