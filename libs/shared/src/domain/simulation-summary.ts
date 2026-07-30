import { AxisType, RecommendationPriority, ScoreBand } from '../enums';
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

interface SimulationSummaryThresholds {
  vigilanceThreshold: number;
  eliminatoryThreshold: number;
}

interface SimulationStrengthDto {
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

interface SimulationSummaryRecommendationDto {
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
  return axes
    .map((entry) => ({
      entry,
      kind: weaknessThresholdKind(entry, thresholds),
      findings: findingsMap.get(entry.axis) ?? [],
    }))
    .filter(({ kind, findings }) => findings.length > 0 || kind !== null)
    .sort(
      (a, b) =>
        (a.kind === null ? 2 : THRESHOLD_KIND_RANK[a.kind]) -
          (b.kind === null ? 2 : THRESHOLD_KIND_RANK[b.kind]) ||
        a.entry.score - b.entry.score,
    )
    .slice(0, RECOMMENDATION_LIMIT)
    .map(({ entry, kind, findings }) => ({
      axis: entry.axis,
      findings:
        findings.length > 0
          ? getAxisRecommendations(findings)
          : kind === null
            ? []
            : [thresholdShortfallFinding(entry, kind, thresholds)],
    }));
}

function thresholdShortfallFinding(
  entry: SimulationAxisOutcome,
  kind: SimulationThresholdKind,
  thresholds: SimulationSummaryThresholds,
): AxisFinding {
  if (kind === SimulationThresholdKind.ELIMINATORY) {
    return {
      id: 'AXIS_UNDER_ELIMINATORY_THRESHOLD',
      severity: RecommendationPriority.HIGH,
      finding: `Score de ${entry.score}/100, sous le seuil éliminatoire de l'axe (${thresholds.eliminatoryThreshold}), sans défaut de méthode isolé : c'est le niveau d'ensemble qui pèche`,
      recommendation:
        'Rejouez cet axe en entraînement ciblé en priorité : il bloque votre admissibilité à lui seul.',
    };
  }
  return {
    id: 'AXIS_UNDER_VIGILANCE_THRESHOLD',
    severity: RecommendationPriority.MEDIUM,
    finding: `Score de ${entry.score}/100, sous le seuil de vigilance (${thresholds.vigilanceThreshold}), sans défaut de méthode isolé`,
    recommendation:
      'Consolidez cet axe en entraînement ciblé pour repasser durablement au-dessus du seuil.',
  };
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
