import { SessionMode } from '@psychotech/shared';
import { describe, expect, it } from 'vitest';
import {
  buildEnergyState,
  canAfford,
  energyCost,
  isGiftCodeExhausted,
} from './energy.logic';

describe('energyCost', () => {
  it('costs 5 for a full session, 1 for a targeted axis and 0 for a tutorial', () => {
    expect(energyCost(SessionMode.FULL)).toBe(5);
    expect(energyCost(SessionMode.TARGETED)).toBe(1);
    expect(energyCost(SessionMode.TUTORIAL)).toBe(0);
  });
});

describe('canAfford', () => {
  it('compares balance against cost', () => {
    expect(canAfford({ balance: 5, cost: 5 })).toBe(true);
    expect(canAfford({ balance: 4, cost: 5 })).toBe(false);
    expect(canAfford({ balance: 1, cost: 1 })).toBe(true);
    expect(canAfford({ balance: 0, cost: 1 })).toBe(false);
  });

  it('always affords zero-cost tutorials', () => {
    expect(canAfford({ balance: 0, cost: 0 })).toBe(true);
  });
});

describe('isGiftCodeExhausted', () => {
  it('exhausts a limited code once its redemptions reach the limit', () => {
    expect(isGiftCodeExhausted({ maxRedemptions: 1, redemptionCount: 0 })).toBe(
      false,
    );
    expect(isGiftCodeExhausted({ maxRedemptions: 1, redemptionCount: 1 })).toBe(
      true,
    );
  });

  it('never exhausts a code without redemption limit', () => {
    expect(
      isGiftCodeExhausted({ maxRedemptions: null, redemptionCount: 10_000 }),
    ).toBe(false);
  });
});

describe('buildEnergyState', () => {
  it('allows starts according to the balance', () => {
    const full = buildEnergyState(5);
    expect(full.canStartFull).toBe(true);
    expect(full.canStartAxis).toBe(true);

    const depleted = buildEnergyState(0);
    expect(depleted.canStartFull).toBe(false);
    expect(depleted.canStartAxis).toBe(false);
  });

  it('blocks a full start when only an axis is affordable', () => {
    const state = buildEnergyState(4);
    expect(state.canStartFull).toBe(false);
    expect(state.canStartAxis).toBe(true);
  });

  it('carries an unbounded purchased balance', () => {
    expect(buildEnergyState(120).balance).toBe(120);
  });
});
