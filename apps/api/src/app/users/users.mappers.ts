import { User } from '@prisma/client';
import { Sector, UserProfileDto } from '@psychotech/shared';
import { mapEnumValue } from '../common/enum.util';

export function toUserProfileDto(user: User): UserProfileDto {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    locale: user.locale,
    timezone: user.timezone,
    currentSector: mapEnumValue(Sector, user.currentSector),
    createdAt: user.createdAt.toISOString(),
  };
}
