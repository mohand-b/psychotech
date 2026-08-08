import { Sector, UserProfileDto } from '@psychotech/shared';
import { User } from '@prisma/client';
import { mapEnumValue } from '../common/enum.util';

export function toUserProfileDto(user: User): UserProfileDto {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    locale: user.locale,
    timezone: user.timezone,
    currentSector: mapEnumValue(Sector, user.currentSector),
    showInFeed: user.showInFeed,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}
