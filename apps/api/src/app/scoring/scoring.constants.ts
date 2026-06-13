import { AxisType } from '@psychotech/shared';

export const SCORE_MIN = 0;
export const SCORE_MAX = 100;

export const SCORE_BAND_THRESHOLDS = {
  excellent: 80,
  acceptable: 70,
  fragile: 60,
} as const;

export const MEMORY_REFERENCE_SPAN = 9;

export const REACTIVITY_BEST_MS = 250;
export const REACTIVITY_WORST_MS = 600;
export const REACTIVITY_ERROR_PENALTY = 2;

export const VISUAL_FALSE_ALARM_WEIGHT = 1;

export const MOTOR_EXIT_PENALTY = 1;
export const MOTOR_HAND_DEPENDENCE_PENALTY = 10;

export const AXIS_LABELS: Record<AxisType, string> = {
  [AxisType.LOGIC]: 'Logique',
  [AxisType.MEMORY]: 'Mémoire',
  [AxisType.VISUAL_DISCRIMINATION]: 'Discrimination visuelle',
  [AxisType.REACTIVITY]: 'Réactivité',
  [AxisType.MOTOR_SKILLS]: 'Motricité',
};
