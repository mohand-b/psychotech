import { Sector, SubscriptionTier, UserProfileDto } from '@psychotech/shared';
import { mapEnumValue } from '../common/enum.util';
import { toSubscriptionDto } from '../subscriptions/subscription.mappers';
import { UserWithSubscription } from './users.repository';

export function toUserProfileDto(
  user: UserWithSubscription,
  effectiveTier: SubscriptionTier,
): UserProfileDto {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    locale: user.locale,
    timezone: user.timezone,
    currentSector: mapEnumValue(Sector, user.currentSector),
    tier: effectiveTier,
    subscription: user.subscription
      ? toSubscriptionDto(user.subscription)
      : null,
    createdAt: user.createdAt.toISOString(),
  };
}
