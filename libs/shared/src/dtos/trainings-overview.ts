import { AxisType, ScoreBand } from '../enums';

export interface TrainingsLastSimulationDto {
  sessionId: string;
  globalScore: number;
  globalBand: ScoreBand;
  isAdmissible: boolean;
  isEliminated: boolean;
  sectorThreshold: number;
  completedAt: string;
}

export interface TrainingsAxisOverviewDto {
  axis: AxisType;
  bestScore: number | null;
  neverPlayed: boolean;
  isCriticalAxis: boolean;
  needsWork: boolean;
}

export interface TrainingsOverviewDto {
  lastSimulation: TrainingsLastSimulationDto | null;
  vigilanceThreshold: number;
  axes: TrainingsAxisOverviewDto[];
}
