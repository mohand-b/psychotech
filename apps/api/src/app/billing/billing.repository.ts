import { Injectable } from '@nestjs/common';
import {
  BillingPeriod,
  Prisma,
  Subscription,
  SubscriptionStatus,
  SubscriptionTier,
  User,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface SubscriptionUpsert {
  stripeSubscriptionId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  pendingTier: SubscriptionTier | null;
}

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

@Injectable()
export class BillingRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserById(userId: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  async findUserIdByStripeCustomerId(
    stripeCustomerId: string,
  ): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { stripeCustomerId },
      select: { id: true },
    });
    return user?.id ?? null;
  }

  async saveStripeCustomerId(
    userId: string,
    stripeCustomerId: string,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId },
    });
  }

  findSubscriptionByUserId(userId: string): Promise<Subscription | null> {
    return this.prisma.subscription.findUnique({ where: { userId } });
  }

  async registerEvent(eventId: string): Promise<boolean> {
    try {
      await this.prisma.stripeEvent.create({ data: { id: eventId } });
      return true;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_VIOLATION
      ) {
        return false;
      }
      throw error;
    }
  }

  async upsertSubscription(
    userId: string,
    data: SubscriptionUpsert,
  ): Promise<void> {
    const values = { ...data, billingPeriod: BillingPeriod.MONTHLY };
    await this.prisma.subscription.upsert({
      where: { userId },
      update: values,
      create: { userId, ...values },
    });
  }
}
