import {
  AxisType,
  RecommendationDto,
  RecommendationPriority,
  ScoreBand,
} from '@psychotech/shared';
import {
  AXIS_LABELS,
  SCORE_BAND_THRESHOLDS,
  SCORE_MIN,
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
  return null;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
