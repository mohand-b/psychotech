import {
  ENERGY_CAPACITY,
  ENERGY_UNIT_PRICE_EUR,
  SESSION_ENERGY_COST,
  energyTopUpPriceEur,
  energyTopUpQuantity,
} from './energy-rules';
import { SessionMode } from '../enums';

describe('energy rules', () => {
  it('prices the session modes at 5, 1 and 0 energies', () => {
    expect(SESSION_ENERGY_COST[SessionMode.FULL]).toBe(5);
    expect(SESSION_ENERGY_COST[SessionMode.TARGETED]).toBe(1);
    expect(SESSION_ENERGY_COST[SessionMode.TUTORIAL]).toBe(0);
  });

  it('tops up only the missing energies', () => {
    expect(energyTopUpQuantity(0)).toBe(ENERGY_CAPACITY);
    expect(energyTopUpQuantity(3)).toBe(2);
    expect(energyTopUpQuantity(5)).toBe(0);
    expect(energyTopUpQuantity(7)).toBe(0);
    expect(energyTopUpQuantity(-1)).toBe(ENERGY_CAPACITY);
  });

  it('prices the top-up at twenty cents per energy', () => {
    expect(energyTopUpPriceEur(0)).toBeCloseTo(ENERGY_CAPACITY * ENERGY_UNIT_PRICE_EUR);
    expect(energyTopUpPriceEur(3)).toBeCloseTo(0.4);
    expect(energyTopUpPriceEur(5)).toBe(0);
  });
});
