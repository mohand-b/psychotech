import { SessionMode } from '@psychotech/shared';
import { describe, expect, it } from 'vitest';
import {
  buildEnergyState,
  canAfford,
  energyCost,
  isDailyResetDue,
  nextLocalMidnight,
  refilledBalance,
} from './energy.logic';

describe('energyCost', () => {
  it('costs 5 for a full session, 1 for a targeted axis and 0 for a tutorial', () => {
    expect(energyCost(SessionMode.FULL)).toBe(5);
    expect(energyCost(SessionMode.TARGETED)).toBe(1);
    expect(energyCost(SessionMode.TUTORIAL)).toBe(0);
  });
});

describe('refilledBalance', () => {
  it('refills a low balance to capacity', () => {
    expect(refilledBalance(2, 5)).toBe(5);
    expect(refilledBalance(0, 5)).toBe(5);
  });

  it('never clamps a balance already above capacity', () => {
    expect(refilledBalance(7, 5)).toBe(7);
    expect(refilledBalance(5, 5)).toBe(5);
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

describe('isDailyResetDue', () => {
  it('is due when the local day changed in the user timezone', () => {
    const lastResetAt = new Date('2026-06-13T21:30:00Z');
    const now = new Date('2026-06-13T22:30:00Z');
    expect(isDailyResetDue(lastResetAt, now, 'Europe/Paris')).toBe(true);
  });

  it('is not due within the same local day in the user timezone', () => {
    const lastResetAt = new Date('2026-06-13T21:30:00Z');
    const now = new Date('2026-06-13T21:45:00Z');
    expect(isDailyResetDue(lastResetAt, now, 'Europe/Paris')).toBe(false);
  });

  it('depends on the timezone for the same instants', () => {
    const lastResetAt = new Date('2026-06-13T21:30:00Z');
    const now = new Date('2026-06-13T22:30:00Z');
    expect(isDailyResetDue(lastResetAt, now, 'UTC')).toBe(false);
  });

  it('handles timezones behind UTC', () => {
    const lastResetAt = new Date('2026-06-13T03:00:00Z');
    const now = new Date('2026-06-13T05:00:00Z');
    expect(isDailyResetDue(lastResetAt, now, 'America/New_York')).toBe(true);
    expect(isDailyResetDue(lastResetAt, now, 'UTC')).toBe(false);
  });
});

describe('nextLocalMidnight', () => {
  it('returns the next local midnight as a UTC instant for a positive offset', () => {
    const now = new Date('2026-06-13T10:00:00Z');
    expect(nextLocalMidnight(now, 'Europe/Paris').toISOString()).toBe('2026-06-13T22:00:00.000Z');
  });

  it('returns the next local midnight for UTC', () => {
    const now = new Date('2026-06-13T10:00:00Z');
    expect(nextLocalMidnight(now, 'UTC').toISOString()).toBe('2026-06-14T00:00:00.000Z');
  });

  it('returns the next local midnight as a UTC instant for a negative offset', () => {
    const now = new Date('2026-06-13T10:00:00Z');
    expect(nextLocalMidnight(now, 'America/New_York').toISOString()).toBe('2026-06-14T04:00:00.000Z');
  });
});

describe('buildEnergyState', () => {
  const now = new Date('2026-06-13T10:00:00Z');

  it('allows starts according to the balance', () => {
    const full = buildEnergyState(
      { balance: 5, capacity: 5, timezone: 'UTC' },
      now,
    );
    expect(full.canStartFull).toBe(true);
    expect(full.canStartAxis).toBe(true);

    const depleted = buildEnergyState(
      { balance: 0, capacity: 5, timezone: 'UTC' },
      now,
    );
    expect(depleted.canStartFull).toBe(false);
    expect(depleted.canStartAxis).toBe(false);
  });

  it('blocks a full start when only an axis is affordable', () => {
    const state = buildEnergyState(
      { balance: 4, capacity: 5, timezone: 'Europe/Paris' },
      now,
    );
    expect(state.canStartFull).toBe(false);
    expect(state.canStartAxis).toBe(true);
    expect(state.resetsAt).toBe('2026-06-13T22:00:00.000Z');
  });
});
