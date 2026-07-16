import { Injectable } from '@nestjs/common';
import { SubscriptionTier as PrismaSubscriptionTier } from '@prisma/client';
import { SubscriptionDto, SubscriptionTier } from '@psychotech/shared';
import { mapEnumValue } from '../common/enum.util';
import { toSubscriptionDto } from './subscription.mappers';
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
    return toSubscriptionDto(subscription);
  }
}
