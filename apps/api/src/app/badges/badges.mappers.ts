import { BadgeRarity, UserBadge } from '@prisma/client';
import {
  BadgeConditionStateDto,
  BadgeDefinition,
  BadgeEvent,
  BadgeFacts,
  BadgeStatusDto,
  EarnedBadgeDto,
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

function factsBeforeEvent(facts: BadgeFacts, event: BadgeEvent): BadgeFacts {
  switch (event) {
    case BadgeEvent.ACCOUNT_VERIFIED:
      return { ...facts, user: { ...facts.user, accountVerified: false } };
    case BadgeEvent.TUTORIAL_OPENED:
      return { ...facts, user: { ...facts.user, tutorialDiscovered: false } };
    case BadgeEvent.SESSION_STARTED:
      return { ...facts, user: { ...facts.user, sessionStarted: false } };
    case BadgeEvent.SESSION_COMPLETED:
      return { ...facts, session: null };
  }
}

export function toEarnedBadgeDto(
  definition: BadgeDefinition,
  earnedAt: Date,
  facts: BadgeFacts,
  event: BadgeEvent,
): EarnedBadgeDto {
  const before = factsBeforeEvent(facts, event);
  const single = definition.conditions.length === 1;
  return {
    badgeId: definition.id,
    earnedAt: earnedAt.toISOString(),
    gain: definition.energyReward > 0 ? definition.energyReward : null,
    conditions: definition.conditions.map((condition) => ({
      id: condition.id,
      label: condition.label,
      met: condition.met(facts),
      justValidated:
        single || (condition.met(facts) && !condition.met(before)),
    })),
  };
}

export function toReconciledEarnedBadgeDto(
  definition: BadgeDefinition,
  earnedAt: Date,
): EarnedBadgeDto {
  return {
    badgeId: definition.id,
    earnedAt: earnedAt.toISOString(),
    gain: definition.energyReward > 0 ? definition.energyReward : null,
    conditions: definition.conditions.map((condition) => ({
      id: condition.id,
      label: condition.label,
      met: true,
      justValidated: true,
    })),
  };
}
