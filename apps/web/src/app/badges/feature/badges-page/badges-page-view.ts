import {
  AXIS_META,
  AxisType,
  BADGE_CATALOG,
  BADGE_EXCELLENCE_THRESHOLD,
  BADGE_SECTOR_THRESHOLD,
  EXAM_EXCELLENCE_THRESHOLD,
  EXAM_PERFECTION_THRESHOLD,
  EXAM_PROGRESSION_THRESHOLD,
  FULL_SESSION_LABEL,
  BadgeConditionStateDto,
  BadgeDefinition,
  BadgeFamily,
  BadgeId,
  BadgeStatusDto,
  BadgeTier,
  SECTOR_AXES,
  SESSION_ENERGY_COST,
  SessionMode,
  sectorAxisRank,
  Sector,
  TrainingsOverviewDto,
  badgeAssetPath,
  badgeDisplayName,
  roundToTenth,
} from '@psychotech/shared';
import { formatFrenchNumber } from '../../../shared/util/format-number';
import { computeDisplayedEnergyGain } from '../../data-access/badge-display';
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
  conditions: BadgeConditionStateDto[];
  metCount: number;
}

export interface BadgeOutlook {
  scoresAvailable: boolean;
  bestScores: Partial<Record<AxisType, number>>;
  criticalAxes: readonly AxisType[];
  vigilanceThreshold: number | null;
  lastExamScore: number | null;
}

export const UNAVAILABLE_BADGE_OUTLOOK: BadgeOutlook = {
  scoresAvailable: false,
  bestScores: {},
  criticalAxes: [],
  vigilanceThreshold: null,
  lastExamScore: null,
};

export interface ClosestBadgeView {
  name: string;
  assetPath: string;
  conditions: BadgeConditionView[];
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
  closestNote: string | null;
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
  const conditions: BadgeConditionStateDto[] = status
    ? status.conditions.map(({ id, label, met }) => ({ id, label, met }))
    : definition.conditions.map(({ id, label }) => ({
        id,
        label,
        met: false,
      }));
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
        ? `${status.rarityPercent}% des candidats l'ont obtenu`
        : null,
    conditions,
    metCount: conditions.filter((condition) => condition.met).length,
  };
}

function buildConditionsIntro(entry: BadgeEntry): string {
  if (entry.definition.family === BadgeFamily.EXAM) {
    return 'Dans le même examen :';
  }
  return CONDITION_COUNT_INTROS[entry.conditions.length] ?? 'Conditions :';
}

function buildTierStep(entry: BadgeEntry, next: boolean): BadgeTierStepView {
  const tier = entry.definition.tier ?? BadgeTier.BRONZE;
  const multipleConditions = !entry.earned && entry.conditions.length > 1;
  return {
    badgeId: entry.definition.id,
    assetPath: entry.assetPath,
    earned: entry.earned,
    next,
    tierLine: TIER_LABELS[tier],
    gain: computeDisplayedEnergyGain(entry.definition.energyReward),
    tierColorVar: TIER_COLOR_VARS[tier],
    name: entry.earned ? entry.name : null,
    sub: entry.earned
      ? entry.dateLabel
      : multipleConditions
        ? null
        : (entry.conditions[0]?.label ?? null),
    conditions: multipleConditions ? entry.conditions : null,
    conditionsIntro: multipleConditions ? buildConditionsIntro(entry) : null,
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
      buildTierStep(entry, index === firstTodoIndex),
    ),
  };
}

function buildTransverseView(entry: BadgeEntry): TransverseBadgeView {
  const gain = computeDisplayedEnergyGain(entry.definition.energyReward);
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
    conditionsIntro: multipleConditions ? buildConditionsIntro(entry) : null,
    rarityLabel: entry.rarityLabel,
  };
}

const CLICK_EFFORT = 1;
const DISCOVERY_SESSION_EFFORT = 3;
const CREDIT_EFFORT = 4;
const PROOF_EFFORT = 25;
const MIN_EFFORT = 1;
const UNPLAYED_BASELINE_SCORE = 50;
const UNTRIED_AXIS_EFFORT = 5;
const PERFECT_SCORE = 100;

const TARGETED_ATTEMPT_CREDITS = SESSION_ENERGY_COST[SessionMode.TARGETED];
const EXAM_ATTEMPT_CREDITS = SESSION_ENERGY_COST[SessionMode.FULL];

const FREE_ACTION_EFFORTS: Readonly<Record<string, number>> = {
  verified: CLICK_EFFORT,
  'exam-guide': CLICK_EFFORT,
  'logic-guide': CLICK_EFFORT,
  tutorial: DISCOVERY_SESSION_EFFORT,
};

