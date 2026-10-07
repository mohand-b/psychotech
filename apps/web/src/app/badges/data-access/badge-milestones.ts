import {
  AxisType,
  BADGE_BY_ID,
  BADGE_CATALOG,
  BadgeDefinition,
  BadgeStatusDto,
  findAxisScoreTarget,
} from '@psychotech/shared';

export interface EarnedBadgeMilestone {
  definition: BadgeDefinition;
  earnedAt: string;
}

export interface ScoreTierMilestone {
  definition: BadgeDefinition;
  target: number;
  bestScore: number;
  gap: number;
}

export function listLatestEarnedBadges(
  statuses: readonly BadgeStatusDto[],
  count: number,
): EarnedBadgeMilestone[] {
  return statuses
    .flatMap((status) => {
      const definition = BADGE_BY_ID.get(status.badgeId);
      return definition && status.earnedAt !== null
        ? [{ definition, earnedAt: status.earnedAt }]
        : [];
    })
    .sort(
      (first, second) =>
        Date.parse(second.earnedAt) - Date.parse(first.earnedAt),
    )
    .slice(0, count);
}

export function findNextScoreTier(
  statuses: readonly BadgeStatusDto[],
  bestScores: Partial<Record<AxisType, number>>,
): ScoreTierMilestone | null {
  const earnedIds = new Set(
    statuses
      .filter((status) => status.earnedAt !== null)
      .map((status) => status.badgeId),
  );
  let next: ScoreTierMilestone | null = null;
  for (const definition of BADGE_CATALOG) {
    const target = findAxisScoreTarget(definition);
    const bestScore =
      definition.axis === null ? undefined : bestScores[definition.axis];
    if (
      target === null ||
      bestScore === undefined ||
      earnedIds.has(definition.id)
    ) {
      continue;
    }
    const gap = target - bestScore;
    if (gap > 0 && (next === null || gap < next.gap)) {
      next = { definition, target, bestScore, gap };
    }
  }
  return next;
}
