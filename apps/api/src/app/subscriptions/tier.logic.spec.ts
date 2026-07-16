import { SubscriptionStatus, SubscriptionTier } from '@psychotech/shared';
import { describe, expect, it } from 'vitest';
import { resolveEffectiveTier } from './tier.logic';

describe('resolveEffectiveTier', () => {
  it('grants the subscription tier while active', () => {
    expect(
      resolveEffectiveTier({
        tier: SubscriptionTier.ESSENTIAL,
        status: SubscriptionStatus.ACTIVE,
      }),
    ).toBe(SubscriptionTier.ESSENTIAL);
  });

  it('keeps the subscription tier while past due', () => {
    expect(
      resolveEffectiveTier({
        tier: SubscriptionTier.UNLIMITED,
        status: SubscriptionStatus.PAST_DUE,
      }),
    ).toBe(SubscriptionTier.UNLIMITED);
  });

  it('falls back to the free tier once canceled', () => {
    expect(
      resolveEffectiveTier({
        tier: SubscriptionTier.ESSENTIAL,
        status: SubscriptionStatus.CANCELED,
      }),
    ).toBe(SubscriptionTier.FREE);
  });

  it('falls back to the free tier once expired', () => {
    expect(
      resolveEffectiveTier({
        tier: SubscriptionTier.UNLIMITED,
        status: SubscriptionStatus.EXPIRED,
      }),
    ).toBe(SubscriptionTier.FREE);
  });

  it('falls back to the free tier without a subscription row', () => {
    expect(resolveEffectiveTier(null)).toBe(SubscriptionTier.FREE);
  });
});
