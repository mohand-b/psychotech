import { AxisType, RecommendationPriority, ScoreBand } from '../enums';

export enum SimulationThresholdKind {
  ELIMINATORY = 'ELIMINATORY',
  VIGILANCE = 'VIGILANCE',
}

export interface SimulationAxisOutcome {
  axis: AxisType;
  score: number;
  band: ScoreBand;
  isCritical: boolean;
}

export interface SimulationSummaryThresholds {
  vigilanceThreshold: number;
  eliminatoryThreshold: number;
}

export interface SimulationRecommendationInput {
  axis: AxisType;
  priority: RecommendationPriority;
  label: string;
}

export interface SimulationStrengthDto {
  axis: AxisType;
  score: number;
  band: ScoreBand;
  sublabel: string;
}

export interface SimulationWeaknessDto {
  axis: AxisType;
  score: number;
  band: ScoreBand;
  thresholdKind: SimulationThresholdKind;
  thresholdValue: number;
}

export interface SimulationSummaryRecommendationDto {
  axis: AxisType;
  label: string;
}

export interface SimulationSummarySelectionDto {
  strengths: SimulationStrengthDto[];
  weaknesses: SimulationWeaknessDto[];
  recommendations: SimulationSummaryRecommendationDto[];
}

const STRENGTH_LIMIT = 2;
const WEAKNESS_LIMIT = 3;
const RECOMMENDATION_LIMIT = 3;
const WIDE_VIGILANCE_GAP = 15;

const THRESHOLD_KIND_RANK: Record<SimulationThresholdKind, number> = {
  [SimulationThresholdKind.ELIMINATORY]: 0,
  [SimulationThresholdKind.VIGILANCE]: 1,
};

const PRIORITY_RANK: Record<RecommendationPriority, number> = {
  [RecommendationPriority.HIGH]: 0,
  [RecommendationPriority.MEDIUM]: 1,
  [RecommendationPriority.LOW]: 2,
};

export function buildSimulationSummary(
  axes: SimulationAxisOutcome[],
  thresholds: SimulationSummaryThresholds,
  recommendations: SimulationRecommendationInput[],
): SimulationSummarySelectionDto {
  return {
    strengths: selectStrengths(axes, thresholds),
    weaknesses: selectWeaknesses(axes, thresholds),
    recommendations: selectRecommendations(axes, recommendations),
  };
}

function selectStrengths(
  axes: SimulationAxisOutcome[],
  thresholds: SimulationSummaryThresholds,
): SimulationStrengthDto[] {
  return [...axes]
    .filter((entry) => entry.band === ScoreBand.EXCELLENT)
    .sort((a, b) => b.score - a.score)
    .slice(0, STRENGTH_LIMIT)
    .map(({ axis, score, band }, index) => ({
      axis,
      score,
      band,
      sublabel:
        index === 0
          ? 'Votre meilleur axe de la session'
          : score - thresholds.vigilanceThreshold >= WIDE_VIGILANCE_GAP
            ? 'Largement au-dessus du seuil de vigilance'
            : 'Au-dessus du seuil de vigilance',
    }));
}

function selectWeaknesses(
  axes: SimulationAxisOutcome[],
  thresholds: SimulationSummaryThresholds,
): SimulationWeaknessDto[] {
  return axes
    .map((entry) => ({
      entry,
      kind: weaknessThresholdKind(entry, thresholds),
    }))
    .filter(
      (
        candidate,
      ): candidate is {
        entry: SimulationAxisOutcome;
        kind: SimulationThresholdKind;
      } => candidate.kind !== null,
    )
    .sort(
      (a, b) =>
        THRESHOLD_KIND_RANK[a.kind] - THRESHOLD_KIND_RANK[b.kind] ||
        a.entry.score - b.entry.score,
    )
    .slice(0, WEAKNESS_LIMIT)
    .map(({ entry, kind }) => ({
      axis: entry.axis,
      score: entry.score,
      band: entry.band,
      thresholdKind: kind,
      thresholdValue:
        kind === SimulationThresholdKind.ELIMINATORY
          ? thresholds.eliminatoryThreshold
          : thresholds.vigilanceThreshold,
    }));
}

function selectRecommendations(
  axes: SimulationAxisOutcome[],
  recommendations: SimulationRecommendationInput[],
): SimulationSummaryRecommendationDto[] {
  const scoreByAxis = new Map(axes.map((entry) => [entry.axis, entry.score]));
  return [...recommendations]
    .sort(
      (a, b) =>
        PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
        (scoreByAxis.get(a.axis) ?? 0) - (scoreByAxis.get(b.axis) ?? 0),
    )
    .slice(0, RECOMMENDATION_LIMIT)
    .map(({ axis, label }) => ({ axis, label }));
}

function weaknessThresholdKind(
  entry: SimulationAxisOutcome,
  thresholds: SimulationSummaryThresholds,
): SimulationThresholdKind | null {
  if (entry.isCritical && entry.score < thresholds.eliminatoryThreshold) {
    return SimulationThresholdKind.ELIMINATORY;
  }
  if (entry.score < thresholds.vigilanceThreshold) {
    return SimulationThresholdKind.VIGILANCE;
  }
  return null;
}
