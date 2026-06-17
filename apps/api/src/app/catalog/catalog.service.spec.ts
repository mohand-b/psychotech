import { NotFoundException } from '@nestjs/common';
import { AxisType, Sector } from '@psychotech/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CatalogRepository } from './catalog.repository';
import { CatalogService } from './catalog.service';

const repository = {
  findAllSectors: vi.fn(),
  findSectorReferential: vi.fn(),
};

const service = new CatalogService(repository as unknown as CatalogRepository);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CatalogService.getSectorReferential', () => {
  it('rejects an unknown sector code with a 404 without hitting the repository', async () => {
    await expect(service.getSectorReferential('UNKNOWN')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repository.findSectorReferential).not.toHaveBeenCalled();
  });

  it('rejects a known code with no configuration with a 404', async () => {
    repository.findSectorReferential.mockResolvedValue(null);

    await expect(service.getSectorReferential('AVIATION')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns the composed referential for an existing sector', async () => {
    repository.findSectorReferential.mockResolvedValue({
      code: Sector.RAILWAY,
      label: 'Ferroviaire',
      isActive: true,
      admissibilityThreshold: 70,
      vigilanceThreshold: 65,
      eliminatoryThreshold: 55,
      weights: [
        { axis: AxisType.MEMORY, coefficient: 1.2, isCritical: true, order: 1 },
        { axis: AxisType.LOGIC, coefficient: 1.0, isCritical: false, order: 0 },
      ],
    });

    const referential = await service.getSectorReferential('RAILWAY');

    expect(referential.code).toBe(Sector.RAILWAY);
    expect(referential.axes.map((axis) => axis.code)).toEqual([
      AxisType.LOGIC,
      AxisType.MEMORY,
    ]);
  });
});

describe('CatalogService.getSectors', () => {
  it('maps the sector records to summaries', async () => {
    repository.findAllSectors.mockResolvedValue([
      { code: Sector.RAILWAY, label: 'Ferroviaire', isActive: true },
      { code: Sector.SECURITY, label: 'Sécurité', isActive: false },
    ]);

    expect(await service.getSectors()).toEqual([
      { code: Sector.RAILWAY, label: 'Ferroviaire', isActive: true },
      { code: Sector.SECURITY, label: 'Sécurité', isActive: false },
    ]);
  });
});
