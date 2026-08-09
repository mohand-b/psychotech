import {
  AXIS_META,
  AxisType,
  BADGE_CATALOG,
  BADGE_EXCELLENCE_THRESHOLD,
  BADGE_PROGRESSION_THRESHOLD,
  BADGE_SECTOR_THRESHOLD,
  BadgeDefinition,
  BadgeFamily,
  BadgeId,
  BadgeStatusDto,
  BadgeTier,
  SECTOR_AXES,
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

export interface BadgeOutlook {
  bestScores: Partial<Record<AxisType, number>>;
  lastExamScore: number | null;
  examThreshold: number | null;
}

export const EMPTY_BADGE_OUTLOOK: BadgeOutlook = {
  bestScores: {},
  lastExamScore: null,
  examThreshold: null,
};

export interface ClosestBadgeView {
  name: string;
  assetPath: string;
  hint: string;
  progress: string | null;
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

export const EXAM_CARD_LABEL = 'Tous les axes enchaînés';

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

function conditionsIntroFor(entry: BadgeEntry): string {
  if (entry.definition.id === BadgeId.EXAM_SOLID) {
    return 'Dans le même examen :';
  }
  return CONDITION_COUNT_INTROS[entry.conditions.length] ?? 'Conditions :';
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
      ? conditionsIntroFor(entry)
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
      ? conditionsIntroFor(entry)
      : null,
    rarityLabel: entry.rarityLabel,
  };
}

const SESSION_EFFORT_POINTS = 10;
const ACTION_EFFORT_POINTS = 4;
const MIN_EFFORT_POINTS = 1;

const TIER_SCORE_TARGETS: Partial<Record<BadgeTier, number>> = {
  [BadgeTier.BRONZE]: BADGE_PROGRESSION_THRESHOLD,
  [BadgeTier.SILVER]: BADGE_EXCELLENCE_THRESHOLD,
};

function axisDeficits(
  sector: Sector,
  outlook: BadgeOutlook,
): { axis: AxisType; deficit: number }[] {
  return SECTOR_AXES[sector].map((axis) => ({
    axis,
    deficit: Math.max(
      0,
      BADGE_SECTOR_THRESHOLD - (outlook.bestScores[axis] ?? 0),
    ),
  }));
}

function bindingAxisDeficit(
  sector: Sector,
  outlook: BadgeOutlook,
): { axis: AxisType; deficit: number } {
  return axisDeficits(sector, outlook).reduce((worst, entry) =>
    entry.deficit > worst.deficit ? entry : worst,
  );
}

function examDeficit(outlook: BadgeOutlook): number {
  if (outlook.lastExamScore === null) {
    const deficits = axisDeficits(Sector.RAILWAY, outlook);
    return (
      deficits.reduce((sum, entry) => sum + entry.deficit, 0) / deficits.length
    );
  }
  return Math.max(
    0,
    (outlook.examThreshold ?? BADGE_SECTOR_THRESHOLD) - outlook.lastExamScore,
  );
}

function effortOf(
  entry: BadgeEntry,
  sector: Sector,
  outlook: BadgeOutlook,
): number {
  const { definition } = entry;
  if (definition.family === BadgeFamily.AXIS && definition.axis) {
    const target = TIER_SCORE_TARGETS[definition.tier ?? BadgeTier.BRONZE];
    if (target === undefined) {
      return (
        SESSION_EFFORT_POINTS +
        Math.max(
          0,
          BADGE_EXCELLENCE_THRESHOLD -
            (outlook.bestScores[definition.axis] ?? 0),
        )
      );
    }
    return Math.max(
      MIN_EFFORT_POINTS,
      target - (outlook.bestScores[definition.axis] ?? 0),
    );
  }
  if (definition.id === BadgeId.EXAM_FIRST) {
    return SESSION_EFFORT_POINTS;
  }
  if (definition.id === BadgeId.EXAM_FAVORABLE) {
    return SESSION_EFFORT_POINTS + examDeficit(outlook);
  }
  if (definition.id === BadgeId.EXAM_SOLID) {
    return (
      SESSION_EFFORT_POINTS +
      Math.max(examDeficit(outlook), bindingAxisDeficit(sector, outlook).deficit)
    );
  }
  if (definition.id === BadgeId.SECTOR_MASTERY) {
    return Math.max(
      MIN_EFFORT_POINTS,
      bindingAxisDeficit(sector, outlook).deficit,
    );
  }
  const unmet = entry.conditions.filter((condition) => !condition.met).length;
  return Math.max(MIN_EFFORT_POINTS, unmet * ACTION_EFFORT_POINTS);
}

function pointsLabel(points: number): string {
  return `${points} point${points > 1 ? 's' : ''}`;
}

function closestProgress(
  entry: BadgeEntry,
  sector: Sector,
  outlook: BadgeOutlook,
): string | null {
  const { definition } = entry;
  if (definition.family === BadgeFamily.AXIS && definition.axis) {
    const best = outlook.bestScores[definition.axis];
    const target = TIER_SCORE_TARGETS[definition.tier ?? BadgeTier.BRONZE];
    if (target === undefined || best === undefined || best >= target) {
      return null;
    }
    return `Votre meilleur score ${best} · plus que ${pointsLabel(target - best)}`;
  }
  if (definition.id === BadgeId.SECTOR_MASTERY) {
    const binding = bindingAxisDeficit(sector, outlook);
    return binding.deficit > 0
      ? `Plus que ${pointsLabel(binding.deficit)} en ${AXIS_META[binding.axis].label}`
      : null;
  }
  if (
    definition.id === BadgeId.EXAM_FAVORABLE &&
    outlook.lastExamScore !== null
  ) {
    const deficit = examDeficit(outlook);
    return deficit > 0
      ? `Dernier examen à ${outlook.lastExamScore} · plus que ${pointsLabel(deficit)}`
      : null;
  }
  return null;
}

function buildSummary(
  entries: BadgeEntry[],
  sector: Sector,
  outlook: BadgeOutlook,
): BadgesSummaryView {
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
      : locked.reduce((best, entry) =>
          effortOf(entry, sector, outlook) < effortOf(best, sector, outlook)
            ? entry
            : best,
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
          progress: closestProgress(closestEntry, sector, outlook),
          gain: energyGain(closestEntry.definition.energyReward),
        }
      : null,
  };
}

export function buildBadgeBoard(
  statuses: BadgeStatusDto[],
  sector: Sector,
  outlook: BadgeOutlook = EMPTY_BADGE_OUTLOOK,
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
    summary: buildSummary(entries, sector, outlook),
  };
}
