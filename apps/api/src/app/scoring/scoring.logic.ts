import {
  AxisMetrics,
  AxisType,
  MotorCourseMetrics,
  RecommendationDto,
  RecommendationPriority,
  ScoreBand,
} from '@psychotech/shared';
import {
  AXIS_LABELS,
  LOGIC_COVERAGE_TOTAL_ITEMS,
  LOGIC_COVERAGE_WEIGHT,
  LOGIC_PRECISION_DIVISOR,
  LOGIC_PRECISION_WEIGHT,
  MEMORY_INVERSE_MAX,
  MEMORY_INVERSE_MIN,
  MEMORY_INVERSE_WEIGHT,
  MEMORY_NORMAL_MAX,
  MEMORY_NORMAL_MIN,
  MEMORY_NORMAL_WEIGHT,
  MOTOR_COURSE_AGGREGATE_DIVISOR,
  MOTOR_EXITS_WEIGHT,
  MOTOR_EXIT_PENALTY_PER_EXIT,
  MOTOR_FULL_PROGRESSION,
  MOTOR_INDEPENDENCE_BAD_THRESHOLD,
  MOTOR_INDEPENDENCE_BONUS,
  MOTOR_INDEPENDENCE_GOOD_THRESHOLD,
  MOTOR_PRECISION_EXCELLENT_PX,
  MOTOR_PRECISION_POOR_PX,
  MOTOR_PRECISION_WEIGHT,
  MOTOR_PROGRESSION_WEIGHT,
  MOTOR_SPEED_EXCELLENT_S,
  MOTOR_SPEED_POOR_S,
  MOTOR_SPEED_WEIGHT,
  MOTOR_THIRD_COURSE_WEIGHT,
  REACTIVITY_ACCURACY_WEIGHT,
  REACTIVITY_SPEED_EXCELLENT_MS,
  REACTIVITY_SPEED_POOR_MS,
  REACTIVITY_SPEED_WEIGHT,
  REACTIVITY_STABILITY_EXCELLENT_MS,
  REACTIVITY_STABILITY_POOR_MS,
  REACTIVITY_STABILITY_WEIGHT,
  SCORE_BAND_THRESHOLDS,
  SCORE_MAX,
  SCORE_MIN,
  VISUAL_FALSE_POSITIVE_PENALTY_FACTOR,
  VISUAL_FALSE_POSITIVE_THRESHOLD_PCT,
  VISUAL_PRECISION_WEIGHT,
  VISUAL_SPEED_EXCELLENT_MS,
  VISUAL_SPEED_POOR_MS,
  VISUAL_SPEED_WEIGHT,
  VISUAL_TOTAL_TRIALS,
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
      return normalizeLogic(metrics.pointsEarned, metrics.itemsProcessed);
    case AxisType.MEMORY:
      return normalizeMemory(metrics.maxLengthNormal, metrics.maxLengthInverse);
    case AxisType.VISUAL_DISCRIMINATION:
      return normalizeVisualDiscrimination(metrics);
    case AxisType.REACTIVITY:
      return normalizeReactivity(metrics);
    case AxisType.MOTOR_SKILLS:
      return normalizeMotorSkills(metrics.courses);
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

function normalizeLogic(pointsEarned: number, itemsProcessed: number): number {
  const precision = (pointsEarned / LOGIC_PRECISION_DIVISOR) * SCORE_MAX;
  const coverage = (itemsProcessed / LOGIC_COVERAGE_TOTAL_ITEMS) * SCORE_MAX;
  return finalize(
    LOGIC_PRECISION_WEIGHT * precision + LOGIC_COVERAGE_WEIGHT * coverage,
  );
}

function normalizeMemory(maxLengthNormal: number, maxLengthInverse: number): number {
  const scoreNormal = ascendingScore(
    maxLengthNormal,
    MEMORY_NORMAL_MIN,
    MEMORY_NORMAL_MAX,
  );
  const scoreInverse = ascendingScore(
    maxLengthInverse,
    MEMORY_INVERSE_MIN,
    MEMORY_INVERSE_MAX,
  );
  return finalize(
    MEMORY_NORMAL_WEIGHT * scoreNormal + MEMORY_INVERSE_WEIGHT * scoreInverse,
  );
}

function normalizeVisualDiscrimination(metrics: {
  truePositives: number;
  trueNegatives: number;
  avgCorrectDecisionTimeMs: number;
  falsePositives: number;
  identicalPairs: number;
}): number {
  const precision =
    ((metrics.truePositives + metrics.trueNegatives) / VISUAL_TOTAL_TRIALS) *
    SCORE_MAX;
  const speed = scoreNorm(
    metrics.avgCorrectDecisionTimeMs,
    VISUAL_SPEED_EXCELLENT_MS,
    VISUAL_SPEED_POOR_MS,
  );
  const falsePositivePct =
    metrics.identicalPairs === 0
      ? 0
      : (metrics.falsePositives / metrics.identicalPairs) * SCORE_MAX;
  const falsePositivePenalty = Math.max(
    0,
    (falsePositivePct - VISUAL_FALSE_POSITIVE_THRESHOLD_PCT) *
      VISUAL_FALSE_POSITIVE_PENALTY_FACTOR,
  );
  return finalize(
    VISUAL_PRECISION_WEIGHT * precision +
      VISUAL_SPEED_WEIGHT * speed -
      falsePositivePenalty,
  );
}

function normalizeReactivity(metrics: {
  meanReactionTimeMs: number;
  reactionTimeSd: number;
  anticipations: number;
  omissions: number;
  inhibitionErrors: number;
  totalTrials: number;
}): number {
  const speed = scoreNorm(
    metrics.meanReactionTimeMs,
    REACTIVITY_SPEED_EXCELLENT_MS,
    REACTIVITY_SPEED_POOR_MS,
  );
  const stability = scoreNorm(
    metrics.reactionTimeSd,
    REACTIVITY_STABILITY_EXCELLENT_MS,
    REACTIVITY_STABILITY_POOR_MS,
  );
  const errorRate =
    metrics.totalTrials === 0
      ? 0
      : ((metrics.anticipations + metrics.omissions + metrics.inhibitionErrors) /
          metrics.totalTrials) *
        SCORE_MAX;
  return finalize(
    REACTIVITY_SPEED_WEIGHT * speed +
      REACTIVITY_STABILITY_WEIGHT * stability +
      REACTIVITY_ACCURACY_WEIGHT * (SCORE_MAX - errorRate),
  );
}

function normalizeMotorSkills(
  courses: [MotorCourseMetrics, MotorCourseMetrics, MotorCourseMetrics],
): number {
  const first = scoreCourse(courses[0]);
  const second = scoreCourse(courses[1]);
  const third = scoreCourse(courses[2]);
  return finalize(
    (first + second + MOTOR_THIRD_COURSE_WEIGHT * third) /
      MOTOR_COURSE_AGGREGATE_DIVISOR,
  );
}

function scoreCourse(course: MotorCourseMetrics): number {
  const precision = scoreNorm(
    course.avgDistanceToCenter,
    MOTOR_PRECISION_EXCELLENT_PX,
    MOTOR_PRECISION_POOR_PX,
  );
  const speed =
    course.progression === MOTOR_FULL_PROGRESSION
      ? scoreNorm(course.realTimeSeconds, MOTOR_SPEED_EXCELLENT_S, MOTOR_SPEED_POOR_S)
      : 0;
  const exitScore = Math.max(
    0,
    SCORE_MAX - MOTOR_EXIT_PENALTY_PER_EXIT * course.exits,
  );
  const independenceBonus = motorIndependenceBonus(course.handCorrelation);
  return clampScore(
    MOTOR_PROGRESSION_WEIGHT * course.progression +
      MOTOR_PRECISION_WEIGHT * precision +
      MOTOR_SPEED_WEIGHT * speed +
      MOTOR_EXITS_WEIGHT * exitScore +
      independenceBonus,
  );
}

function motorIndependenceBonus(handCorrelation: number): number {
  const magnitude = Math.abs(handCorrelation);
  if (magnitude < MOTOR_INDEPENDENCE_GOOD_THRESHOLD) {
    return MOTOR_INDEPENDENCE_BONUS;
  }
  if (magnitude > MOTOR_INDEPENDENCE_BAD_THRESHOLD) {
    return -MOTOR_INDEPENDENCE_BONUS;
  }
  return 0;
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

function scoreNorm(value: number, excellentBound: number, poorBound: number): number {
  return SCORE_MAX * clamp01((poorBound - value) / (poorBound - excellentBound));
}

function ascendingScore(value: number, zeroBound: number, fullBound: number): number {
  return SCORE_MAX * clamp01((value - zeroBound) / (fullBound - zeroBound));
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function clampScore(value: number): number {
  return Math.min(SCORE_MAX, Math.max(SCORE_MIN, value));
}

function finalize(value: number): number {
  return round(clampScore(value));
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function assertNever(value: never): never {
  throw new Error(`Unhandled axis metrics: ${JSON.stringify(value)}`);
}
