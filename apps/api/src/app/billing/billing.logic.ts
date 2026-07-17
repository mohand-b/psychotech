import {
  SubscriptionStatus as DbSubscriptionStatus,
  SubscriptionTier as DbSubscriptionTier,
} from '@prisma/client';
import {
  PaidTier,
  PromotionCodeDto,
  PromotionDuration,
  SubscriptionTier,
} from '@psychotech/shared';

export interface PriceCatalog {
  priceEssential: string;
  priceUnlimited: string;
}

const DB_STATUS_BY_STRIPE: Record<string, DbSubscriptionStatus> = {
  active: DbSubscriptionStatus.ACTIVE,
  trialing: DbSubscriptionStatus.ACTIVE,
  past_due: DbSubscriptionStatus.PAST_DUE,
  canceled: DbSubscriptionStatus.CANCELED,
  unpaid: DbSubscriptionStatus.EXPIRED,
  incomplete: DbSubscriptionStatus.EXPIRED,
  incomplete_expired: DbSubscriptionStatus.EXPIRED,
  paused: DbSubscriptionStatus.EXPIRED,
};

export function mapStripeSubscriptionStatus(
  stripeStatus: string,
): DbSubscriptionStatus {
  return DB_STATUS_BY_STRIPE[stripeStatus] ?? DbSubscriptionStatus.EXPIRED;
}

export function tierForPrice(
  priceId: string,
  catalog: PriceCatalog,
): DbSubscriptionTier | null {
  if (priceId === catalog.priceEssential) {
    return DbSubscriptionTier.ESSENTIAL;
  }
  if (priceId === catalog.priceUnlimited) {
    return DbSubscriptionTier.UNLIMITED;
  }
  return null;
}

export function priceForPlan(plan: PaidTier, catalog: PriceCatalog): string {
  return plan === SubscriptionTier.ESSENTIAL
    ? catalog.priceEssential
    : catalog.priceUnlimited;
}

export interface PromotionCoupon {
  percent_off: number | null;
  amount_off: number | null;
  currency: string | null;
  duration: 'once' | 'repeating' | 'forever';
  duration_in_months: number | null;
}

const PROMOTION_DURATION_BY_STRIPE: Record<
  PromotionCoupon['duration'],
  PromotionDuration
> = {
  once: PromotionDuration.ONCE,
  repeating: PromotionDuration.REPEATING,
  forever: PromotionDuration.FOREVER,
};

export function toPromotionCodeDto(
  code: string,
  coupon: PromotionCoupon,
): PromotionCodeDto {
  return {
    code,
    percentOff: coupon.percent_off,
    amountOff: coupon.amount_off,
    currency: coupon.currency,
    duration: PROMOTION_DURATION_BY_STRIPE[coupon.duration],
    durationInMonths: coupon.duration_in_months,
  };
}
