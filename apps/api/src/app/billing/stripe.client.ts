import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { BillingConfig } from '../config/billing.config';

export const STRIPE_CLIENT = Symbol('STRIPE_CLIENT');

export const stripeClientProvider: Provider = {
  provide: STRIPE_CLIENT,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): Stripe | null => {
    const billing = configService.getOrThrow<BillingConfig>('billing');
    return billing.enabled && billing.secretKey
      ? new Stripe(billing.secretKey)
      : null;
  },
};
