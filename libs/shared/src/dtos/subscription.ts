import { BillingPeriod, SubscriptionStatus, SubscriptionTier } from '../enums';
import { PaidTier } from './billing';

export interface SubscriptionDto {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  billingPeriod: BillingPeriod | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  pendingTier: PaidTier | null;
}
