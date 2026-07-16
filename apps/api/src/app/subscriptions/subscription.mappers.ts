import { Subscription } from '@prisma/client';
import {
  BillingPeriod,
  SubscriptionDto,
  SubscriptionStatus,
  SubscriptionTier,
} from '@psychotech/shared';
import { mapEnumValue } from '../common/enum.util';

export function toSubscriptionDto(subscription: Subscription): SubscriptionDto {
  return {
    tier: mapEnumValue(SubscriptionTier, subscription.tier),
    status: mapEnumValue(SubscriptionStatus, subscription.status),
    billingPeriod: subscription.billingPeriod
      ? mapEnumValue(BillingPeriod, subscription.billingPeriod)
      : null,
    currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
  };
}
