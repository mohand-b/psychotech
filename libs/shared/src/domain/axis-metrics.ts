import { AxisType } from '../enums';

export interface LogicMetrics {
  axis: AxisType.LOGIC;
  pointsEarned: number;
  itemsProcessed: number;
}

export interface MemoryMetrics {
  axis: AxisType.MEMORY;
  maxLengthNormal: number;
  maxLengthInverse: number;
}

export interface VisualDiscriminationMetrics {
  axis: AxisType.VISUAL_DISCRIMINATION;
  truePositives: number;
  trueNegatives: number;
  avgCorrectDecisionTimeMs: number;
  falsePositives: number;
  identicalPairs: number;
}

export interface ReactivityMetrics {
  axis: AxisType.REACTIVITY;
  meanReactionTimeMs: number;
  reactionTimeSd: number;
  anticipations: number;
  omissions: number;
  inhibitionErrors: number;
  totalTrials: number;
}

export interface MotorCourseMetrics {
  progression: number;
  avgDistanceToCenter: number;
  realTimeSeconds: number;
  exits: number;
  handCorrelation: number;
}

export interface MotorSkillsMetrics {
  axis: AxisType.MOTOR_SKILLS;
  courses: [MotorCourseMetrics, MotorCourseMetrics, MotorCourseMetrics];
}

export type AxisMetrics =
  | LogicMetrics
  | MemoryMetrics
  | VisualDiscriminationMetrics
  | ReactivityMetrics
  | MotorSkillsMetrics;
