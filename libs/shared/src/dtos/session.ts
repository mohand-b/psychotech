import {
  AxisProgressStatus,
  AxisType,
  RecommendationPriority,
  ScoreBand,
  Sector,
  SessionMode,
  SessionStatus,
} from '../enums';
import { AxisMetrics } from '../domain';
import { ReactivityCommand } from '../exercises/reactivity/reactivity-stimulus';
import { BadgeDto } from './badge';

export interface TargetedSessionOptionsDto {
  helpEnabled: boolean;
}

export interface StartSessionDto {
  mode: SessionMode;
  sector: Sector;
  axis?: AxisType;
  options?: TargetedSessionOptionsDto;
}

export interface SubmitAxisResultDto {
  axis: AxisType;
  metrics?: AxisMetrics;
  skipped?: boolean;
}

export interface LogicItemAnswerDto {
  index: number;
  answerIndex: number | null;
  timeMs: number;
  helpUsed: boolean;
  visited: boolean;
}

export interface LogicRawResultDto {
  axis: AxisType.LOGIC;
  items: LogicItemAnswerDto[];
}

export interface MemorySequenceAnswerDto {
  index: number;
  input: number[];
  timeMs: number;
  timedOut: boolean;
}

export interface MemoryRawResultDto {
  axis: AxisType.MEMORY;
  sequences: MemorySequenceAnswerDto[];
}

export type DiscriminationAnswer = 'IDENTICAL' | 'DIFFERENT';

export interface ReactivityStimulusAnswerDto {
  index: number;
  commandPressed: ReactivityCommand | null;
  trMs: number | null;
}

export interface ReactivityWaitPressDto {
  atMs: number;
}

export interface ReactivityRawResultDto {
  axis: AxisType.REACTIVITY;
  stimuli: ReactivityStimulusAnswerDto[];
  waitPresses: ReactivityWaitPressDto[];
}

export interface DiscriminationTrialAnswerDto {
  index: number;
  answer: DiscriminationAnswer | null;
  timeMs: number;
}

export interface MotricitySampleDto {
  t: number;
  x: number;
  y: number;
}

export interface MotricityCourseTrajectoryDto {
  index: number;
  samples: MotricitySampleDto[];
}

export interface MotricityCourseResultDto {
  index: number;
  minorErrors: number;
  majorErrors: number;
  progressionPct: number;
  tReelMs: number;
}

export interface MotricityRawResultDto {
  axis: AxisType.MOTOR_SKILLS;
  courses: MotricityCourseResultDto[];
}

export interface DiscriminationRawResultDto {
  axis: AxisType.VISUAL_DISCRIMINATION;
  trials: DiscriminationTrialAnswerDto[];
}

export type AxisRawResultDto =
  | LogicRawResultDto
  | MemoryRawResultDto
  | DiscriminationRawResultDto
  | ReactivityRawResultDto
  | MotricityRawResultDto;

export interface CompleteTargetedSessionDto {
  axis: AxisType;
  items?: LogicItemAnswerDto[];
  sequences?: MemorySequenceAnswerDto[];
  trials?: DiscriminationTrialAnswerDto[];
  stimuli?: ReactivityStimulusAnswerDto[];
  waitPresses?: ReactivityWaitPressDto[];
  playedMs?: number;
  courses?: MotricityCourseTrajectoryDto[];
}

interface TargetedAxisResultBaseDto {
  sessionId: string;
  sector: Sector;
  seed: string;
  helpEnabled: boolean;
  score: number;
  band: ScoreBand;
  startedAt: string;
  completedAt: string;
  bestScore: number;
  isNewBest: boolean;
  isEqualBest: boolean;
  previousScore: number | null;
}

export interface TargetedLogicResultDto extends TargetedAxisResultBaseDto {
  axis: AxisType.LOGIC;
  items: LogicItemAnswerDto[];
}

export interface TargetedMemoryResultDto extends TargetedAxisResultBaseDto {
  axis: AxisType.MEMORY;
  sequences: MemorySequenceAnswerDto[];
}

export interface TargetedDiscriminationResultDto
  extends TargetedAxisResultBaseDto {
  axis: AxisType.VISUAL_DISCRIMINATION;
  trials: DiscriminationTrialAnswerDto[];
}

export interface TargetedReactivityResultDto
  extends TargetedAxisResultBaseDto {
  axis: AxisType.REACTIVITY;
  stimuli: ReactivityStimulusAnswerDto[];
  waitPresses: ReactivityWaitPressDto[];
}

export type TargetedAxisResultDto =
  | TargetedLogicResultDto
  | TargetedMemoryResultDto
  | TargetedDiscriminationResultDto
  | TargetedReactivityResultDto;

export interface RecommendationDto {
  axis: AxisType;
  priority: RecommendationPriority;
  code: string;
  label: string;
}

export interface SessionAxisResultDto {
  axis: AxisType;
  order: number;
  normalizedScore: number | null;
  band: ScoreBand | null;
  skipped: boolean;
  metrics: AxisMetrics | AxisRawResultDto | null;
  startedAt: string | null;
  completedAt: string | null;
}

export interface SessionDto {
  id: string;
  mode: SessionMode;
  sector: Sector;
  status: SessionStatus;
  seed: string;
  options: TargetedSessionOptionsDto;
  energyCost: number;
  currentAxisIndex: number;
  globalScore: number | null;
  globalBand: ScoreBand | null;
  isAdmissible: boolean | null;
  isEliminated: boolean | null;
  sectorThreshold: number;
  startedAt: string;
  completedAt: string | null;
  abandonedAt: string | null;
  axisResults: SessionAxisResultDto[];
  recommendations: RecommendationDto[];
}

export interface SessionHistoryItemDto {
  id: string;
  mode: SessionMode;
  axis: AxisType | null;
  sector: Sector;
  status: SessionStatus;
  finishedAt: string;
  durationSec: number;
  score: number | null;
  band: ScoreBand | null;
  axisReached: number | null;
  axisTotal: number;
}

export interface SessionHistoryPageDto {
  items: SessionHistoryItemDto[];
  nextCursor: string | null;
}

export interface CurrentSessionAxisDto {
  axis: AxisType;
  status: AxisProgressStatus;
}

export interface CurrentSessionDto {
  id: string;
  mode: SessionMode;
  sector: Sector;
  axes: CurrentSessionAxisDto[];
}

export interface SessionResultDto {
  sessionId: string;
  mode: SessionMode;
  sector: Sector;
  status: SessionStatus;
  globalScore: number | null;
  globalBand: ScoreBand | null;
  isAdmissible: boolean | null;
  isEliminated: boolean | null;
  sectorThreshold: number;
  axisResults: SessionAxisResultDto[];
  recommendations: RecommendationDto[];
  unlockedBadges: BadgeDto[];
  completedAt: string | null;
}
