import { AxisType, Sector } from '../enums';

export interface SectorAxisWeightDto {
  axis: AxisType;
  coefficient: number;
  isCritical: boolean;
}

export interface SectorConfigDto {
  sector: Sector;
  label: string;
  isActive: boolean;
  admissibilityThreshold: number;
  vigilanceThreshold: number;
  eliminatoryThreshold: number;
  axisWeights: SectorAxisWeightDto[];
}
