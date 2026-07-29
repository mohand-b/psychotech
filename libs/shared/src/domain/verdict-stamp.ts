import { SimulationVerdict } from './simulation-verdict';
import {
  AxisEliminatoryRule,
  AxisStampWord,
  resolveVerdictBand,
} from './verdict-band';

export enum SimulationStampQualifier {
  EXCELLENT = 'EXCELLENT',
  SOLID = 'SOLID',
  COMFORTABLE = 'COMFORTABLE',
  JUST = 'JUST',
  ELIMINATORY = 'ELIMINATORY',
  BORDERLINE = 'BORDERLINE',
  INSUFFICIENT = 'INSUFFICIENT',
}

export const SIMULATION_STAMP_QUALIFIER_LABELS: Record<
  SimulationStampQualifier,
  string
> = {
  [SimulationStampQualifier.EXCELLENT]: 'Excellent',
  [SimulationStampQualifier.SOLID]: 'Solide',
  [SimulationStampQualifier.COMFORTABLE]: 'Confortable',
  [SimulationStampQualifier.JUST]: 'Juste',
  [SimulationStampQualifier.ELIMINATORY]: 'Éliminatoire',
  [SimulationStampQualifier.BORDERLINE]: 'Limite',
  [SimulationStampQualifier.INSUFFICIENT]: 'Insuffisant',
};

export const SIMULATION_STAMP_EXCELLENT_MARGIN = 25;
export const SIMULATION_STAMP_SOLID_MARGIN = 15;
export const SIMULATION_STAMP_COMFORTABLE_MARGIN = 5;
export const SIMULATION_STAMP_INSUFFICIENT_GAP = 5;

export interface SimulationStamp {
  verdict: SimulationVerdict;
  qualifier: SimulationStampQualifier;
}

export interface AxisStamp {
  word: AxisStampWord;
  isEliminatory: boolean;
}

export type AxisStampThresholds = AxisEliminatoryRule;

export function buildSimulationStamp(
  globalScore: number,
  admissibilityThreshold: number,
  isEliminatory: boolean,
): SimulationStamp {
  const gap = globalScore - admissibilityThreshold;
  if (isEliminatory && gap >= 0) {
    return {
      verdict: SimulationVerdict.UNFAVORABLE,
      qualifier: SimulationStampQualifier.ELIMINATORY,
    };
  }
  if (gap >= 0) {
    return {
      verdict: SimulationVerdict.FAVORABLE,
      qualifier:
        gap >= SIMULATION_STAMP_EXCELLENT_MARGIN
          ? SimulationStampQualifier.EXCELLENT
          : gap >= SIMULATION_STAMP_SOLID_MARGIN
            ? SimulationStampQualifier.SOLID
            : gap >= SIMULATION_STAMP_COMFORTABLE_MARGIN
              ? SimulationStampQualifier.COMFORTABLE
              : SimulationStampQualifier.JUST,
    };
  }
  return {
    verdict: SimulationVerdict.UNFAVORABLE,
    qualifier:
      gap > -SIMULATION_STAMP_INSUFFICIENT_GAP
        ? SimulationStampQualifier.BORDERLINE
        : SimulationStampQualifier.INSUFFICIENT,
  };
}

export function buildAxisStamp(
  score: number,
  thresholds: AxisStampThresholds,
): AxisStamp {
  const band = resolveVerdictBand(score, thresholds);
  return { word: band.word, isEliminatory: band.isEliminatory };
}
