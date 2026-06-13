import { SessionMode, SubscriptionTier } from '@psychotech/shared';
import { describe, expect, it } from 'vitest';
import {
  buildEnergyState,
  canAfford,
  energyCost,
  isDailyResetDue,
  nextLocalMidnight,
} from './energy.logic';

describe('energyCost', () => {
  it('costs 5 for a full session, 1 for a targeted axis and 0 for a tutorial', () => {
    expect(energyCost(SessionMode.FULL)).toBe(5);
    expect(energyCost(SessionMode.TARGETED)).toBe(1);
    expect(energyCost(SessionMode.TUTORIAL)).toBe(0);
  });
});

describe('canAfford', () => {
  it('always grants access for the unlimited tier whatever the balance', () => {
    expect(canAfford({ tier: SubscriptionTier.UNLIMITED, balance: 0, cost: 5 })).toBe(true);
  });

  it('restricts the free tier to zero-cost tutorials', () => {
    expect(canAfford({ tier: SubscriptionTier.FREE, balance: 5, cost: 0 })).toBe(true);
    expect(canAfford({ tier: SubscriptionTier.FREE, balance: 5, cost: 1 })).toBe(false);
    expect(canAfford({ tier: SubscriptionTier.FREE, balance: 5, cost: 5 })).toBe(false);
  });

  it('compares balance against cost for the essential tier', () => {
    expect(canAfford({ tier: SubscriptionTier.ESSENTIAL, balance: 5, cost: 5 })).toBe(true);
    expect(canAfford({ tier: SubscriptionTier.ESSENTIAL, balance: 4, cost: 5 })).toBe(false);
    expect(canAfford({ tier: SubscriptionTier.ESSENTIAL, balance: 1, cost: 1 })).toBe(true);
    expect(canAfford({ tier: SubscriptionTier.ESSENTIAL, balance: 0, cost: 1 })).toBe(false);
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

  it('blocks full and axis starts for the free tier', () => {
    const state = buildEnergyState(
      { balance: 5, capacity: 5, tier: SubscriptionTier.FREE, timezone: 'Europe/Paris' },
      now,
    );
    expect(state.canStartFull).toBe(false);
    expect(state.canStartAxis).toBe(false);
    expect(state.resetsAt).toBe('2026-06-13T22:00:00.000Z');
  });

  it('allows starts for the essential tier according to the balance', () => {
    const full = buildEnergyState(
      { balance: 5, capacity: 5, tier: SubscriptionTier.ESSENTIAL, timezone: 'UTC' },
      now,
    );
    expect(full.canStartFull).toBe(true);
    expect(full.canStartAxis).toBe(true);

    const depleted = buildEnergyState(
      { balance: 0, capacity: 5, tier: SubscriptionTier.ESSENTIAL, timezone: 'UTC' },
      now,
    );
    expect(depleted.canStartFull).toBe(false);
    expect(depleted.canStartAxis).toBe(false);
  });

  it('allows every start for the unlimited tier', () => {
    const state = buildEnergyState(
      { balance: 0, capacity: 5, tier: SubscriptionTier.UNLIMITED, timezone: 'UTC' },
      now,
    );
    expect(state.canStartFull).toBe(true);
    expect(state.canStartAxis).toBe(true);
  });
});