const COLLECTION_COMPLETE_NOTE = 'Collection complète';
const UNAVAILABLE_PROPOSAL_NOTE = 'Indisponible pour le moment';

function parseAxisScoreTarget(definition: BadgeDefinition): number | undefined {
  const condition = definition.conditions.find((entry) =>
    entry.id.startsWith('best-'),
  );
  return condition ? Number(condition.id.slice('best-'.length)) : undefined;
}

const EXAM_SCORE_TARGETS: Partial<Record<BadgeId, number>> = {
  [BadgeId.EXAM_FIRST]: EXAM_PROGRESSION_THRESHOLD,
  [BadgeId.EXAM_FAVORABLE]: EXAM_EXCELLENCE_THRESHOLD,
  [BadgeId.EXAM_SOLID]: EXAM_PERFECTION_THRESHOLD,
};

function computeScoreGap(target: number, score: number): number {
  return Math.max(0, target - score);
}

function projectUntriedAxisScore(
  sector: Sector,
  outlook: BadgeOutlook,
): number {
  const playedScores = SECTOR_AXES[sector]
    .map((axis) => outlook.bestScores[axis])
    .filter((score): score is number => score !== undefined);
  if (playedScores.length === 0) {
    return UNPLAYED_BASELINE_SCORE;
  }
  return (
    playedScores.reduce((sum, score) => sum + score, 0) / playedScores.length
  );
}

function projectBestScore(
  axis: AxisType,
  sector: Sector,
  outlook: BadgeOutlook,
): number {
  return outlook.bestScores[axis] ?? projectUntriedAxisScore(sector, outlook);
}

function projectExamScore(sector: Sector, outlook: BadgeOutlook): number {
  const axes = SECTOR_AXES[sector];
  const projected =
    axes.reduce(
      (sum, axis) => sum + projectBestScore(axis, sector, outlook),
      0,
    ) / axes.length;
  return outlook.lastExamScore === null
    ? projected
    : Math.max(outlook.lastExamScore, projected);
}

function computeCriticalAxesShortfall(
  sector: Sector,
  outlook: BadgeOutlook,
): number {
  const threshold = outlook.vigilanceThreshold;
  if (threshold === null) {
    return 0;
  }
  return outlook.criticalAxes.reduce(
    (sum, axis) =>
      sum + computeScoreGap(threshold, projectBestScore(axis, sector, outlook)),
    0,
  );
}

function computeProofEffort(definition: BadgeDefinition): number {
  return definition.tier === BadgeTier.GOLD ? PROOF_EFFORT : 0;
}

function estimateSectorMasteryEffort(
  sector: Sector,
  outlook: BadgeOutlook,
): number {
  return SECTOR_AXES[sector].reduce((sum, axis) => {
    const untried = outlook.bestScores[axis] === undefined;
    const gap = computeScoreGap(
      BADGE_SECTOR_THRESHOLD,
      projectBestScore(axis, sector, outlook),
    );
    if (!untried && gap === 0) {
      return sum;
    }
    return (
      sum +
      TARGETED_ATTEMPT_CREDITS * CREDIT_EFFORT +
      gap +
      (untried ? UNTRIED_AXIS_EFFORT : 0)
    );
  }, 0);
}

function estimateRawEffort(
  entry: BadgeEntry,
  sector: Sector,
  outlook: BadgeOutlook,
): number {
  const { definition } = entry;
  if (definition.family === BadgeFamily.AXIS && definition.axis) {
    const best = projectBestScore(definition.axis, sector, outlook);
    const target = parseAxisScoreTarget(definition);
    const attempt =
      TARGETED_ATTEMPT_CREDITS * CREDIT_EFFORT +
      (outlook.bestScores[definition.axis] === undefined
        ? UNTRIED_AXIS_EFFORT
        : 0);
    if (target !== undefined) {
      return attempt + computeScoreGap(target, best);
    }
    return definition.tier === BadgeTier.GOLD
      ? attempt + PROOF_EFFORT + computeScoreGap(PERFECT_SCORE, best)
      : attempt + computeScoreGap(BADGE_EXCELLENCE_THRESHOLD, best);
  }
  const examTarget = EXAM_SCORE_TARGETS[definition.id];
  if (examTarget !== undefined) {
    return (
      EXAM_ATTEMPT_CREDITS * CREDIT_EFFORT +
      computeProofEffort(definition) +
      computeScoreGap(examTarget, projectExamScore(sector, outlook)) +
      computeCriticalAxesShortfall(sector, outlook)
    );
  }
  if (definition.id === BadgeId.SECTOR_MASTERY) {
    return Math.max(MIN_EFFORT, estimateSectorMasteryEffort(sector, outlook));
  }
  const actionsEffort = entry.conditions
    .filter((condition) => !condition.met)
    .reduce(
      (sum, condition) =>
        sum +
        (FREE_ACTION_EFFORTS[condition.id] ??
          TARGETED_ATTEMPT_CREDITS * CREDIT_EFFORT),
      0,
    );
  return Math.max(MIN_EFFORT, actionsEffort);
}

