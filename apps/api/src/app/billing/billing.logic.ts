import {
  SubscriptionStatus as DbSubscriptionStatus,
  SubscriptionTier as DbSubscriptionTier,
} from '@prisma/client';
import { PaidTier, SubscriptionTier } from '@psychotech/shared';

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
