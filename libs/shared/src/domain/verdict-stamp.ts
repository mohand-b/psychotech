import { SimulationVerdict } from './simulation-verdict';

export enum SimulationStampQualifier {
  SOLID = 'SOLID',
  NET = 'NET',
  JUST = 'JUST',
  ELIMINATORY = 'ELIMINATORY',
  BORDERLINE = 'BORDERLINE',
  INSUFFICIENT = 'INSUFFICIENT',
}

export enum AxisStampWord {
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
  [SimulationStampQualifier.SOLID]: 'Solide',
  [SimulationStampQualifier.NET]: 'Net',
  [SimulationStampQualifier.JUST]: 'Juste',
  [SimulationStampQualifier.ELIMINATORY]: 'Éliminatoire',
  [SimulationStampQualifier.BORDERLINE]: 'Limite',
  [SimulationStampQualifier.INSUFFICIENT]: 'Insuffisant',
};

export const AXIS_STAMP_WORD_LABELS: Record<AxisStampWord, string> = {
  [AxisStampWord.SOLID]: 'Solide',
  [AxisStampWord.GOOD]: 'Bon',
  [AxisStampWord.FRAGILE]: 'Fragile',
  [AxisStampWord.WEAK]: 'Faible',
  [AxisStampWord.ELIMINATORY]: 'Éliminatoire',
};

export const SIMULATION_STAMP_SOLID_MARGIN = 15;
export const SIMULATION_STAMP_NET_MARGIN = 5;
export const SIMULATION_STAMP_INSUFFICIENT_GAP = 5;

export const AXIS_STAMP_SOLID_MIN = 85;
export const AXIS_STAMP_GOOD_MIN = 70;
export const AXIS_STAMP_FRAGILE_MIN = 60;

export interface SimulationStamp {
  verdict: SimulationVerdict;
  qualifier: SimulationStampQualifier;
  date: string;
}

export interface AxisStamp {
  word: AxisStampWord;
  isEliminatory: boolean;
}

export interface AxisStampThresholds {
  isCritical: boolean;
  eliminatoryThreshold: number;
}

function formatStampDate(completedAt: string): string {
  const date = new Date(completedAt);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}

export function buildSimulationStamp(
  globalScore: number,
  admissibilityThreshold: number,
  isEliminatory: boolean,
  completedAt: string,
): SimulationStamp {
  const date = formatStampDate(completedAt);
  if (isEliminatory) {
    return {
      verdict: SimulationVerdict.UNFAVORABLE,
      qualifier: SimulationStampQualifier.ELIMINATORY,
      date,
    };
  }
  const gap = globalScore - admissibilityThreshold;
  if (gap >= SIMULATION_STAMP_SOLID_MARGIN) {
    return {
      verdict: SimulationVerdict.FAVORABLE,
      qualifier: SimulationStampQualifier.SOLID,
      date,
    };
  }
  if (gap >= SIMULATION_STAMP_NET_MARGIN) {
    return {
      verdict: SimulationVerdict.FAVORABLE,
      qualifier: SimulationStampQualifier.NET,
      date,
    };
  }
  if (gap >= 0) {
    return {
      verdict: SimulationVerdict.FAVORABLE,
      qualifier: SimulationStampQualifier.JUST,
      date,
    };
  }
  if (gap > -SIMULATION_STAMP_INSUFFICIENT_GAP) {
    return {
      verdict: SimulationVerdict.UNFAVORABLE,
      qualifier: SimulationStampQualifier.BORDERLINE,
      date,
    };
  }
  return {
    verdict: SimulationVerdict.UNFAVORABLE,
    qualifier: SimulationStampQualifier.INSUFFICIENT,
    date,
  };
}

export function buildAxisStamp(
  score: number,
  thresholds: AxisStampThresholds,
): AxisStamp {
  if (thresholds.isCritical && score < thresholds.eliminatoryThreshold) {
    return { word: AxisStampWord.ELIMINATORY, isEliminatory: true };
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
