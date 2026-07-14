import { SubscriptionTier } from '@psychotech/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SubscriptionsRepository } from './subscriptions.repository';
import { SubscriptionsService } from './subscriptions.service';

const repository = { upsertTier: vi.fn() };
const service = new SubscriptionsService(
  repository as unknown as SubscriptionsRepository,
);

function buildSubscription(overrides: Record<string, unknown> = {}) {
  return {
    id: 'subscription-1',
    userId: 'user-1',
    tier: 'ESSENTIAL',
    status: 'ACTIVE',
    billingPeriod: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    createdAt: new Date('2026-07-01T10:00:00Z'),
    updatedAt: new Date('2026-07-01T10:00:00Z'),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SubscriptionsService', () => {
  it('persists the chosen tier through an upsert and returns the mapped subscription', async () => {
    repository.upsertTier.mockResolvedValue(buildSubscription());

    const dto = await service.changeTier('user-1', SubscriptionTier.ESSENTIAL);

    expect(repository.upsertTier).toHaveBeenCalledWith('user-1', 'ESSENTIAL');
    expect(dto).toEqual({
      tier: SubscriptionTier.ESSENTIAL,
      status: 'ACTIVE',
      billingPeriod: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    });
  });

  it('maps the billing period and period end when present', async () => {
    repository.upsertTier.mockResolvedValue(
      buildSubscription({
        tier: 'UNLIMITED',
        billingPeriod: 'MONTHLY',
        currentPeriodEnd: new Date('2026-08-01T00:00:00Z'),
      }),
    );

    const dto = await service.changeTier('user-1', SubscriptionTier.UNLIMITED);

    expect(dto.tier).toBe(SubscriptionTier.UNLIMITED);
    expect(dto.billingPeriod).toBe('MONTHLY');
    expect(dto.currentPeriodEnd).toBe('2026-08-01T00:00:00.000Z');
  });
});
