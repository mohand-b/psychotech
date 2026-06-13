import {
  AxisMetrics,
  AxisType,
  RecommendationDto,
  RecommendationPriority,
  ScoreBand,
} from '@psychotech/shared';
import {
  AXIS_LABELS,
  MEMORY_REFERENCE_SPAN,
  MOTOR_EXIT_PENALTY,
  MOTOR_HAND_DEPENDENCE_PENALTY,
  REACTIVITY_BEST_MS,
  REACTIVITY_ERROR_PENALTY,
  REACTIVITY_WORST_MS,
  SCORE_BAND_THRESHOLDS,
  SCORE_MAX,
  SCORE_MIN,
  VISUAL_FALSE_ALARM_WEIGHT,
} from './scoring.constants';

export interface AxisScore {
  axis: AxisType;
  score: number;
  coefficient: number;
  isCritical: boolean;
}

export interface SessionThresholds {
  admissibilityThreshold: number;
  vigilanceThreshold: number;
  eliminatoryThreshold: number;
}

export interface SessionEvaluation {
  globalScore: number;
  globalBand: ScoreBand;
  isAdmissible: boolean;
  isEliminated: boolean;
  recommendations: RecommendationDto[];
}

const PRIORITY_RANK: Record<RecommendationPriority, number> = {
  [RecommendationPriority.HIGH]: 0,
  [RecommendationPriority.MEDIUM]: 1,
  [RecommendationPriority.LOW]: 2,
};

export function normalizeAxis(metrics: AxisMetrics): number {
  switch (metrics.axis) {
    case AxisType.LOGIC:
      return clamp(metrics.precision);
    case AxisType.MEMORY:
      return clamp(
        ((metrics.maxLengthNormal + metrics.maxLengthInverse) /
          2 /
          MEMORY_REFERENCE_SPAN) *
          SCORE_MAX,
      );
    case AxisType.VISUAL_DISCRIMINATION:
      return clamp(
        metrics.precision * (1 - VISUAL_FALSE_ALARM_WEIGHT * metrics.falseAlarmRate),
      );
    case AxisType.REACTIVITY:
      return clamp(
        reactionTimeScore(metrics.meanReactionTimeMs) -
          REACTIVITY_ERROR_PENALTY *
            (metrics.omissions + metrics.inhibitionErrors + metrics.anticipations),
      );
    case AxisType.MOTOR_SKILLS:
      return clamp(
        average(metrics.scoresByCourse) -
          MOTOR_EXIT_PENALTY * metrics.exits -
          MOTOR_HAND_DEPENDENCE_PENALTY * metrics.handIndependence,
      );
    default:
      return assertNever(metrics);
  }
}

export function scoreBand(score: number): ScoreBand {
  if (score >= SCORE_BAND_THRESHOLDS.excellent) {
    return ScoreBand.EXCELLENT;
  }
  if (score >= SCORE_BAND_THRESHOLDS.acceptable) {
    return ScoreBand.ACCEPTABLE;
  }
  if (score >= SCORE_BAND_THRESHOLDS.fragile) {
    return ScoreBand.FRAGILE;
  }
  return ScoreBand.INSUFFICIENT;
}

export function weightedGlobalScore(scores: AxisScore[]): number {
  const totalCoefficient = scores.reduce((sum, entry) => sum + entry.coefficient, 0);
  if (totalCoefficient === 0) {
    return SCORE_MIN;
  }
  const weighted = scores.reduce(
    (sum, entry) => sum + entry.score * entry.coefficient,
    0,
  );
  return round(weighted / totalCoefficient);
}

export function evaluateSession(
  scores: AxisScore[],
  thresholds: SessionThresholds,
): SessionEvaluation {
  const globalScore = weightedGlobalScore(scores);
  const isEliminated = scores.some(
    (entry) => entry.isCritical && entry.score < thresholds.eliminatoryThreshold,
  );
  const isAdmissible =
    !isEliminated && globalScore >= thresholds.admissibilityThreshold;
  return {
    globalScore,
    globalBand: scoreBand(globalScore),
    isAdmissible,
    isEliminated,
    recommendations: buildRecommendations(scores, thresholds),
  };
}

export function buildRecommendations(
  scores: AxisScore[],
  thresholds: SessionThresholds,
): RecommendationDto[] {
  return scores
    .map((entry) => ({ score: entry.score, recommendation: recommendationFor(entry, thresholds) }))
    .filter(
      (entry): entry is { score: number; recommendation: RecommendationDto } =>
        entry.recommendation !== null,
    )
    .sort(
      (a, b) =>
        PRIORITY_RANK[a.recommendation.priority] -
          PRIORITY_RANK[b.recommendation.priority] || a.score - b.score,
    )
    .map((entry) => entry.recommendation);
}

function recommendationFor(
  entry: AxisScore,
  thresholds: SessionThresholds,
): RecommendationDto | null {
  const axisLabel = AXIS_LABELS[entry.axis];
  if (entry.isCritical && entry.score < thresholds.eliminatoryThreshold) {
    return {
      axis: entry.axis,
      priority: RecommendationPriority.HIGH,
      code: 'CRITICAL_AXIS_ELIMINATORY',
      label: `Axe critique sous le seuil éliminatoire : retravaillez ${axisLabel} en priorité absolue`,
    };
  }
  if (entry.isCritical && entry.score < thresholds.vigilanceThreshold) {
    return {
      axis: entry.axis,
      priority: RecommendationPriority.HIGH,
      code: 'CRITICAL_AXIS_VIGILANCE',
      label: `Axe critique sous le seuil de vigilance : consolidez ${axisLabel}`,
    };
  }
  if (entry.score < thresholds.vigilanceThreshold) {
    return {
      axis: entry.axis,
      priority: RecommendationPriority.MEDIUM,
      code: 'AXIS_BELOW_VIGILANCE',
      label: `${axisLabel} sous le seuil de vigilance : prévoyez des séances ciblées`,
    };
  }
  if (entry.score < thresholds.admissibilityThreshold) {
    return {
      axis: entry.axis,
      priority: RecommendationPriority.LOW,
      code: 'AXIS_BELOW_ADMISSIBILITY',
      label: `${axisLabel} en dessous du seuil d'admissibilité : quelques révisions suffiront`,
    };
  }
  return null;
}

function reactionTimeScore(meanReactionTimeMs: number): number {
  return (
    ((REACTIVITY_WORST_MS - meanReactionTimeMs) /
      (REACTIVITY_WORST_MS - REACTIVITY_BEST_MS)) *
    SCORE_MAX
  );
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number): number {
  return round(Math.min(SCORE_MAX, Math.max(SCORE_MIN, value)));
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function assertNever(value: never): never {
  throw new Error(`Unhandled axis metrics: ${JSON.stringify(value)}`);
}
