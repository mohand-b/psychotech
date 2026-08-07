import { AxisType, ScoreBand, Sector } from '../enums';
import { EarnedBadgeDto } from './badge';
import {
  SimulationAppreciationDto,
  SimulationSummarySelectionDto,
  SimulationVerdictDto,
} from '../domain';

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
  earnedBadges?: EarnedBadgeDto[];
  sector: Sector;
  completedAt: string;
  globalScore: number;
  globalBand: ScoreBand;
  isAdmissible: boolean;
  isEliminated: boolean;
  verdict: SimulationVerdictDto;
  admissibilityThreshold: number;
  admissibilityGap: number;
  eliminatoryAxes: AxisType[];
  axes: SimulationAxisSummaryDto[];
  selection: SimulationSummarySelectionDto;
  appreciation: SimulationAppreciationDto;
}
