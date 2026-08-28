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
    examGuideReadAt: user.examGuideReadAt?.toISOString() ?? null,
    logicGuideReadAt: user.logicGuideReadAt?.toISOString() ?? null,
    pendingEmail: user.pendingEmail,
    passwordChangedAt: user.passwordChangedAt?.toISOString() ?? null,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}
