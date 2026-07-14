import { Injectable } from '@nestjs/common';
import { Subscription, SubscriptionTier } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubscriptionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  upsertTier(userId: string, tier: SubscriptionTier): Promise<Subscription> {
    return this.prisma.subscription.upsert({
      where: { userId },
      update: { tier },
      create: { userId, tier },
    });
  }
}
