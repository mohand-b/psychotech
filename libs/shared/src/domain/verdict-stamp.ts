import { SimulationVerdict } from './simulation-verdict';

export enum SimulationStampQualifier {
  EXCELLENT = 'EXCELLENT',
  SOLID = 'SOLID',
  COMFORTABLE = 'COMFORTABLE',
  JUST = 'JUST',
  ELIMINATORY = 'ELIMINATORY',
  BORDERLINE = 'BORDERLINE',
  INSUFFICIENT = 'INSUFFICIENT',
}

export enum AxisStampWord {
  EXCELLENT = 'EXCELLENT',
  SOLID = 'SOLID',
  GOOD = 'GOOD',
  FRAGILE = 'FRAGILE',
  WEAK = 'WEAK',
  ELIMINATORY = 'ELIMINATORY',
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

export const AXIS_STAMP_WORD_LABELS: Record<AxisStampWord, string> = {
  [AxisStampWord.EXCELLENT]: 'Excellent',
  [AxisStampWord.SOLID]: 'Solide',
  [AxisStampWord.GOOD]: 'Bon',
  [AxisStampWord.FRAGILE]: 'Fragile',
  [AxisStampWord.WEAK]: 'Faible',
  [AxisStampWord.ELIMINATORY]: 'Éliminatoire',
};

export const SIMULATION_STAMP_EXCELLENT_MARGIN = 25;
export const SIMULATION_STAMP_SOLID_MARGIN = 15;
export const SIMULATION_STAMP_COMFORTABLE_MARGIN = 5;
export const SIMULATION_STAMP_INSUFFICIENT_GAP = 5;

export const AXIS_STAMP_EXCELLENT_MIN = 95;
export const AXIS_STAMP_SOLID_MIN = 85;
export const AXIS_STAMP_GOOD_MIN = 70;
export const AXIS_STAMP_FRAGILE_MIN = 60;

export interface SimulationStamp {
  verdict: SimulationVerdict;
  qualifier: SimulationStampQualifier;
}

export interface AxisStamp {
  word: AxisStampWord;
  isEliminatory: boolean;
}

export interface AxisStampThresholds {
  isCritical: boolean;
  eliminatoryThreshold: number;
}

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
  if (thresholds.isCritical && score < thresholds.eliminatoryThreshold) {
    return { word: AxisStampWord.ELIMINATORY, isEliminatory: true };
  }
  if (score >= AXIS_STAMP_EXCELLENT_MIN) {
    return { word: AxisStampWord.EXCELLENT, isEliminatory: false };
  }
  if (score >= AXIS_STAMP_SOLID_MIN) {
    return { word: AxisStampWord.SOLID, isEliminatory: false };
  }
  if (score >= AXIS_STAMP_GOOD_MIN) {
    return { word: AxisStampWord.GOOD, isEliminatory: false };
  }
  if (score >= AXIS_STAMP_FRAGILE_MIN) {
    return { word: AxisStampWord.FRAGILE, isEliminatory: false };
  }
  return { word: AxisStampWord.WEAK, isEliminatory: false };
}
