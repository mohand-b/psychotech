import {
  AxisEliminatoryRule,
  AxisStampWord,
  SimulationVerdict,
  VERDICT_WORD_PRESENTATION,
  VerdictBand,
  VerdictTone,
  resolveVerdictBand,
} from '@psychotech/shared';

export const VERDICT_TONE_COLOR_VARS: Record<VerdictTone, string> = {
  [VerdictTone.GOOD]: 'var(--rating-good)',
  [VerdictTone.WEAK]: 'var(--rating-weak)',
  [VerdictTone.BAD]: 'var(--rating-bad)',
};

export const VERDICT_TONE_INK_VARS: Record<VerdictTone, string> = {
  [VerdictTone.GOOD]: 'var(--rating-good-ink)',
  [VerdictTone.WEAK]: 'var(--rating-weak-ink)',
  [VerdictTone.BAD]: 'var(--rating-bad-ink)',
};

export const SIMULATION_VERDICT_TONES: Record<SimulationVerdict, VerdictTone> =
  {
    [SimulationVerdict.FAVORABLE]: VerdictTone.GOOD,
    [SimulationVerdict.UNFAVORABLE]: VerdictTone.BAD,
  };

export interface VerdictAppearance extends VerdictBand {
  colorVar: string;
  inkVar: string;
}

export function resolveVerdictAppearance(
  score: number,
  rule?: AxisEliminatoryRule | null,
): VerdictAppearance {
  const band = resolveVerdictBand(score, rule);
  return {
    ...band,
    colorVar: VERDICT_TONE_COLOR_VARS[band.tone],
    inkVar: VERDICT_TONE_INK_VARS[band.tone],
  };
}

export function fullSessionVerdictColorVar(
  score: number,
  isEliminated: boolean,
): string {
  return isEliminated
    ? VERDICT_TONE_COLOR_VARS[VerdictTone.BAD]
    : resolveVerdictAppearance(score).colorVar;
}

export function verdictWordInkVar(word: AxisStampWord): string {
  return VERDICT_TONE_INK_VARS[VERDICT_WORD_PRESENTATION[word].tone];
}

export function simulationVerdictColorVar(verdict: SimulationVerdict): string {
  return VERDICT_TONE_COLOR_VARS[SIMULATION_VERDICT_TONES[verdict]];
}

export function simulationVerdictInkVar(verdict: SimulationVerdict): string {
  return VERDICT_TONE_INK_VARS[SIMULATION_VERDICT_TONES[verdict]];
}
