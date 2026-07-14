import { Injectable } from '@nestjs/common';
import {
  Subscription,
  SubscriptionTier as PrismaSubscriptionTier,
} from '@prisma/client';
import {
  BillingPeriod,
  SubscriptionDto,
  SubscriptionStatus,
  SubscriptionTier,
} from '@psychotech/shared';
import { mapEnumValue } from '../common/enum.util';
import { SubscriptionsRepository } from './subscriptions.repository';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly repository: SubscriptionsRepository) {}

  async changeTier(
    userId: string,
    tier: SubscriptionTier,
  ): Promise<SubscriptionDto> {
    const subscription = await this.repository.upsertTier(
      userId,
      mapEnumValue(PrismaSubscriptionTier, tier),
    );
    return this.toDto(subscription);
  }

  private toDto(subscription: Subscription): SubscriptionDto {
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
}
