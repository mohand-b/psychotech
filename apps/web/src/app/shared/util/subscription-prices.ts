import { PaidTier, SubscriptionTier } from '@psychotech/shared';

export const SUBSCRIPTION_MONTHLY_PRICE_EUR: Record<PaidTier, number> = {
  [SubscriptionTier.ESSENTIAL]: 8.99,
  [SubscriptionTier.UNLIMITED]: 14.99,
};

export function formatEuroAmount(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

export const SUBSCRIPTION_MONTHLY_PRICES: Record<PaidTier, string> = {
  [SubscriptionTier.ESSENTIAL]: formatEuroAmount(
    SUBSCRIPTION_MONTHLY_PRICE_EUR[SubscriptionTier.ESSENTIAL],
  ),
  [SubscriptionTier.UNLIMITED]: formatEuroAmount(
    SUBSCRIPTION_MONTHLY_PRICE_EUR[SubscriptionTier.UNLIMITED],
  ),
};
