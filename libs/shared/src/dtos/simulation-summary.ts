import { AxisType, ScoreBand, Sector } from '../enums';
import { SimulationSummarySelectionDto } from '../domain';

export interface SimulationObservableDto {
  label: string | null;
  value: string;
  caption: string | null;
}

export interface SimulationAxisSummaryDto {
  axis: AxisType;
  score: number;
  band: ScoreBand;
  isCritical: boolean;
  eliminatoryThreshold: number | null;
  vigilanceThreshold: number;
  observables: SimulationObservableDto[];
}

export interface SimulationSummaryDto {
  sessionId: string;
  sector: Sector;
  completedAt: string;
  globalScore: number;
  globalBand: ScoreBand;
  isAdmissible: boolean;
  isEliminated: boolean;
  admissibilityThreshold: number;
  admissibilityGap: number;
  eliminatoryAxes: AxisType[];
  axes: SimulationAxisSummaryDto[];
  selection: SimulationSummarySelectionDto;
}
