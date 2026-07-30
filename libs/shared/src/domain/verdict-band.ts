export enum VerdictTone {
  GOOD = 'GOOD',
  WEAK = 'WEAK',
  BAD = 'BAD',
}

export enum AxisStampWord {
  EXCELLENT = 'EXCELLENT',
  SOLID = 'SOLID',
  GOOD = 'GOOD',
  FRAGILE = 'FRAGILE',
  WEAK = 'WEAK',
  ELIMINATORY = 'ELIMINATORY',
}

const AXIS_STAMP_EXCELLENT_MIN = 95;
const AXIS_STAMP_SOLID_MIN = 85;
const AXIS_STAMP_GOOD_MIN = 70;
const AXIS_STAMP_FRAGILE_MIN = 60;
const AXIS_STAMP_WEAK_MIN = 0;
export const AXIS_STAMP_MAX = 100;

export const VERDICT_GOOD_MIN = AXIS_STAMP_GOOD_MIN;
export const VERDICT_WEAK_MIN = AXIS_STAMP_FRAGILE_MIN;

export interface VerdictWordPresentation {
  label: string;
  tone: VerdictTone;
}

export const VERDICT_WORD_PRESENTATION: Record<
  AxisStampWord,
  VerdictWordPresentation
> = {
  [AxisStampWord.EXCELLENT]: { label: 'Excellent', tone: VerdictTone.GOOD },
  [AxisStampWord.SOLID]: { label: 'Solide', tone: VerdictTone.GOOD },
  [AxisStampWord.GOOD]: { label: 'Bon', tone: VerdictTone.GOOD },
  [AxisStampWord.FRAGILE]: { label: 'Fragile', tone: VerdictTone.WEAK },
  [AxisStampWord.WEAK]: { label: 'Faible', tone: VerdictTone.BAD },
  [AxisStampWord.ELIMINATORY]: {
    label: 'Éliminatoire',
    tone: VerdictTone.BAD,
  },
};

export const AXIS_STAMP_WORD_LABELS: Record<AxisStampWord, string> =
  Object.fromEntries(
    Object.entries(VERDICT_WORD_PRESENTATION).map(([word, presentation]) => [
      word,
      presentation.label,
    ]),
  ) as Record<AxisStampWord, string>;

interface VerdictScaleStep {
  min: number;
  word: AxisStampWord;
}

export const VERDICT_SCALE: readonly VerdictScaleStep[] = [
  { min: AXIS_STAMP_EXCELLENT_MIN, word: AxisStampWord.EXCELLENT },
  { min: AXIS_STAMP_SOLID_MIN, word: AxisStampWord.SOLID },
  { min: AXIS_STAMP_GOOD_MIN, word: AxisStampWord.GOOD },
  { min: AXIS_STAMP_FRAGILE_MIN, word: AxisStampWord.FRAGILE },
  { min: AXIS_STAMP_WEAK_MIN, word: AxisStampWord.WEAK },
];

export interface VerdictBand {
  word: AxisStampWord;
  label: string;
  tone: VerdictTone;
  rangeLabel: string;
  isEliminatory: boolean;
}

export interface AxisEliminatoryRule {
  isCritical: boolean;
  eliminatoryThreshold: number;
}

function stepRangeLabel(index: number): string {
  const step = VERDICT_SCALE[index];
  const upperBound =
    index === 0 ? AXIS_STAMP_MAX : VERDICT_SCALE[index - 1].min - 1;
  return `${step.min} – ${upperBound}`;
}

function toBand(
  word: AxisStampWord,
  rangeLabel: string,
  isEliminatory: boolean,
): VerdictBand {
  const presentation = VERDICT_WORD_PRESENTATION[word];
  return {
    word,
    label: presentation.label,
    tone: presentation.tone,
    rangeLabel,
    isEliminatory,
  };
}

export function resolveVerdictBand(
  score: number,
  rule?: AxisEliminatoryRule | null,
): VerdictBand {
  if (rule && rule.isCritical && score < rule.eliminatoryThreshold) {
    return toBand(
      AxisStampWord.ELIMINATORY,
      `< ${rule.eliminatoryThreshold}`,
      true,
    );
  }
  const index = VERDICT_SCALE.findIndex((step) => score >= step.min);
  const resolved = index === -1 ? VERDICT_SCALE.length - 1 : index;
  return toBand(VERDICT_SCALE[resolved].word, stepRangeLabel(resolved), false);
}

export function resolveVerdictTone(
  score: number,
  rule?: AxisEliminatoryRule | null,
): VerdictTone {
  return resolveVerdictBand(score, rule).tone;
}
