import { registerAs } from '@nestjs/config';
import { EnergyPackId } from '@psychotech/shared';
import { readOptional } from './environment.readers';

export interface BillingConfig {
  enabled: boolean;
  secretKey?: string;
  publishableKey?: string;
  webhookSecret?: string;
  appBaseUrl?: string;
  packPriceIds: Partial<Record<EnergyPackId, string>>;
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
    appBaseUrl: readOptional('APP_PUBLIC_URL') ?? readOptional('CORS_ORIGIN'),
    packPriceIds: {
      [EnergyPackId.DISCOVERY]: readOptional('STRIPE_PRICE_PACK_DISCOVERY'),
      [EnergyPackId.PRE_EXAM]: readOptional('STRIPE_PRICE_PACK_PRE_EXAM'),
      [EnergyPackId.FULL_PREP]: readOptional('STRIPE_PRICE_PACK_FULL_PREP'),
    },
  };
});
