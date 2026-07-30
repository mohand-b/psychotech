import { AxisType } from '../enums';

export enum SimulationVerdict {
  FAVORABLE = 'FAVORABLE',
  UNFAVORABLE = 'UNFAVORABLE',
}

export enum SimulationVerdictReasonKind {
  ELIMINATORY_AXES = 'ELIMINATORY_AXES',
  GLOBAL_SCORE_BELOW_THRESHOLD = 'GLOBAL_SCORE_BELOW_THRESHOLD',
}

interface SimulationVerdictEliminatoryReason {
  kind: SimulationVerdictReasonKind.ELIMINATORY_AXES;
  axes: AxisType[];
  eliminatoryThreshold: number;
}

interface SimulationVerdictScoreReason {
  kind: SimulationVerdictReasonKind.GLOBAL_SCORE_BELOW_THRESHOLD;
  gap: number;
  admissibilityThreshold: number;
}

type SimulationVerdictReason =
  | SimulationVerdictEliminatoryReason
  | SimulationVerdictScoreReason;

export interface SimulationVerdictDto {
  verdict: SimulationVerdict;
  reason: SimulationVerdictReason | null;
}

interface SimulationVerdictAxisInput {
  axis: AxisType;
  score: number;
  isCritical: boolean;
}

interface SimulationVerdictInput {
  globalScore: number;
  admissibilityThreshold: number;
  eliminatoryThreshold: number;
  axes: SimulationVerdictAxisInput[];
}

export function computeSimulationVerdict(
  input: SimulationVerdictInput,
): SimulationVerdictDto {
  const eliminatoryAxes = input.axes
    .filter(
      (entry) =>
        entry.isCritical && entry.score < input.eliminatoryThreshold,
    )
    .map((entry) => entry.axis);
  if (eliminatoryAxes.length > 0) {
    return {
      verdict: SimulationVerdict.UNFAVORABLE,
      reason: {
        kind: SimulationVerdictReasonKind.ELIMINATORY_AXES,
        axes: eliminatoryAxes,
        eliminatoryThreshold: input.eliminatoryThreshold,
      },
    };
  }
  if (input.globalScore < input.admissibilityThreshold) {
    return {
      verdict: SimulationVerdict.UNFAVORABLE,
      reason: {
        kind: SimulationVerdictReasonKind.GLOBAL_SCORE_BELOW_THRESHOLD,
        gap:
          Math.round((input.admissibilityThreshold - input.globalScore) * 10) /
          10,
        admissibilityThreshold: input.admissibilityThreshold,
      },
    };
  }
  return { verdict: SimulationVerdict.FAVORABLE, reason: null };
}

export function simulationVerdictFromAdmissibility(
  isAdmissible: boolean,
): SimulationVerdict {
  return isAdmissible
    ? SimulationVerdict.FAVORABLE
    : SimulationVerdict.UNFAVORABLE;
}
