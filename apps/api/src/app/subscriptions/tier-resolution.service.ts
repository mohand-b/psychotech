import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SubscriptionStatus as DbSubscriptionStatus,
  SubscriptionTier as DbSubscriptionTier,
} from '@prisma/client';
import { SubscriptionStatus, SubscriptionTier } from '@psychotech/shared';
import { mapEnumValue } from '../common/enum.util';
import { BillingConfig } from '../config/billing.config';
import { resolveEffectiveTier } from './tier.logic';

export interface SubscriptionTierSource {
  tier: DbSubscriptionTier;
  status: DbSubscriptionStatus;
}

@Injectable()
export class TierResolutionService {
  private readonly billingEnabled: boolean;

  constructor(configService: ConfigService) {
    this.billingEnabled =
      configService.getOrThrow<BillingConfig>('billing').enabled;
    if (!this.billingEnabled) {
      new Logger(TierResolutionService.name).warn(
        'Stripe billing disabled (missing STRIPE_* variables): every user resolves to the UNLIMITED tier',
      );
    }
  }

  resolve(subscription: SubscriptionTierSource | null): SubscriptionTier {
    if (!this.billingEnabled) {
      return SubscriptionTier.UNLIMITED;
    }
    return resolveEffectiveTier(
      subscription
        ? {
            tier: mapEnumValue(SubscriptionTier, subscription.tier),
            status: mapEnumValue(SubscriptionStatus, subscription.status),
          }
        : null,
    );
  }
}
