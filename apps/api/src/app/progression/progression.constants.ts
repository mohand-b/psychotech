import { AxisType } from '@psychotech/shared';

export const PROGRESSION_AXIS_ORDER: AxisType[] = [
  AxisType.LOGIC,
  AxisType.MEMORY,
  AxisType.VISUAL_DISCRIMINATION,
  AxisType.REACTIVITY,
  AxisType.MOTOR_SKILLS,
];

export const PROGRESSION_EVOLUTION_LIMIT = 20;
export const PROGRESSION_AXIS_HISTORY_LIMIT = 30;
export const PROGRESSION_SPARKLINE_LIMIT = 10;
export const PROGRESSION_DELTA_WINDOW_DAYS = 30;

export const MS_PER_DAY = 86400000;
