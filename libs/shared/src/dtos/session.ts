import {
  AxisType,
  RecommendationPriority,
  ScoreBand,
  Sector,
  SessionMode,
  SessionStatus,
} from '../enums';
import { AxisMetrics } from '../domain';
import { BadgeDto } from './badge';

export interface StartSessionDto {
  mode: SessionMode;
  sector: Sector;
  axis?: AxisType;
}

export interface SubmitAxisResultDto {
  axis: AxisType;
  metrics?: AxisMetrics;
  skipped?: boolean;
}

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
  metrics: AxisMetrics | null;
  startedAt: string | null;
  completedAt: string | null;
}

export interface SessionDto {
  id: string;
  mode: SessionMode;
  sector: Sector;
  status: SessionStatus;
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
