import { SubscriptionTier } from '../enums';

export type PaidTier = Exclude<SubscriptionTier, SubscriptionTier.FREE>;

export interface CreateSubscriptionDto {
  plan: PaidTier;
  promotionCode?: string;
}

export interface ChangeSubscriptionPlanDto {
  plan: PaidTier;
}

export interface BillingConfigDto {
  publishableKey: string;
}

export enum PaymentIntentKind {
  PAYMENT = 'PAYMENT',
  SETUP = 'SETUP',
}

export interface SubscriptionPaymentDto {
  clientSecret: string;
  kind: PaymentIntentKind;
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
