import { Badge } from '@prisma/client';
import { BadgeCategory, BadgeDto, BadgeStatusDto } from '@psychotech/shared';
import { mapEnumValue } from '../common/enum.util';

export function toBadgeDto(badge: Badge): BadgeDto {
  return {
    code: badge.code,
    name: badge.name,
    description: badge.description,
    category: mapEnumValue(BadgeCategory, badge.category),
    icon: badge.icon,
  };
}

export function buildBadgeCollection(
  catalog: Badge[],
  unlockDates: Map<string, Date>,
): BadgeStatusDto[] {
  return catalog.map((badge) => {
    const unlockedAt = unlockDates.get(badge.code);
    return {
      badge: toBadgeDto(badge),
      unlocked: unlockedAt !== undefined,
      unlockedAt: unlockedAt ? unlockedAt.toISOString() : null,
    };
  });
}
