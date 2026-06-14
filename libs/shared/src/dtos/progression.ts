import { AxisFeaturedMetric, AxisType, ScoreBand } from '../enums';

export interface AxisBestDto {
  axis: AxisType;
  bestScore: number;
  band: ScoreBand;
  achievedAt: string;
}

export interface StreakDto {
  current: number;
  longest: number;
  lastActivityDate: string | null;
}

export interface ProgressionStatsDto {
  currentStreak: number;
  longestStreak: number;
  completedSessions: number;
  firstSessionAt: string | null;
  bestGlobalScore: number | null;
}

export interface EvolutionPointDto {
  sessionId: string;
  date: string;
  globalScore: number;
  band: ScoreBand;
}

export interface AxisSparklinePointDto {
  date: string;
  score: number;
}

export interface AxisFeaturedMetricDto {
  metric: AxisFeaturedMetric;
  value: number;
}

export interface AxisProgressionDto {
  axis: AxisType;
  currentScore: number | null;
  band: ScoreBand | null;
  deltaOver30Days: number | null;
  sparkline: AxisSparklinePointDto[];
  featuredMetric: AxisFeaturedMetricDto | null;
}

export interface RadarAxisScoreDto {
  axis: AxisType;
  score: number | null;
}

export interface ProgressionRadarDto {
  first: RadarAxisScoreDto[];
  last: RadarAxisScoreDto[];
}

export interface ProgressionDto {
  stats: ProgressionStatsDto;
  evolution: EvolutionPointDto[];
  axes: AxisProgressionDto[];
  radar: ProgressionRadarDto;
}
