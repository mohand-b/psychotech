import { User } from '@prisma/client';
import { Sector, UserProfileDto } from '@psychotech/shared';
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
    createdAt: user.createdAt.toISOString(),
  };
}
