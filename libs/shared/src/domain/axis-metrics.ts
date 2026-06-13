import { AxisType } from '../enums';

export interface LogicMetrics {
  axis: AxisType.LOGIC;
  precision: number;
  itemsAnswered: number;
  itemsSkipped: number;
  avgTimePerItemMs: number;
  accuracyByType: {
    numeric: number;
    letters: number;
    symbols: number;
    mixed: number;
  };
}

export interface MemoryMetrics {
  axis: AxisType.MEMORY;
  maxLengthNormal: number;
  maxLengthInverse: number;
  errorProfile: {
    position: number;
    content: number;
  };
  dropOffStep: number;
}

export interface VisualDiscriminationMetrics {
  axis: AxisType.VISUAL_DISCRIMINATION;
  precision: number;
  avgDecisionTimeMs: number;
  falseAlarmRate: number;
  accuracyByLength: {
    short: number;
    medium: number;
    long: number;
  };
}

export interface ReactivityMetrics {
  axis: AxisType.REACTIVITY;
  meanReactionTimeMs: number;
  reactionTimeSd: number;
  anticipations: number;
  omissions: number;
  inhibitionErrors: number;
  fatigueDriftMsPerMin: number;
}

export interface MotorSkillsMetrics {
  axis: AxisType.MOTOR_SKILLS;
  scoresByCourse: [number, number, number];
  avgPrecisionPx: number;
  exits: number;
  handIndependence: number;
}

export type AxisMetrics =
  | LogicMetrics
  | MemoryMetrics
  | VisualDiscriminationMetrics
  | ReactivityMetrics
  | MotorSkillsMetrics;
