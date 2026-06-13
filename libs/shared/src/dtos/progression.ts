import { AxisType, ScoreBand } from '../enums';

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
