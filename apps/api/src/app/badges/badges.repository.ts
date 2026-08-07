import { Injectable } from '@nestjs/common';
import {
  AxisType as DbAxisType,
  BadgeId as DbBadgeId,
  BadgeRarity,
  EnergyLedgerReason,
  Prisma,
  UserBadge,
} from '@prisma/client';
import { AxisType, BadgeFacts, Sector } from '@psychotech/shared';
import { mapEnumValue } from '../common/enum.util';
import { PrismaService } from '../prisma/prisma.service';

type PrismaClientLike = Prisma.TransactionClient;

export type BadgeFactsSource = Omit<BadgeFacts, 'session'>;

interface AxisPlayersRow {
  axis: DbAxisType;
  count: bigint;
}

interface DistinctCountRow {
  count: bigint;
}

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

@Injectable()
export class BadgesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findEarnedIdsWithin(
    client: PrismaClientLike,
    userId: string,
  ): Promise<Set<DbBadgeId>> {
    const rows = await client.userBadge.findMany({
      where: { userId },
      select: { badgeId: true },
    });
    return new Set(rows.map((row) => row.badgeId));
  }

  findEarned(userId: string): Promise<UserBadge[]> {
    return this.prisma.userBadge.findMany({
      where: { userId },
      orderBy: { earnedAt: 'asc' },
    });
  }

  findUnacknowledged(userId: string): Promise<UserBadge[]> {
    return this.prisma.userBadge.findMany({
      where: { userId, acknowledgedAt: null },
      orderBy: { earnedAt: 'asc' },
    });
  }

  async acknowledge(userId: string, badgeId: DbBadgeId): Promise<void> {
    await this.prisma.userBadge.updateMany({
      where: { userId, badgeId, acknowledgedAt: null },
      data: { acknowledgedAt: new Date() },
    });
  }

  async buildFactsSource(userId: string): Promise<BadgeFactsSource | null> {
    return this.queryFactsSource(this.prisma, userId);
  }

  async buildFactsSourceWithin(
    client: PrismaClientLike,
    userId: string,
  ): Promise<BadgeFactsSource | null> {
    return this.queryFactsSource(client, userId);
  }

  async awardWithin(
    client: PrismaClientLike,
    userId: string,
    badgeId: DbBadgeId,
  ): Promise<Date | null> {
    try {
      const created = await client.userBadge.create({
        data: { userId, badgeId },
      });
      return created.earnedAt;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_VIOLATION
      ) {
        return null;
      }
      throw error;
    }
  }

  async creditRewardWithin(
    client: PrismaClientLike,
    userId: string,
    amount: number,
    ref: string,
  ): Promise<void> {
    const wallet = await client.energyWallet.upsert({
      where: { userId },
      create: { userId, balance: amount },
      update: { balance: { increment: amount } },
    });
    await client.energyLedger.create({
      data: {
        userId,
        delta: amount,
        reason: EnergyLedgerReason.BADGE_REWARD,
        balanceAfter: wallet.balance,
        ref,
      },
    });
  }

  async markTutorialDiscovered<T>(
    userId: string,
    evaluate: (client: PrismaClientLike) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      await tx.user.updateMany({
        where: { id: userId, tutorialDiscoveredAt: null },
        data: { tutorialDiscoveredAt: new Date() },
      });
      return evaluate(tx);
    });
  }

  findRarities(): Promise<BadgeRarity[]> {
    return this.prisma.badgeRarity.findMany();
  }

  async countAxisPlayers(): Promise<Map<AxisType, number>> {
    const rows = await this.prisma.$queryRaw<AxisPlayersRow[]>`
      SELECT sa."axis" AS axis, COUNT(DISTINCT s."userId") AS count
      FROM "SessionAxis" sa
      JOIN "Session" s ON s."id" = sa."sessionId"
      WHERE s."status" = 'COMPLETED' AND sa."normalizedScore" IS NOT NULL
      GROUP BY sa."axis"
    `;
    return new Map(
      rows.map((row) => [
        mapEnumValue(AxisType, row.axis),
        Number(row.count),
      ]),
    );
  }

  async countExamFinishers(): Promise<number> {
    const rows = await this.prisma.$queryRaw<DistinctCountRow[]>`
      SELECT COUNT(DISTINCT "userId") AS count
      FROM "Session"
      WHERE "mode" = 'FULL' AND "status" = 'COMPLETED'
    `;
    return Number(rows[0]?.count ?? 0);
  }

  async countSessionFinishers(): Promise<number> {
    const rows = await this.prisma.$queryRaw<DistinctCountRow[]>`
      SELECT COUNT(DISTINCT "userId") AS count
      FROM "Session"
      WHERE "mode" IN ('FULL', 'TARGETED') AND "status" = 'COMPLETED'
    `;
    return Number(rows[0]?.count ?? 0);
  }

  countVerifiedAccounts(): Promise<number> {
    return this.prisma.user.count({
      where: { emailVerifiedAt: { not: null } },
    });
  }

  async countEarnedByBadge(): Promise<Map<DbBadgeId, number>> {
    const rows = await this.prisma.userBadge.groupBy({
      by: ['badgeId'],
      _count: { _all: true },
    });
    return new Map(rows.map((row) => [row.badgeId, row._count._all]));
  }

  async upsertRarity(
    badgeId: DbBadgeId,
    eligibleCount: number,
    earnedCount: number,
    computedAt: Date,
  ): Promise<void> {
    await this.prisma.badgeRarity.upsert({
      where: { badgeId },
      create: { badgeId, eligibleCount, earnedCount, computedAt },
      update: { eligibleCount, earnedCount, computedAt },
    });
  }

  private async queryFactsSource(
    client: PrismaClientLike,
    userId: string,
  ): Promise<BadgeFactsSource | null> {
    const user = await client.user.findUnique({
      where: { id: userId },
      select: {
        currentSector: true,
        emailVerifiedAt: true,
        tutorialDiscoveredAt: true,
      },
    });
    if (!user) {
      return null;
    }
    const [startedCount, bests] = await Promise.all([
      client.session.count({
        where: { userId, mode: { in: ['FULL', 'TARGETED'] } },
      }),
      client.axisBest.findMany({
        where: { userId },
        select: { axis: true, bestScore: true },
      }),
    ]);
    const bestScores: Partial<Record<AxisType, number>> = {};
    for (const best of bests) {
      bestScores[mapEnumValue(AxisType, best.axis)] = best.bestScore;
    }
    return {
      sector: mapEnumValue(Sector, user.currentSector),
      bestScores,
      user: {
        accountVerified: user.emailVerifiedAt !== null,
        tutorialDiscovered: user.tutorialDiscoveredAt !== null,
        sessionStarted: startedCount > 0,
      },
    };
  }
}
