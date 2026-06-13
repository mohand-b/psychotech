import { AxisType } from '@psychotech/shared';

export const SCORE_MIN = 0;
export const SCORE_MAX = 100;

export const SCORE_BAND_THRESHOLDS = {
  excellent: 80,
  acceptable: 70,
  fragile: 60,
} as const;

export const LOGIC_PRECISION_DIVISOR = 60;
export const LOGIC_COVERAGE_TOTAL_ITEMS = 20;
export const LOGIC_PRECISION_WEIGHT = 0.85;
export const LOGIC_COVERAGE_WEIGHT = 0.15;

export const MEMORY_NORMAL_MIN = 3;
export const MEMORY_NORMAL_MAX = 9;
export const MEMORY_INVERSE_MIN = 2;
export const MEMORY_INVERSE_MAX = 8;
export const MEMORY_NORMAL_WEIGHT = 0.4;
export const MEMORY_INVERSE_WEIGHT = 0.6;

export const VISUAL_TOTAL_TRIALS = 36;
export const VISUAL_SPEED_EXCELLENT_MS = 300;
export const VISUAL_SPEED_POOR_MS = 1500;
export const VISUAL_FALSE_POSITIVE_THRESHOLD_PCT = 20;
export const VISUAL_FALSE_POSITIVE_PENALTY_FACTOR = 0.5;
export const VISUAL_PRECISION_WEIGHT = 0.7;
export const VISUAL_SPEED_WEIGHT = 0.3;

export const REACTIVITY_SPEED_EXCELLENT_MS = 250;
export const REACTIVITY_SPEED_POOR_MS = 800;
export const REACTIVITY_STABILITY_EXCELLENT_MS = 30;
export const REACTIVITY_STABILITY_POOR_MS = 200;
export const REACTIVITY_SPEED_WEIGHT = 0.5;
export const REACTIVITY_STABILITY_WEIGHT = 0.3;
export const REACTIVITY_ACCURACY_WEIGHT = 0.2;

export const MOTOR_PRECISION_EXCELLENT_PX = 2;
export const MOTOR_PRECISION_POOR_PX = 30;
export const MOTOR_SPEED_EXCELLENT_S = 20;
export const MOTOR_SPEED_POOR_S = 90;
export const MOTOR_FULL_PROGRESSION = 100;
export const MOTOR_EXIT_PENALTY_PER_EXIT = 10;
export const MOTOR_INDEPENDENCE_BONUS = 5;
export const MOTOR_INDEPENDENCE_GOOD_THRESHOLD = 0.3;
export const MOTOR_INDEPENDENCE_BAD_THRESHOLD = 0.7;
export const MOTOR_PROGRESSION_WEIGHT = 0.4;
export const MOTOR_PRECISION_WEIGHT = 0.25;
export const MOTOR_SPEED_WEIGHT = 0.2;
export const MOTOR_EXITS_WEIGHT = 0.15;
export const MOTOR_THIRD_COURSE_WEIGHT = 1.5;
export const MOTOR_COURSE_AGGREGATE_DIVISOR = 3.5;

export const AXIS_LABELS: Record<AxisType, string> = {
  [AxisType.LOGIC]: 'Logique',
  [AxisType.MEMORY]: 'Mémoire',
  [AxisType.VISUAL_DISCRIMINATION]: 'Discrimination visuelle',
  [AxisType.REACTIVITY]: 'Réactivité',
  [AxisType.MOTOR_SKILLS]: 'Motricité',
};
