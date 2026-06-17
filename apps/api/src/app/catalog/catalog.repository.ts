import { Injectable } from '@nestjs/common';
import { Sector as DbSector } from '@prisma/client';
import { AxisType, Sector } from '@psychotech/shared';
import { mapEnumValue } from '../common/enum.util';
import { PrismaService } from '../prisma/prisma.service';
import { SectorRecord, SectorReferentialRecord } from './catalog.logic';

@Injectable()
export class CatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllSectors(): Promise<SectorRecord[]> {
    const rows = await this.prisma.sectorConfig.findMany({
      orderBy: { sector: 'asc' },
      select: { sector: true, label: true, isActive: true },
    });
    return rows.map((row) => ({
      code: mapEnumValue(Sector, row.sector),
      label: row.label,
      isActive: row.isActive,
    }));
  }

  async findSectorReferential(
    code: Sector,
  ): Promise<SectorReferentialRecord | null> {
    const config = await this.prisma.sectorConfig.findUnique({
      where: { sector: mapEnumValue(DbSector, code) },
      include: {
        axisWeights: {
          select: { axis: true, coefficient: true, isCritical: true, order: true },
        },
      },
    });
    if (!config) {
      return null;
    }
    return {
      code: mapEnumValue(Sector, config.sector),
      label: config.label,
      isActive: config.isActive,
      admissibilityThreshold: config.admissibilityThreshold,
      vigilanceThreshold: config.vigilanceThreshold,
      eliminatoryThreshold: config.eliminatoryThreshold,
      weights: config.axisWeights.map((weight) => ({
        axis: mapEnumValue(AxisType, weight.axis),
        coefficient: weight.coefficient,
        isCritical: weight.isCritical,
        order: weight.order,
      })),
    };
  }
}
