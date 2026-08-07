import {
  AXIS_META,
  AxisType,
  BADGE_CATALOG,
  BadgeDefinition,
  BadgeFamily,
  BadgeStatusDto,
  BadgeTier,
  Sector,
  badgeAssetPath,
  badgeDisplayName,
} from '@psychotech/shared';
import { energyGain } from '../../data-access/badge-display';
import {
  BadgeConditionView,
  BadgeTierStepView,
  TieredBadgeCardView,
  TransverseBadgeView,
} from '../../ui/badge-views';

interface BadgeEntry {
  definition: BadgeDefinition;
  name: string;
  assetPath: string;
  earned: boolean;
  dateLabel: string | null;
  rarityLabel: string | null;
  conditions: BadgeConditionView[];
  metCount: number;
}

export interface ClosestBadgeView {
  name: string;
  assetPath: string;
  hint: string;
  gain: number | null;
}

export interface BadgesSummaryView {
  earnedCount: number;
  total: number;
  progressPercent: number;
  energyEarned: number;
  energyRemaining: number;
  closest: ClosestBadgeView | null;
}

export interface BadgeBoardView {
  axisCards: TieredBadgeCardView[];
  examCard: TieredBadgeCardView;
  transverse: TransverseBadgeView[];
  summary: BadgesSummaryView;
}

const TIER_LABELS: Record<BadgeTier, string> = {
  [BadgeTier.BRONZE]: 'Bronze',
  [BadgeTier.SILVER]: 'Argent',
  [BadgeTier.GOLD]: 'Or',
};

const TIER_COLOR_VARS: Record<BadgeTier, string> = {
  [BadgeTier.BRONZE]: 'var(--badge-bronze)',
  [BadgeTier.SILVER]: 'var(--badge-argent)',
  [BadgeTier.GOLD]: 'var(--badge-or)',
};

const CONDITION_COUNT_INTROS: Record<number, string> = {
  2: 'Deux conditions :',
  3: 'Trois conditions :',
};

export const EXAM_CARD_LABEL = 'Les cinq axes enchaînés';

function formatEarnedDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function buildEntry(
  definition: BadgeDefinition,
  status: BadgeStatusDto | null,
  sector: Sector,
): BadgeEntry {
  const conditions: BadgeConditionView[] = status
    ? status.conditions.map(({ label, met }) => ({ label, met }))
    : definition.conditions.map(({ label }) => ({ label, met: false }));
  const earned = status?.earnedAt != null;
  return {
    definition,
    name: badgeDisplayName(definition, sector),
    assetPath: badgeAssetPath(definition, sector),
    earned,
    dateLabel:
      status?.earnedAt != null
        ? `Obtenu le ${formatEarnedDate(status.earnedAt)}`
        : null,
    rarityLabel:
      earned && status?.rarityPercent != null
        ? `${status.rarityPercent} % des candidats l'ont obtenu`
        : null,
    conditions,
    metCount: conditions.filter((condition) => condition.met).length,
  };
}

function conditionsIntroFor(conditions: BadgeConditionView[]): string {
  return CONDITION_COUNT_INTROS[conditions.length] ?? 'Conditions :';
}

function buildStep(entry: BadgeEntry, next: boolean): BadgeTierStepView {
  const tier = entry.definition.tier ?? BadgeTier.BRONZE;
  const multipleConditions = !entry.earned && entry.conditions.length > 1;
  return {
    badgeId: entry.definition.id,
    assetPath: entry.assetPath,
    earned: entry.earned,
    next,
    tierLine: TIER_LABELS[tier],
    gain: energyGain(entry.definition.energyReward),
    tierColorVar: TIER_COLOR_VARS[tier],
    name: entry.earned ? entry.name : null,
    sub: entry.earned
      ? entry.dateLabel
      : multipleConditions
        ? null
        : (entry.conditions[0]?.label ?? null),
    conditions: multipleConditions ? entry.conditions : null,
    conditionsIntro: multipleConditions
      ? conditionsIntroFor(entry.conditions)
      : null,
  };
}

