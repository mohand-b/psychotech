import {
  ENERGY_CAPACITY,
  ENERGY_PACK_PRICE_EUR,
  ENERGY_PACK_SIZE,
  ENERGY_UNIT_PRICE_EUR,
  SESSION_ENERGY_COST,
} from './energy-rules';
import { SessionMode } from '../enums';

describe('energy rules', () => {
  it('prices the session modes at 5, 1 and 0 energies', () => {
    expect(SESSION_ENERGY_COST[SessionMode.FULL]).toBe(5);
    expect(SESSION_ENERGY_COST[SessionMode.TARGETED]).toBe(1);
    expect(SESSION_ENERGY_COST[SessionMode.TUTORIAL]).toBe(0);
  });

  it('sells a pack of five energies for one euro', () => {
    expect(ENERGY_PACK_SIZE).toBe(ENERGY_CAPACITY);
    expect(ENERGY_UNIT_PRICE_EUR).toBeCloseTo(0.2);
    expect(ENERGY_PACK_PRICE_EUR).toBeCloseTo(1);
  });
});
