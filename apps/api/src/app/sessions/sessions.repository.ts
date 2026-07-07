import { Injectable } from '@nestjs/common';
import {
  AxisType as DbAxisType,
  Prisma,
  RecommendationPriority as DbRecommendationPriority,
  ScoreBand as DbScoreBand,
  Sector as DbSector,
  SessionMode as DbSessionMode,
  SessionStatus as DbSessionStatus,
} from '@prisma/client';
import {
  AxisMetrics,
  AxisRawResultDto,
  AxisType,
  BadgeDto,
  RecommendationDto,
  ScoreBand,
  Sector,
  SessionMode,
} from '@psychotech/shared';
import { mapEnumValue } from '../common/enum.util';
import { PrismaService } from '../prisma/prisma.service';
import {
  SESSION_INCLUDE,
  SessionWithRelations,
} from './sessions.mappers';

export interface CompleteSessionResult {
  session: SessionWithRelations;
  unlockedBadges: BadgeDto[];
}

export interface CreateSessionParams {
  userId: string;
  mode: SessionMode;
  sector: Sector;
  seed: string;
  helpEnabled: boolean;
  energyCost: number;
  sectorThreshold: number;
  axes: AxisType[];
}

export interface SectorWeight {
  axis: AxisType;
  coefficient: number;
  isCritical: boolean;
}

export interface SectorConfigData {
  isActive: boolean;
  admissibilityThreshold: number;
  vigilanceThreshold: number;
  eliminatoryThreshold: number;
  weights: SectorWeight[];
}

export interface AxisResultUpdate {
  normalizedScore: number | null;
  band: ScoreBand | null;
  skipped: boolean;
  metrics: AxisMetrics | null;
  startedAt: Date;
  completedAt: Date;
}

export interface AxisBestInput {
  axis: AxisType;
  score: number;
  band: ScoreBand;
  sessionAxisId: string;
}

export interface CompleteSessionParams {
  sessionId: string;
  userId: string;
  globalScore: number;
  globalBand: ScoreBand;
  isAdmissible: boolean;
  isEliminated: boolean;
  completedAt: Date;
  axisCount: number;
  recommendations: RecommendationDto[];
  axisBests: AxisBestInput[];
  streak: { current: number; longest: number; lastActivityDate: Date };
}

export interface CompleteTargetedSessionParams {
  sessionId: string;
  userId: string;
  axis: AxisType;
  rawResult: AxisRawResultDto;
  score: { normalizedScore: number; band: ScoreBand } | null;
  startedAt: Date;
  completedAt: Date;
}

export interface StreakContext {
  timezone: string;
  streak: { current: number; longest: number; lastActivityDate: Date | null } | null;
}

export interface ListSessionsFilter {
  mode?: SessionMode;
  axis?: AxisType;
  from?: string;
  to?: string;
}