function buildTieredCard(
  label: string,
  entries: BadgeEntry[],
): TieredBadgeCardView {
  const firstTodoIndex = entries.findIndex((entry) => !entry.earned);
  const top = [...entries].reverse().find((entry) => entry.earned) ?? null;
  const shown = top ?? entries[0];
  const shownTier = shown.definition.tier ?? BadgeTier.BRONZE;
  return {
    label,
    hero: {
      assetPath: shown.assetPath,
      locked: top === null,
      name: top ? shown.name : null,
      tierName: top ? TIER_LABELS[shownTier] : null,
      tierColorVar: top ? TIER_COLOR_VARS[shownTier] : null,
      dateLabel: top ? shown.dateLabel : null,
      noneYet: top === null,
      rarityLabel: top ? shown.rarityLabel : null,
    },
    steps: entries.map((entry, index) =>
      buildStep(entry, index === firstTodoIndex),
    ),
  };
}

function buildTransverseView(entry: BadgeEntry): TransverseBadgeView {
  const gain = energyGain(entry.definition.energyReward);
  const multipleConditions = !entry.earned && entry.conditions.length > 1;
  return {
    badgeId: entry.definition.id,
    assetPath: entry.assetPath,
    locked: !entry.earned,
    name: entry.earned ? entry.name : null,
    gain,
    earnedLine: entry.earned ? entry.dateLabel : null,
    conditionLine:
      !entry.earned && !multipleConditions
        ? (entry.conditions[0]?.label ?? null)
        : null,
    conditions: multipleConditions ? entry.conditions : null,
    conditionsIntro: multipleConditions
      ? conditionsIntroFor(entry.conditions)
      : null,
    rarityLabel: entry.rarityLabel,
  };
}

function buildSummary(entries: BadgeEntry[]): BadgesSummaryView {
  const earnedCount = entries.filter((entry) => entry.earned).length;
  const total = entries.length;
  const energyEarned = entries
    .filter((entry) => entry.earned)
    .reduce((sum, entry) => sum + entry.definition.energyReward, 0);
  const energyRemaining = entries
    .filter((entry) => !entry.earned)
    .reduce((sum, entry) => sum + entry.definition.energyReward, 0);
  const locked = entries.filter((entry) => !entry.earned);
  const closestEntry =
    locked.length === 0
      ? null
      : locked.reduce(
          (best, entry) => (entry.metCount > best.metCount ? entry : best),
          locked[0],
        );
  return {
    earnedCount,
    total,
    progressPercent: Math.round((earnedCount / total) * 100),
    energyEarned,
    energyRemaining,
    closest: closestEntry
      ? {
          name: closestEntry.name,
          assetPath: closestEntry.assetPath,
          hint:
            closestEntry.conditions.find((condition) => !condition.met)
              ?.label ??
            closestEntry.conditions[0]?.label ??
            '',
          gain: energyGain(closestEntry.definition.energyReward),
        }
      : null,
  };
}

export function buildBadgeBoard(
  statuses: BadgeStatusDto[],
  sector: Sector,
): BadgeBoardView {
  const statusById = new Map(statuses.map((status) => [status.badgeId, status]));
  const entries = BADGE_CATALOG.map((definition) =>
    buildEntry(definition, statusById.get(definition.id) ?? null, sector),
  );
  const axisGroups = new Map<AxisType, BadgeEntry[]>();
  for (const entry of entries) {
    if (entry.definition.family === BadgeFamily.AXIS && entry.definition.axis) {
      const group = axisGroups.get(entry.definition.axis) ?? [];
      group.push(entry);
      axisGroups.set(entry.definition.axis, group);
    }
  }
  const axisCards = [...axisGroups.entries()].map(([axis, group]) =>
    buildTieredCard(AXIS_META[axis].label, group),
  );
  const examCard = buildTieredCard(
    EXAM_CARD_LABEL,
    entries.filter((entry) => entry.definition.family === BadgeFamily.EXAM),
  );
  const transverse = entries
    .filter((entry) => entry.definition.family === BadgeFamily.TRANSVERSE)
    .map(buildTransverseView);
  return {
    axisCards,
    examCard,
    transverse,
    summary: buildSummary(entries),
  };
}
