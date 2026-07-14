import { BillingPeriod, SubscriptionStatus, SubscriptionTier } from '../enums';

export interface SubscriptionDto {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  billingPeriod: BillingPeriod | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface UpdateSubscriptionDto {
  tier: SubscriptionTier;
}
