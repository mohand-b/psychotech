import { AxisType } from '@psychotech/shared';

export const SCORE_MIN = 0;

export const SCORE_BAND_THRESHOLDS = {
  excellent: 80,
  acceptable: 70,
  fragile: 60,
} as const;

export const VISUAL_TOTAL_TRIALS = 36;

export const AXIS_LABELS: Record<AxisType, string> = {
  [AxisType.LOGIC]: 'Logique',
  [AxisType.MEMORY]: 'Mémoire',
  [AxisType.VISUAL_DISCRIMINATION]: 'Discrimination visuelle',
  [AxisType.REACTIVITY]: 'Réactivité',
  [AxisType.MOTOR_SKILLS]: 'Motricité',
  [AxisType.ATTENTION]: 'Attention',
  [AxisType.NUMERICAL]: 'Numérique',
  [AxisType.VERBAL]: 'Verbal',
  [AxisType.SPATIAL]: 'Spatial',
};
