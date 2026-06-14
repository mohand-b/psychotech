import { Injectable } from '@nestjs/common';
import { Badge, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface BadgeCumulativeState {
  completedSessions: number;
  hasCompletedFullSession: boolean;
  bestGlobalScore: number | null;
  bestAxisScore: number | null;
  completedAxesCount: number;
}

@Injectable()
export class BadgesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getCumulativeStateWithin(
    client: Prisma.TransactionClient,
    userId: string,
  ): Promise<BadgeCumulativeState> {
    const [completedSessions, fullSessions, globalScore, axisScore, axisGroups] =
      await Promise.all([
        client.session.count({
          where: { userId, status: 'COMPLETED', mode: { in: ['FULL', 'TARGETED'] } },
        }),
        client.session.count({
          where: { userId, status: 'COMPLETED', mode: 'FULL' },
        }),
        client.session.aggregate({
          where: { userId, status: 'COMPLETED', globalScore: { not: null } },
          _max: { globalScore: true },
        }),
        client.sessionAxis.aggregate({
          where: {
            normalizedScore: { not: null },
            session: { userId, status: 'COMPLETED' },
          },
          _max: { normalizedScore: true },
        }),
        client.sessionAxis.groupBy({
          by: ['axis'],
          where: {
            normalizedScore: { not: null },
            session: { userId, status: 'COMPLETED' },
          },
        }),
      ]);
    return {
      completedSessions,
      hasCompletedFullSession: fullSessions > 0,
      bestGlobalScore: globalScore._max.globalScore,
      bestAxisScore: axisScore._max.normalizedScore,
      completedAxesCount: axisGroups.length,
    };
  }

  async getUnlockedBadgeCodesWithin(
    client: Prisma.TransactionClient,
    userId: string,
  ): Promise<Set<string>> {
    const rows = await client.userBadge.findMany({
      where: { userId },
      select: { badge: { select: { code: true } } },
    });
    return new Set(rows.map((row) => row.badge.code));
  }

  getBadgesByCodesWithin(
    client: Prisma.TransactionClient,
    codes: string[],
  ): Promise<Badge[]> {
    return client.badge.findMany({ where: { code: { in: codes } } });
  }

  async createUserBadgesWithin(
    client: Prisma.TransactionClient,
    userId: string,
    badgeIds: string[],
  ): Promise<void> {
    await client.userBadge.createMany({
      data: badgeIds.map((badgeId) => ({ userId, badgeId })),
      skipDuplicates: true,
    });
  }

  getCatalog(): Promise<Badge[]> {
    return this.prisma.badge.findMany({
      orderBy: [{ category: 'asc' }, { code: 'asc' }],
    });
  }

  async getUserUnlockDates(userId: string): Promise<Map<string, Date>> {
    const rows = await this.prisma.userBadge.findMany({
      where: { userId },
      select: { unlockedAt: true, badge: { select: { code: true } } },
    });
    return new Map(rows.map((row) => [row.badge.code, row.unlockedAt]));
  }
}
