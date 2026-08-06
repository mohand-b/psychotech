import { registerAs } from '@nestjs/config';
import { readOptional } from './environment.readers';

export interface BillingConfig {
  enabled: boolean;
  secretKey?: string;
  publishableKey?: string;
  webhookSecret?: string;
}

export const billingConfig = registerAs('billing', (): BillingConfig => {
  const secretKey = readOptional('STRIPE_SECRET_KEY');
  const publishableKey = readOptional('STRIPE_PUBLISHABLE_KEY');
  const webhookSecret = readOptional('STRIPE_WEBHOOK_SECRET');
  return {
    enabled:
      secretKey !== undefined &&
      publishableKey !== undefined &&
      webhookSecret !== undefined,
    secretKey,
    publishableKey,
    webhookSecret,
  };
});
