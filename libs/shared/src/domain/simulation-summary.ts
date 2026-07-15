import { AxisType, ScoreBand } from '../enums';
import {
  AxisFinding,
  AxisFindingsEntry,
  getAxisRecommendations,
} from '../exercises/axis-findings';

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
  findings: AxisFinding[];
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

export function buildSimulationSummary(
  axes: SimulationAxisOutcome[],
  thresholds: SimulationSummaryThresholds,
  findingsByAxis: AxisFindingsEntry[],
): SimulationSummarySelectionDto {
  return {
    strengths: selectStrengths(axes, thresholds),
    weaknesses: selectWeaknesses(axes, thresholds),
    recommendations: selectRecommendations(axes, thresholds, findingsByAxis),
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
  thresholds: SimulationSummaryThresholds,
  findingsByAxis: AxisFindingsEntry[],
): SimulationSummaryRecommendationDto[] {
  const findingsMap = new Map(
    findingsByAxis.map((entry) => [entry.axis, entry.findings]),
  );
  const thresholdRank = (entry: SimulationAxisOutcome): number => {
    const kind = weaknessThresholdKind(entry, thresholds);
    return kind === null ? 2 : THRESHOLD_KIND_RANK[kind];
  };
  return [...axes]
    .filter((entry) => (findingsMap.get(entry.axis) ?? []).length > 0)
    .sort((a, b) => thresholdRank(a) - thresholdRank(b) || a.score - b.score)
    .slice(0, RECOMMENDATION_LIMIT)
    .map((entry) => ({
      axis: entry.axis,
      findings: getAxisRecommendations(findingsMap.get(entry.axis) ?? []),
    }));
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
