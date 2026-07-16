import {
  SubscriptionStatus as DbSubscriptionStatus,
  SubscriptionTier as DbSubscriptionTier,
} from '@prisma/client';
import { SubscriptionTier } from '@psychotech/shared';
import { describe, expect, it } from 'vitest';
import {
  mapStripeSubscriptionStatus,
  priceForPlan,
  tierForPrice,
} from './billing.logic';

const CATALOG = {
  priceEssential: 'price_essential',
  priceUnlimited: 'price_unlimited',
};

describe('mapStripeSubscriptionStatus', () => {
  it('maps active and trialing to an active subscription', () => {
    expect(mapStripeSubscriptionStatus('active')).toBe(
      DbSubscriptionStatus.ACTIVE,
    );
    expect(mapStripeSubscriptionStatus('trialing')).toBe(
      DbSubscriptionStatus.ACTIVE,
    );
  });

  it('keeps past_due as its own status', () => {
    expect(mapStripeSubscriptionStatus('past_due')).toBe(
      DbSubscriptionStatus.PAST_DUE,
    );
  });

  it('maps canceled to canceled', () => {
    expect(mapStripeSubscriptionStatus('canceled')).toBe(
      DbSubscriptionStatus.CANCELED,
    );
  });

  it('maps unpaid, incomplete states and unknown statuses to expired', () => {
    expect(mapStripeSubscriptionStatus('unpaid')).toBe(
      DbSubscriptionStatus.EXPIRED,
    );
    expect(mapStripeSubscriptionStatus('incomplete_expired')).toBe(
      DbSubscriptionStatus.EXPIRED,
    );
    expect(mapStripeSubscriptionStatus('something_new')).toBe(
      DbSubscriptionStatus.EXPIRED,
    );
  });
});

describe('tierForPrice', () => {
  it('maps each configured price to its tier', () => {
    expect(tierForPrice('price_essential', CATALOG)).toBe(
      DbSubscriptionTier.ESSENTIAL,
    );
    expect(tierForPrice('price_unlimited', CATALOG)).toBe(
      DbSubscriptionTier.UNLIMITED,
    );
  });

  it('returns null for an unknown price', () => {
    expect(tierForPrice('price_other', CATALOG)).toBeNull();
  });
});

describe('priceForPlan', () => {
  it('returns the configured price for each paid plan', () => {
    expect(priceForPlan(SubscriptionTier.ESSENTIAL, CATALOG)).toBe(
      'price_essential',
    );
    expect(priceForPlan(SubscriptionTier.UNLIMITED, CATALOG)).toBe(
      'price_unlimited',
    );
  });
});
