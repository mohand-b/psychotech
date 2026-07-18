import { AxisType, ControlModality, LogicFamily } from '../enums';

export interface LogicFamilyMetricsEntry {
  family: LogicFamily;
  errors: number;
  timeMs: number;
}

export interface LogicMetrics {
  axis: AxisType.LOGIC;
  pointsEarned: number;
  itemsProcessed: number;
  familyBreakdown?: LogicFamilyMetricsEntry[];
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

export type MotricitySegmentKind = 'H' | 'V' | 'DIAG';

export interface MotricityTimelinePoint {
  tMs: number;
  deviationPct: number;
}

export interface MotricityCourseTimeline {
  courseIndex: number;
  points: MotricityTimelinePoint[];
}

export type MotricityErrorEventType = 'CONTACT' | 'EXIT';

export interface MotricityErrorEvent {
  courseIndex: number;
  tMs: number;
  type: MotricityErrorEventType;
  segment: MotricitySegmentKind;
  durationMs?: number;
}

export interface MotorSkillsCourseRecap {
  index: number;
  minorErrors: number;
  majorErrors: number;
  progressionPct: number;
  tReelMs: number;
  avgLatencyMs: number | null;
  jitterMs: number | null;
}

export interface MotorSkillsMetrics {
  axis: AxisType.MOTOR_SKILLS;
  minorErrors: number;
  majorErrors: number;
  totalTimeMs: number;
  coursesCompleted: number;
  controlModality: ControlModality | null;
  handIndependence?: number;
  courses: MotorSkillsCourseRecap[];
  timeline: MotricityCourseTimeline[];
  events: MotricityErrorEvent[];
}

export type AxisMetrics =
  | LogicMetrics
  | MemoryMetrics
  | VisualDiscriminationMetrics
  | ReactivityMetrics
  | MotorSkillsMetrics;
