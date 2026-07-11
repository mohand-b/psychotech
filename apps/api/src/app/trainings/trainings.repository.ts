import { Injectable } from '@nestjs/common';
import {
  AxisBest,
  Sector as DbSector,
  Session,
  SessionMode as DbSessionMode,
  SessionStatus as DbSessionStatus,
} from '@prisma/client';
import { AxisType, Sector, SessionMode, SessionStatus } from '@psychotech/shared';
import { mapEnumValue } from '../common/enum.util';
import { PrismaService } from '../prisma/prisma.service';

export interface TrainingsSectorConfig {
  vigilanceThreshold: number;
  weights: { axis: AxisType; coefficient: number; order: number }[];
}

@Injectable()
export class TrainingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findSectorConfig(sector: Sector): Promise<TrainingsSectorConfig | null> {
    const config = await this.prisma.sectorConfig.findUnique({
      where: { sector: mapEnumValue(DbSector, sector) },
      include: {
        axisWeights: {
          select: { axis: true, coefficient: true, order: true },
        },
      },
    });
    if (!config || !config.isActive) {
      return null;
    }
    return {
      vigilanceThreshold: config.vigilanceThreshold,
      weights: config.axisWeights.map((weight) => ({
        axis: mapEnumValue(AxisType, weight.axis),
        coefficient: weight.coefficient,
        order: weight.order,
      })),
    };
  }

  findLastCompletedFullSession(
    userId: string,
    sector: Sector,
  ): Promise<Session | null> {
    return this.prisma.session.findFirst({
      where: {
        userId,
        sector: mapEnumValue(DbSector, sector),
        mode: mapEnumValue(DbSessionMode, SessionMode.FULL),
        status: mapEnumValue(DbSessionStatus, SessionStatus.COMPLETED),
      },
      orderBy: { completedAt: 'desc' },
    });
  }

  findAxisBests(userId: string): Promise<AxisBest[]> {
    return this.prisma.axisBest.findMany({ where: { userId } });
  }
}
