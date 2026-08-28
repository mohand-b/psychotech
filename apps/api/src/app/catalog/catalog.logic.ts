import {
  AxisCatalogDto,
  AxisType,
  FULL_SESSION_AXIS_ORDER,
  Sector,
  SectorReferentialDto,
  SectorSummaryDto,
  sectorAxisRank,
} from '@psychotech/shared';
import { AXIS_CATALOG } from './catalog.constants';

export interface SectorRecord {
  code: Sector;
  label: string;
  isActive: boolean;
}

interface SectorAxisWeightRecord {
  axis: AxisType;
  coefficient: number;
  isCritical: boolean;
  order: number;
}

export interface SectorReferentialRecord extends SectorRecord {
  admissibilityThreshold: number;
  vigilanceThreshold: number;
  eliminatoryThreshold: number;
  weights: SectorAxisWeightRecord[];
}

export function buildSectorSummaries(sectors: SectorRecord[]): SectorSummaryDto[] {
  return [...sectors]
    .sort((first, second) => {
      if (first.isActive !== second.isActive) {
        return first.isActive ? -1 : 1;
      }
      return first.label.localeCompare(second.label);
    })
    .map((sector) => ({
      code: sector.code,
      label: sector.label,
      isActive: sector.isActive,
    }));
}

export function buildSectorReferential(
  sector: SectorReferentialRecord,
): SectorReferentialDto {
  const axes = [...sector.weights]
    .sort(
      (first, second) =>
        sectorAxisRank(sector.code, first.axis) -
        sectorAxisRank(sector.code, second.axis),
    )
    .map((weight) => ({
      code: weight.axis,
      label: AXIS_CATALOG[weight.axis].label,
      description: AXIS_CATALOG[weight.axis].description,
      coefficient: weight.coefficient,
      isCritical: weight.isCritical,
    }));
  return {
    code: sector.code,
    label: sector.label,
    isActive: sector.isActive,
    admissibilityThreshold: sector.admissibilityThreshold,
    vigilanceThreshold: sector.vigilanceThreshold,
    eliminatoryThreshold: sector.eliminatoryThreshold,
    axes,
  };
}

export function buildAxisCatalog(): AxisCatalogDto[] {
  return FULL_SESSION_AXIS_ORDER.map((axis) => ({
    code: axis,
    label: AXIS_CATALOG[axis].label,
    description: AXIS_CATALOG[axis].description,
  }));
}

export function isKnownSector(code: string): code is Sector {
  return (Object.values(Sector) as string[]).includes(code);
}
