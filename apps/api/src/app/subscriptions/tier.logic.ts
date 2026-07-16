import { SubscriptionStatus, SubscriptionTier } from '@psychotech/shared';

export interface EffectiveTierInput {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
}

export function resolveEffectiveTier(
  subscription: EffectiveTierInput | null,
): SubscriptionTier {
  if (!subscription) {
    return SubscriptionTier.FREE;
  }
  if (
    subscription.status === SubscriptionStatus.ACTIVE ||
    subscription.status === SubscriptionStatus.PAST_DUE
  ) {
    return subscription.tier;
  }
  return SubscriptionTier.FREE;
}