function computeAttemptCredits(definition: BadgeDefinition): number {
  if (definition.family === BadgeFamily.EXAM) {
    return EXAM_ATTEMPT_CREDITS;
  }
  if (
    definition.family === BadgeFamily.AXIS ||
    definition.id === BadgeId.SECTOR_MASTERY
  ) {
    return TARGETED_ATTEMPT_CREDITS;
  }
  return 0;
}

function resolveLadderKey(definition: BadgeDefinition): string | null {
  if (definition.family === BadgeFamily.AXIS) {
    return definition.axis;
  }
  return definition.family === BadgeFamily.EXAM ? definition.family : null;
}

function onlyFreeActionsRemain(entry: BadgeEntry): boolean {
  return entry.conditions.every(
    (condition) =>
      condition.met || FREE_ACTION_EFFORTS[condition.id] !== undefined,
  );
}

function estimateLockedEfforts(
  entries: BadgeEntry[],
  sector: Sector,
  outlook: BadgeOutlook,
): Map<BadgeId, number> {
  const efforts = new Map<BadgeId, number>();
  const lastEffortByLadder = new Map<string, number>();
  for (const entry of entries) {
    if (
      entry.earned ||
      (!outlook.scoresAvailable && !onlyFreeActionsRemain(entry))
    ) {
      continue;
    }
    const raw = estimateRawEffort(entry, sector, outlook);
    const ladderKey = resolveLadderKey(entry.definition);
    const previous =
      ladderKey === null ? undefined : lastEffortByLadder.get(ladderKey);
    const effort =
      previous === undefined ? raw : Math.max(raw, previous + MIN_EFFORT);
    if (ladderKey !== null) {
      lastEffortByLadder.set(ladderKey, effort);
    }
    efforts.set(entry.definition.id, effort);
  }
  return efforts;
}

function dependsOnUntriedAxis(
  definition: BadgeDefinition,
  sector: Sector,
  outlook: BadgeOutlook,
): boolean {
  if (definition.family === BadgeFamily.AXIS && definition.axis) {
    return outlook.bestScores[definition.axis] === undefined;
  }
  if (definition.id === BadgeId.SECTOR_MASTERY) {
    return SECTOR_AXES[sector].some(
      (axis) => outlook.bestScores[axis] === undefined,
    );
  }
  return false;
}

function compareCandidateKeys(
  first: readonly number[],
  second: readonly number[],
): number {
  const index = first.findIndex(
    (value, position) => value !== second[position],
  );
  return index < 0 ? 0 : first[index] - second[index];
}

function pickNextBadge(
  entries: BadgeEntry[],
  sector: Sector,
  outlook: BadgeOutlook,
): BadgeEntry | null {
  const efforts = estimateLockedEfforts(entries, sector, outlook);
  let next: BadgeEntry | null = null;
  let nextKey: readonly number[] = [];
  for (const entry of entries) {
    const effort = efforts.get(entry.definition.id);
    if (effort === undefined) {
      continue;
    }
    const key = [
      effort,
      computeAttemptCredits(entry.definition),
      Number(dependsOnUntriedAxis(entry.definition, sector, outlook)),
    ];
    if (next === null || compareCandidateKeys(key, nextKey) < 0) {
      next = entry;
      nextKey = key;
    }
  }
  return next;
}

const PLURAL_POINTS_FROM = 2;

function formatPointsLabel(points: number): string {
  const rounded = roundToTenth(points);
  const unit = rounded >= PLURAL_POINTS_FROM ? 'points' : 'point';
  return `${formatFrenchNumber(rounded)} ${unit}`;
}

