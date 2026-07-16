import { SubscriptionTier } from '../enums';

export type PaidTier = Exclude<SubscriptionTier, SubscriptionTier.FREE>;

export interface CreateCheckoutSessionDto {
  plan: PaidTier;
}

export interface BillingRedirectDto {
  url: string;
}
