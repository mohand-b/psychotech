import { SubscriptionTier } from '@psychotech/shared';

export const PLAN_LABELS: Record<SubscriptionTier, string> = {
  [SubscriptionTier.FREE]: 'Découverte',
  [SubscriptionTier.ESSENTIAL]: 'Essentiel',
  [SubscriptionTier.UNLIMITED]: 'Illimité',
};
