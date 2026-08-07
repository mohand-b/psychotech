import { BadgeRarity, UserBadge } from '@prisma/client';
import {
  BadgeConditionStateDto,
  BadgeDefinition,
  BadgeFacts,
  BadgeStatusDto,
} from '@psychotech/shared';

export function toBadgeStatusDto(
  definition: BadgeDefinition,
  earned: UserBadge | null,
  rarity: BadgeRarity | null,
  facts: BadgeFacts | null,
): BadgeStatusDto {
  const conditions: BadgeConditionStateDto[] = definition.conditions.map(
    (condition) => ({
      id: condition.id,
      label: condition.label,
      met: earned !== null || (facts !== null && condition.met(facts)),
    }),
  );
  return {
    badgeId: definition.id,
    earnedAt: earned?.earnedAt.toISOString() ?? null,
    acknowledgedAt: earned?.acknowledgedAt?.toISOString() ?? null,
    conditions,
    rarityPercent: rarityPercent(rarity),
  };
}

function rarityPercent(rarity: BadgeRarity | null): number | null {
  if (!rarity || rarity.eligibleCount === 0) {
    return null;
  }
  return Math.round((rarity.earnedCount / rarity.eligibleCount) * 100);
}
