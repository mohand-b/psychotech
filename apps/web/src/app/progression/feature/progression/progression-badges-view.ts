import {
  AxisType,
  BADGE_CATALOG,
  BadgeId,
  BadgeStatusDto,
  Sector,
  badgeAssetPath,
  badgeDisplayName,
  roundToTenth,
} from '@psychotech/shared';
import {
  buildBadgeKindLabel,
  buildBadgeTierLabel,
  computeDisplayedEnergyGain,
  isGoldBadge,
  sumEarnedBadgeRewards,
} from '../../../badges/data-access/badge-display';
import {
  findNextScoreTier,
  listLatestEarnedBadges,
} from '../../../badges/data-access/badge-milestones';
import { formatFrenchNumber } from '../../../shared/util/format-number';
import { formatElapsedDaysLabel } from '../../../shared/util/format-relative-time';

const LATEST_BADGES_COUNT = 3;
const PLURAL_FROM = 2;
const PERCENT = 100;

export interface ProgressionBadgeLineView {
  badgeId: BadgeId;
  assetPath: string;
  name: string;
  kindLabel: string;
  elapsedLabel: string;
  gold: boolean;
}

export interface ProgressionNextTierView {
  assetPath: string;
  label: string;
  gain: number | null;
  targetLabel: string;
  bestLabel: string;
  gapLabel: string;
  gapUnit: string;
}

export interface ProgressionBadgesView {
  earnedCount: number;
  total: number;
  progressPercent: number;
  creditsEarned: number;
  creditsEarnedLabel: string;
  latest: ProgressionBadgeLineView[];
  nextTier: ProgressionNextTierView | null;
}

function formatScoreLabel(score: number): string {
  return formatFrenchNumber(roundToTenth(score));
}

function formatGapUnit(gap: number): string {
  return roundToTenth(gap) >= PLURAL_FROM ? 'pts' : 'pt';
}

function formatCreditsEarnedLabel(credits: number): string {
  return credits >= PLURAL_FROM ? 'gagnés' : 'gagné';
}

export function buildProgressionBadgesView(
  statuses: readonly BadgeStatusDto[],
  bestScores: Partial<Record<AxisType, number>>,
  sector: Sector,
  now: Date,
): ProgressionBadgesView {
  const earnedCount = statuses.filter(
    (status) => status.earnedAt !== null,
  ).length;
  const total = BADGE_CATALOG.length;
  const next = findNextScoreTier(statuses, bestScores);
  const creditsEarned = sumEarnedBadgeRewards(statuses);
  return {
    earnedCount,
    total,
    progressPercent: Math.round((earnedCount / total) * PERCENT),
    creditsEarned,
    creditsEarnedLabel: formatCreditsEarnedLabel(creditsEarned),
    latest: listLatestEarnedBadges(statuses, LATEST_BADGES_COUNT).map(
      ({ definition, earnedAt }) => ({
        badgeId: definition.id,
        assetPath: badgeAssetPath(definition, sector),
        name: badgeDisplayName(definition, sector),
        kindLabel: buildBadgeKindLabel(definition),
        elapsedLabel: formatElapsedDaysLabel(earnedAt, now),
        gold: isGoldBadge(definition),
      }),
    ),
    nextTier: next
      ? {
          assetPath: badgeAssetPath(next.definition, sector),
          label: buildBadgeTierLabel(next.definition, 'short'),
          gain: computeDisplayedEnergyGain(next.definition.energyReward),
          targetLabel: formatScoreLabel(next.target),
          bestLabel: formatScoreLabel(next.bestScore),
          gapLabel: formatScoreLabel(next.gap),
          gapUnit: formatGapUnit(next.gap),
        }
      : null,
  };
}
