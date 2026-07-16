import { PaidTier, SubscriptionTier } from '@psychotech/shared';

export const SUBSCRIPTION_MONTHLY_PRICES: Record<PaidTier, string> = {
  [SubscriptionTier.ESSENTIAL]: '8,99',
  [SubscriptionTier.UNLIMITED]: '14,99',
};
