import { AxisType, Sector } from '../enums';

export interface AxisCatalogDto {
  code: AxisType;
  label: string;
  description: string;
}

export interface SectorSummaryDto {
  code: Sector;
  label: string;
  isActive: boolean;
}

export interface SectorAxisDto {
  code: AxisType;
  label: string;
  description: string;
  coefficient: number;
  isCritical: boolean;
}

export interface SectorReferentialDto {
  code: Sector;
  label: string;
  isActive: boolean;
  admissibilityThreshold: number;
  vigilanceThreshold: number;
  eliminatoryThreshold: number;
  axes: SectorAxisDto[];
}