@Injectable()
export class SessionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(
    params: CreateSessionParams,
    spendWithinTx?: (
      client: Prisma.TransactionClient,
      sessionId: string,
    ) => Promise<void>,
  ): Promise<SessionWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.session.create({
        data: {
          userId: params.userId,
          mode: mapEnumValue(DbSessionMode, params.mode),
          sector: mapEnumValue(DbSector, params.sector),
          seed: params.seed,
          helpEnabled: params.helpEnabled,
          energyCost: params.energyCost,
          sectorThreshold: params.sectorThreshold,
          axisResults: {
            create: params.axes.map((axis, index) => ({
              axis: mapEnumValue(DbAxisType, axis),
              order: index,
            })),
          },
        },
      });
      if (spendWithinTx) {
        await spendWithinTx(tx, created.id);
      }
      return tx.session.findUniqueOrThrow({
        where: { id: created.id },
        include: SESSION_INCLUDE,
      });
    });
  }

  findUserSession(
    sessionId: string,
    userId: string,
  ): Promise<SessionWithRelations | null> {
    return this.prisma.session.findFirst({
      where: { id: sessionId, userId },
      include: SESSION_INCLUDE,
    });
  }

  async findSectorConfig(sector: Sector): Promise<SectorConfigData | null> {
    const config = await this.prisma.sectorConfig.findUnique({
      where: { sector: mapEnumValue(DbSector, sector) },
      include: { axisWeights: true },
    });
    if (!config) {
      return null;
    }
    return {
      isActive: config.isActive,
      admissibilityThreshold: config.admissibilityThreshold,
      vigilanceThreshold: config.vigilanceThreshold,
      eliminatoryThreshold: config.eliminatoryThreshold,
      weights: config.axisWeights.map((weight) => ({
        axis: mapEnumValue(AxisType, weight.axis),
        coefficient: weight.coefficient,
        isCritical: weight.isCritical,
      })),
    };
  }

  async findStreakContext(userId: string): Promise<StreakContext> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { streak: true },
    });
    return {
      timezone: user.timezone,
      streak: user.streak
        ? {
            current: user.streak.current,
            longest: user.streak.longest,
            lastActivityDate: user.streak.lastActivityDate,
          }
        : null,
    };
  }

  async updateAxisResult(
    sessionId: string,
    axis: AxisType,
    update: AxisResultUpdate,
  ): Promise<void> {
    await this.prisma.sessionAxis.update({
      where: { sessionId_axis: { sessionId, axis: mapEnumValue(DbAxisType, axis) } },
      data: {
        normalizedScore: update.normalizedScore,
        band: update.band ? mapEnumValue(DbScoreBand, update.band) : null,
        skipped: update.skipped,
        metrics:
          update.metrics === null
            ? Prisma.JsonNull
            : (update.metrics as unknown as Prisma.InputJsonValue),
        startedAt: update.startedAt,
        completedAt: update.completedAt,
      },
    });
  }

  async completeSession(
    params: CompleteSessionParams,
    unlockBadges: (client: Prisma.TransactionClient) => Promise<BadgeDto[]>,
  ): Promise<CompleteSessionResult> {
    return this.prisma.$transaction(async (tx) => {
      await tx.session.update({
        where: { id: params.sessionId },
        data: {
          status: DbSessionStatus.COMPLETED,
          globalScore: params.globalScore,
          globalBand: mapEnumValue(DbScoreBand, params.globalBand),
          isAdmissible: params.isAdmissible,
          isEliminated: params.isEliminated,
          completedAt: params.completedAt,
          currentAxisIndex: params.axisCount,
        },
      });
      if (params.recommendations.length > 0) {
        await tx.recommendation.createMany({
          data: params.recommendations.map((recommendation) => ({
            sessionId: params.sessionId,
            axis: mapEnumValue(DbAxisType, recommendation.axis),
            priority: mapEnumValue(DbRecommendationPriority, recommendation.priority),
            code: recommendation.code,
            label: recommendation.label,
          })),
        });
      }
      for (const best of params.axisBests) {
        await this.upsertAxisBest(tx, params.userId, params.completedAt, best);
      }
      await tx.streak.upsert({
        where: { userId: params.userId },
        update: {
          current: params.streak.current,
          longest: params.streak.longest,
          lastActivityDate: params.streak.lastActivityDate,
        },
        create: {
          userId: params.userId,
          current: params.streak.current,
          longest: params.streak.longest,
          lastActivityDate: params.streak.lastActivityDate,
        },
      });
      const unlockedBadges = await unlockBadges(tx);
      const session = await tx.session.findUniqueOrThrow({
        where: { id: params.sessionId },
        include: SESSION_INCLUDE,
      });
      return { session, unlockedBadges };
    });
  }

  async completeTargetedSession(
    params: CompleteTargetedSessionParams,
  ): Promise<SessionWithRelations> {
    await this.prisma.$transaction([
      this.prisma.sessionAxis.update({
        where: {
          sessionId_axis: {
            sessionId: params.sessionId,
            axis: mapEnumValue(DbAxisType, params.axis),
          },
        },
        data: {
          metrics: params.rawResult as unknown as Prisma.InputJsonValue,
          skipped: false,
          normalizedScore: params.score?.normalizedScore ?? null,
          band: params.score ? mapEnumValue(DbScoreBand, params.score.band) : null,
          startedAt: params.startedAt,
          completedAt: params.completedAt,
        },
      }),
      this.prisma.session.update({
        where: { id: params.sessionId },
        data: {
          status: DbSessionStatus.COMPLETED,
          completedAt: params.completedAt,
          currentAxisIndex: 1,
        },
      }),
    ]);
    const session = await this.prisma.session.findUniqueOrThrow({
      where: { id: params.sessionId },
      include: SESSION_INCLUDE,
    });
    if (params.score) {
      const axisRow = session.axisResults.find(
        (result) => result.axis === mapEnumValue(DbAxisType, params.axis),
      );
      if (axisRow) {
        await this.upsertAxisBest(this.prisma, params.userId, params.completedAt, {
          axis: params.axis,
          score: params.score.normalizedScore,
          band: params.score.band,
          sessionAxisId: axisRow.id,
        });
      }
    }
    return session;
  }

  async suspendSession(sessionId: string): Promise<void> {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { status: DbSessionStatus.SUSPENDED },
    });
  }

  async abandonSession(sessionId: string, abandonedAt: Date): Promise<void> {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { status: DbSessionStatus.ABANDONED, abandonedAt },
    });
  }

  listSessions(
    userId: string,
    filter: ListSessionsFilter,
  ): Promise<SessionWithRelations[]> {
    return this.prisma.session.findMany({
      where: {
        userId,
        mode: filter.mode ? mapEnumValue(DbSessionMode, filter.mode) : undefined,
        axisResults: filter.axis
          ? { some: { axis: mapEnumValue(DbAxisType, filter.axis) } }
          : undefined,
        startedAt:
          filter.from || filter.to
            ? {
                gte: filter.from ? new Date(filter.from) : undefined,
                lte: filter.to ? new Date(filter.to) : undefined,
              }
            : undefined,
      },
      include: SESSION_INCLUDE,
      orderBy: { startedAt: 'desc' },
    });
  }

  private async upsertAxisBest(
    client: Prisma.TransactionClient,
    userId: string,
    achievedAt: Date,
    best: AxisBestInput,
  ): Promise<void> {
    const axis = mapEnumValue(DbAxisType, best.axis);
    const existing = await client.axisBest.findUnique({
      where: { userId_axis: { userId, axis } },
    });
    if (existing && best.score <= existing.bestScore) {
      return;
    }
    const data = {
      bestScore: best.score,
      band: mapEnumValue(DbScoreBand, best.band),
      achievedAt,
      sessionAxisId: best.sessionAxisId,
    };
    if (existing) {
      await client.axisBest.update({
        where: { userId_axis: { userId, axis } },
        data,
      });
      return;
    }
    await client.axisBest.create({ data: { userId, axis, ...data } });
  }
}
