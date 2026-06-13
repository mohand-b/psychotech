import {
  AxisType,
  DifficultyLevel,
  RecommendationPriority,
  ScoreBand,
  Sector,
  SessionMode,
  SessionStatus,
} from '../enums';
import { AxisMetrics } from '../domain';

export interface StartSessionDto {
  mode: SessionMode;
  sector: Sector;
  difficulty: DifficultyLevel;
}

export interface SubmitAxisResultDto {
  axis: AxisType;
  metrics: AxisMetrics;
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
  difficulty: DifficultyLevel;
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
