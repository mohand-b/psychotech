import { BadgeRarity, UserBadge } from '@prisma/client';
import {
  BADGE_BY_ID,
  BadgeConditionStateDto,
  BadgeDefinition,
  BadgeEvent,
  BadgeFacts,
  BadgeFeedEntryDto,
  BadgeId,
  BadgeStatusDto,
  EarnedBadgeDto,
  GuideId,
  Sector,
} from '@psychotech/shared';
import { mapEnumValue } from '../common/enum.util';
import { RecentEarnedBadge } from './badges.repository';

export const FEED_ANONYMOUS_LABEL = 'Un candidat';

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

function factsBeforeEvent(
  facts: BadgeFacts,
  event: BadgeEvent,
  readGuide: GuideId | null,
): BadgeFacts {
  switch (event) {
    case BadgeEvent.ACCOUNT_VERIFIED:
      return { ...facts, user: { ...facts.user, accountVerified: false } };
    case BadgeEvent.TUTORIAL_OPENED:
      return { ...facts, user: { ...facts.user, tutorialDiscovered: false } };
    case BadgeEvent.GUIDE_MARKED_READ:
      return {
        ...facts,
        user: {
          ...facts.user,
          examGuideRead:
            readGuide === GuideId.EXAM_GUIDE ? false : facts.user.examGuideRead,
          logicGuideRead:
            readGuide === GuideId.LOGIC_GUIDE
              ? false
              : facts.user.logicGuideRead,
        },
      };
    case BadgeEvent.SESSION_COMPLETED:
      return { ...facts, session: null };
  }
}

export function toEarnedBadgeDto(
  definition: BadgeDefinition,
  earnedAt: Date,
  facts: BadgeFacts,
  event: BadgeEvent,
  readGuide: GuideId | null = null,
): EarnedBadgeDto {
  const before = factsBeforeEvent(facts, event, readGuide);
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

export function toBadgeFeedEntries(
  rows: RecentEarnedBadge[],
): BadgeFeedEntryDto[] {
  const optInLastNamesByFirstName = new Map<string, Set<string>>();
  for (const row of rows) {
    if (row.user.showInFeed) {
      const lastNames =
        optInLastNamesByFirstName.get(row.user.firstName) ?? new Set<string>();
      lastNames.add(row.user.lastName);
      optInLastNamesByFirstName.set(row.user.firstName, lastNames);
    }
  }
  return rows.flatMap((row) => {
    const badgeId = mapEnumValue(BadgeId, row.badgeId);
    if (!BADGE_BY_ID.has(badgeId)) {
      return [];
    }
    let label = FEED_ANONYMOUS_LABEL;
    if (row.user.showInFeed) {
      const duplicated =
        (optInLastNamesByFirstName.get(row.user.firstName)?.size ?? 0) > 1;
      const initial = row.user.lastName.charAt(0).toUpperCase();
      label =
        duplicated && initial
          ? `${row.user.firstName} ${initial}.`
          : row.user.firstName;
    }
    return [
      {
        badgeId,
        sector: mapEnumValue(Sector, row.user.currentSector),
        earnedAt: row.earnedAt.toISOString(),
        label,
      },
    ];
  });
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
