import {
  AxisProgressStatus,
  AxisType,
  ControlModality,
  LogicFamily,
  LogicFamilyFilter,
  RecommendationPriority,
  ScoreBand,
  Sector,
  SessionMode,
  SessionStatus,
} from '../enums';
import { DominoFace } from '../exercises/domino/domino-item';
import {
  AxisMetrics,
  MotorSkillsCourseRecap,
  MotorSkillsMetrics,
  TrainingOptionId,
} from '../domain';
import { ReactivityCommand } from '../exercises/reactivity/reactivity-stimulus';
import { BadgeDto } from './badge';

export interface TargetedSessionOptionsDto {
  enabledOptions: TrainingOptionId[];
  logicFamily?: LogicFamilyFilter | null;
}

export interface StartSessionDto {
  mode: SessionMode;
  sector: Sector;
  axis?: AxisType;
  options?: TargetedSessionOptionsDto;
}

export interface LogicItemAnswerDto {
  index: number;
  answerIndex: number | null;
  dominoTop?: DominoFace | null;
  dominoBottom?: DominoFace | null;
  numericValue?: number | null;
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
  avgLatencyMs?: number;
  jitterMs?: number;
}

export type MotricityCourseResultDto = MotorSkillsCourseRecap;

export type MotricityRawResultDto = MotorSkillsMetrics;

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
  controlModality?: ControlModality;
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
  previousBestScore: number | null;
}

export type LogicFamilyResultMarker = 'STRENGTH' | 'WEAKNESS';

export interface LogicFamilyResultDto {
  family: LogicFamily;
  correct: number;
  attempted: number;
  total: number;
  ratePct: number;
  timeMs: number;
  marker: LogicFamilyResultMarker | null;
}

export interface TargetedLogicResultDto extends TargetedAxisResultBaseDto {
  axis: AxisType.LOGIC;
  items: LogicItemAnswerDto[];
  contentVersion: number;
  logicFamily: LogicFamilyFilter | null;
  families?: LogicFamilyResultDto[];
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

export interface TargetedMotricityResultDto extends TargetedAxisResultBaseDto {
  axis: AxisType.MOTOR_SKILLS;
  metrics: MotorSkillsMetrics;
}

export type TargetedAxisResultDto =
  | TargetedLogicResultDto
  | TargetedMemoryResultDto
  | TargetedDiscriminationResultDto
  | TargetedReactivityResultDto
  | TargetedMotricityResultDto;

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
  contentVersion: number;
  logicFamily: LogicFamilyFilter | null;
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
  controlModality: ControlModality | null;
  axisResults: SessionAxisResultDto[];
  recommendations: RecommendationDto[];
}

export interface SessionHistoryItemDto {
  id: string;
  mode: SessionMode;
  axis: AxisType | null;
  sector: Sector;
  status: SessionStatus;
  logicFamily: LogicFamilyFilter | null;
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
