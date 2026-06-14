import { Injectable } from '@nestjs/common';
import { AxisType as DbAxisType } from '@prisma/client';
import { AxisType, ScoreBand } from '@psychotech/shared';
import { mapEnumValue } from '../common/enum.util';
import { PrismaService } from '../prisma/prisma.service';
import {
  AxisTimelinePoint,
  EvolutionInput,
  RadarAxisScore,
} from './progression.logic';

export interface StreakSummary {
  current: number;
  longest: number;
}

@Injectable()
export class ProgressionRepository {
  constructor(private readonly prisma: PrismaService) {}

  getStreak(userId: string): Promise<StreakSummary | null> {
    return this.prisma.streak.findUnique({
      where: { userId },
      select: { current: true, longest: true },
    });
  }

  countCompletedSessions(userId: string): Promise<number> {
    return this.prisma.session.count({
      where: { userId, status: 'COMPLETED', mode: { in: ['FULL', 'TARGETED'] } },
    });
  }

  async getFirstSessionDate(userId: string): Promise<Date | null> {
    const aggregate = await this.prisma.session.aggregate({
      where: { userId, status: 'COMPLETED' },
      _min: { startedAt: true },
    });
    return aggregate._min.startedAt;
  }

  async getBestFullScore(userId: string): Promise<number | null> {
    const aggregate = await this.prisma.session.aggregate({
      where: {
        userId,
        status: 'COMPLETED',
        mode: 'FULL',
        globalScore: { not: null },
      },
      _max: { globalScore: true },
    });
    return aggregate._max.globalScore;
  }

  async getEvolution(userId: string, limit: number): Promise<EvolutionInput[]> {
    const rows = await this.prisma.session.findMany({
      where: {
        userId,
        status: 'COMPLETED',
        mode: 'FULL',
        globalScore: { not: null },
        globalBand: { not: null },
        completedAt: { not: null },
      },
      orderBy: { completedAt: 'desc' },
      take: limit,
      select: { id: true, globalScore: true, globalBand: true, completedAt: true },
    });
    const points: EvolutionInput[] = [];
    for (const row of rows) {
      if (row.globalScore === null || row.globalBand === null || row.completedAt === null) {
        continue;
      }
      points.push({
        sessionId: row.id,
        completedAt: row.completedAt,
        globalScore: row.globalScore,
        band: mapEnumValue(ScoreBand, row.globalBand),
      });
    }
    return points.reverse();
  }

  async getAxisHistory(
    userId: string,
    axis: AxisType,
    limit: number,
  ): Promise<AxisTimelinePoint[]> {
    const rows = await this.prisma.sessionAxis.findMany({
      where: {
        axis: mapEnumValue(DbAxisType, axis),
        normalizedScore: { not: null },
        band: { not: null },
        completedAt: { not: null },
        session: { userId, status: 'COMPLETED' },
      },
      orderBy: { completedAt: 'desc' },
      take: limit,
      select: { normalizedScore: true, band: true, completedAt: true, metrics: true },
    });
    const timeline: AxisTimelinePoint[] = [];
    for (const row of rows) {
      if (row.normalizedScore === null || row.band === null || row.completedAt === null) {
        continue;
      }
      timeline.push({
        date: row.completedAt,
        score: row.normalizedScore,
        band: mapEnumValue(ScoreBand, row.band),
        metrics: row.metrics,
      });
    }
    return timeline.reverse();
  }

  getFirstFullSession(userId: string): Promise<RadarAxisScore[] | null> {
    return this.getBoundaryFullSession(userId, 'asc');
  }

  getLastFullSession(userId: string): Promise<RadarAxisScore[] | null> {
    return this.getBoundaryFullSession(userId, 'desc');
  }

  private async getBoundaryFullSession(
    userId: string,
    order: 'asc' | 'desc',
  ): Promise<RadarAxisScore[] | null> {
    const session = await this.prisma.session.findFirst({
      where: { userId, status: 'COMPLETED', mode: 'FULL' },
      orderBy: { completedAt: order },
      select: { axisResults: { select: { axis: true, normalizedScore: true } } },
    });
    if (!session) {
      return null;
    }
    return session.axisResults.map((result) => ({
      axis: mapEnumValue(AxisType, result.axis),
      score: result.normalizedScore,
    }));
  }
}
