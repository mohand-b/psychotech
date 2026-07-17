import { SubscriptionTier } from '../enums';

export type PaidTier = Exclude<SubscriptionTier, SubscriptionTier.FREE>;

export interface CreateCheckoutSessionDto {
  plan: PaidTier;
  promotionCode?: string;
}

export interface BillingRedirectDto {
  url: string;
}

export enum PromotionDuration {
  ONCE = 'ONCE',
  REPEATING = 'REPEATING',
  FOREVER = 'FOREVER',
}

export interface PromotionCodeDto {
  code: string;
  percentOff: number | null;
  amountOff: number | null;
  currency: string | null;
  duration: PromotionDuration;
  durationInMonths: number | null;
}
