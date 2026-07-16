import { registerAs } from '@nestjs/config';
import { readOptional } from './environment.readers';

export interface BillingConfig {
  enabled: boolean;
  secretKey?: string;
  webhookSecret?: string;
  priceEssential?: string;
  priceUnlimited?: string;
}

export const billingConfig = registerAs('billing', (): BillingConfig => {
  const secretKey = readOptional('STRIPE_SECRET_KEY');
  const webhookSecret = readOptional('STRIPE_WEBHOOK_SECRET');
  const priceEssential = readOptional('STRIPE_PRICE_ESSENTIAL');
  const priceUnlimited = readOptional('STRIPE_PRICE_UNLIMITED');
  return {
    enabled:
      secretKey !== undefined &&
      webhookSecret !== undefined &&
      priceEssential !== undefined &&
      priceUnlimited !== undefined,
    secretKey,
    webhookSecret,
    priceEssential,
    priceUnlimited,
  };
});
