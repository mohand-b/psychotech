import { PaidTier, SubscriptionTier } from '@psychotech/shared';

export const PLAN_LABELS: Record<PaidTier, string> = {
  [SubscriptionTier.ESSENTIAL]: 'Essentiel',
  [SubscriptionTier.UNLIMITED]: 'Illimité',
};