function buildClosestProgressLine(
  entry: BadgeEntry,
  sector: Sector,
  outlook: BadgeOutlook,
): string | null {
  const { definition } = entry;
  if (definition.family === BadgeFamily.AXIS && definition.axis) {
    const best = outlook.bestScores[definition.axis];
    const target = parseAxisScoreTarget(definition);
    if (target === undefined || best === undefined || best >= target) {
      return null;
    }
    return `Votre meilleur score ${formatFrenchNumber(best)} · plus que ${formatPointsLabel(target - best)}`;
  }
  if (definition.id === BadgeId.SECTOR_MASTERY) {
    const axes = SECTOR_AXES[sector];
    if (axes.some((axis) => outlook.bestScores[axis] === undefined)) {
      return null;
    }
    const binding = axes
      .map((axis) => ({
        axis,
        deficit: computeScoreGap(
          BADGE_SECTOR_THRESHOLD,
          projectBestScore(axis, sector, outlook),
        ),
      }))
      .reduce((worst, candidate) =>
        candidate.deficit > worst.deficit ? candidate : worst,
      );
    return binding.deficit > 0
      ? `Plus que ${formatPointsLabel(binding.deficit)} en ${AXIS_META[binding.axis].label}`
      : null;
  }
  const examTarget = EXAM_SCORE_TARGETS[definition.id];
  if (examTarget !== undefined && outlook.lastExamScore !== null) {
    const deficit = roundToTenth(
      computeScoreGap(examTarget, outlook.lastExamScore),
    );
    return deficit > 0
      ? `Dernier examen à ${formatFrenchNumber(roundToTenth(outlook.lastExamScore))} · plus que ${formatPointsLabel(deficit)}`
      : null;
  }
  return null;
}

const TRANSVERSE_BADGE_LABEL = 'Badge transverse';

function buildClosestBadgeLabel(definition: BadgeDefinition): string {
  if (definition.family === BadgeFamily.TRANSVERSE || !definition.tier) {
    return TRANSVERSE_BADGE_LABEL;
  }
  const familyLabel = definition.axis
    ? AXIS_META[definition.axis].label
    : FULL_SESSION_LABEL;
  return `${familyLabel} · palier ${TIER_LABELS[definition.tier]}`;
}

function buildClosestBadgeView(
  entry: BadgeEntry,
  sector: Sector,
  outlook: BadgeOutlook,
): ClosestBadgeView {
  return {
    name: buildClosestBadgeLabel(entry.definition),
    assetPath: entry.assetPath,
    conditions: entry.conditions,
    progress: buildClosestProgressLine(entry, sector, outlook),
    gain: computeDisplayedEnergyGain(entry.definition.energyReward),
  };
}

function buildClosestNote(
  entries: BadgeEntry[],
  closest: ClosestBadgeView | null,
  outlook: BadgeOutlook | null,
): string | null {
  if (closest || outlook === null) {
    return null;
  }
  if (entries.every((entry) => entry.earned)) {
    return COLLECTION_COMPLETE_NOTE;
  }
  return outlook.scoresAvailable ? null : UNAVAILABLE_PROPOSAL_NOTE;
}

function buildSummary(
  entries: BadgeEntry[],
  sector: Sector,
  outlook: BadgeOutlook | null,
): BadgesSummaryView {
  const earnedCount = entries.filter((entry) => entry.earned).length;
  const total = entries.length;
  const energyEarned = entries
    .filter((entry) => entry.earned)
    .reduce((sum, entry) => sum + entry.definition.energyReward, 0);
  const energyRemaining = entries
    .filter((entry) => !entry.earned)
    .reduce((sum, entry) => sum + entry.definition.energyReward, 0);
  const next = outlook ? pickNextBadge(entries, sector, outlook) : null;
  const closest =
    next && outlook ? buildClosestBadgeView(next, sector, outlook) : null;
  return {
    earnedCount,
    total,
    progressPercent: Math.round((earnedCount / total) * 100),
    energyEarned,
    energyRemaining,
    closest,
    closestNote: buildClosestNote(entries, closest, outlook),
  };
}

export function buildBadgeOutlook(
  overview: TrainingsOverviewDto,
): BadgeOutlook {
  const bestScores: Partial<Record<AxisType, number>> = {};
  for (const axis of overview.axes) {
    if (axis.bestScore !== null) {
      bestScores[axis.axis] = axis.bestScore;
    }
  }
  return {
    scoresAvailable: true,
    bestScores,
    criticalAxes: overview.axes
      .filter((axis) => axis.isCriticalAxis)
      .map((axis) => axis.axis),
    vigilanceThreshold: overview.vigilanceThreshold,
    lastExamScore: overview.lastSimulation?.globalScore ?? null,
  };
}

export function buildBadgeBoard(
  statuses: BadgeStatusDto[],
  sector: Sector,
  outlook: BadgeOutlook | null,
): BadgeBoardView {
  const statusById = new Map(
    statuses.map((status) => [status.badgeId, status]),
  );
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
  const axisCards = [...axisGroups.entries()]
    .sort(
      ([first], [second]) =>
        sectorAxisRank(sector, first) - sectorAxisRank(sector, second),
    )
    .map(([axis, group]) => buildTieredCard(AXIS_META[axis].label, group));
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
