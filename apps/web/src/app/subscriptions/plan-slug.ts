import { PaidTier, SubscriptionTier } from '@psychotech/shared';

export const PLAN_SLUGS: Record<PaidTier, string> = {
  [SubscriptionTier.ESSENTIAL]: 'essentiel',
  [SubscriptionTier.UNLIMITED]: 'illimite',
};

export function planFromSlug(slug: string | null): PaidTier | null {
  if (slug === PLAN_SLUGS[SubscriptionTier.ESSENTIAL]) {
    return SubscriptionTier.ESSENTIAL;
  }
  if (slug === PLAN_SLUGS[SubscriptionTier.UNLIMITED]) {
    return SubscriptionTier.UNLIMITED;
  }
  return null;
}
