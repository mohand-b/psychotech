import { ScoreBand } from '@psychotech/shared';

export const VERDICT_LABELS: Record<ScoreBand, string> = {
  [ScoreBand.EXCELLENT]: 'Favorable',
  [ScoreBand.ACCEPTABLE]: 'Acceptable',
  [ScoreBand.FRAGILE]: 'Limite',
  [ScoreBand.INSUFFICIENT]: 'Défavorable',
};

export const BAND_COLOR_VARS: Record<ScoreBand, string> = {
  [ScoreBand.EXCELLENT]: 'var(--rating-good)',
  [ScoreBand.ACCEPTABLE]: 'var(--rating-ok)',
  [ScoreBand.FRAGILE]: 'var(--rating-weak)',
  [ScoreBand.INSUFFICIENT]: 'var(--rating-bad)',
};

export interface ScoreRating {
  band: ScoreBand;
  colorVar: string;
  label: string;
  range: string;
}

export function resolveScoreRating(score: number): ScoreRating {
  if (score >= 80) {
    return {
      band: ScoreBand.EXCELLENT,
      colorVar: 'var(--rating-good)',
      label: 'Très bon',
      range: '80 – 100',
    };
  }
  if (score >= 70) {
    return {
      band: ScoreBand.ACCEPTABLE,
      colorVar: 'var(--rating-ok)',
      label: 'Acceptable',
      range: '70 – 79',
    };
  }
  if (score >= 60) {
    return {
      band: ScoreBand.FRAGILE,
      colorVar: 'var(--rating-weak)',
      label: 'Fragile',
      range: '60 – 69',
    };
  }
  return {
    band: ScoreBand.INSUFFICIENT,
    colorVar: 'var(--rating-bad)',
    label: 'Insuffisant',
    range: '0 – 59',
  };
}
