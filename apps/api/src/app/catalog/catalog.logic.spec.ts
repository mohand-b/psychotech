import { AxisType, Sector } from '@psychotech/shared';
import { describe, expect, it } from 'vitest';
import { AXIS_CATALOG } from './catalog.constants';
import {
  SectorReferentialRecord,
  buildAxisCatalog,
  buildSectorReferential,
  buildSectorSummaries,
  isKnownSector,
} from './catalog.logic';

describe('buildSectorSummaries', () => {
  it('preserves the active and inactive flags', () => {
    expect(
      buildSectorSummaries([
        { code: Sector.RAILWAY, label: 'Ferroviaire', isActive: true },
        { code: Sector.AVIATION, label: 'Aérien', isActive: false },
      ]),
    ).toEqual([
      { code: Sector.RAILWAY, label: 'Ferroviaire', isActive: true },
      { code: Sector.AVIATION, label: 'Aérien', isActive: false },
    ]);
  });
});

describe('buildSectorReferential', () => {
  const record: SectorReferentialRecord = {
    code: Sector.RAILWAY,
    label: 'Ferroviaire',
    isActive: true,
    admissibilityThreshold: 70,
    vigilanceThreshold: 65,
    eliminatoryThreshold: 55,
    weights: [
      { axis: AxisType.REACTIVITY, coefficient: 1.4, isCritical: true, order: 3 },
      { axis: AxisType.LOGIC, coefficient: 1.0, isCritical: false, order: 0 },
      { axis: AxisType.MEMORY, coefficient: 1.2, isCritical: true, order: 1 },
    ],
  };

  it('sorts the axes by order', () => {
    const referential = buildSectorReferential(record);
    expect(referential.axes.map((axis) => axis.code)).toEqual([
      AxisType.LOGIC,
      AxisType.MEMORY,
      AxisType.REACTIVITY,
    ]);
  });

  it('enriches each axis with its catalog label, description, coefficient and criticality', () => {
    const referential = buildSectorReferential(record);
    expect(referential.axes[0]).toEqual({
      code: AxisType.LOGIC,
      label: AXIS_CATALOG[AxisType.LOGIC].label,
      description: AXIS_CATALOG[AxisType.LOGIC].description,
      coefficient: 1.0,
      isCritical: false,
    });
  });

  it('carries the sector thresholds and metadata', () => {
    const referential = buildSectorReferential(record);
    expect(referential).toMatchObject({
      code: Sector.RAILWAY,
      label: 'Ferroviaire',
      isActive: true,
      admissibilityThreshold: 70,
      vigilanceThreshold: 65,
      eliminatoryThreshold: 55,
    });
  });
});

describe('buildAxisCatalog', () => {
  it('returns the five axes in the canonical order with labels and descriptions', () => {
    const axes = buildAxisCatalog();
    expect(axes.map((axis) => axis.code)).toEqual([
      AxisType.LOGIC,
      AxisType.MEMORY,
      AxisType.VISUAL_DISCRIMINATION,
      AxisType.REACTIVITY,
      AxisType.MOTOR_SKILLS,
    ]);
    expect(axes[1]).toEqual({
      code: AxisType.MEMORY,
      label: AXIS_CATALOG[AxisType.MEMORY].label,
      description: AXIS_CATALOG[AxisType.MEMORY].description,
    });
  });
});

describe('isKnownSector', () => {
  it('recognizes valid sector codes', () => {
    expect(isKnownSector('RAILWAY')).toBe(true);
    expect(isKnownSector('AVIATION')).toBe(true);
  });

  it('rejects unknown codes', () => {
    expect(isKnownSector('UNKNOWN')).toBe(false);
    expect(isKnownSector('railway')).toBe(false);
  });
});
