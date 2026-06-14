import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BadgeDto, BadgeStatusDto } from '@psychotech/shared';
import { BadgeEvaluationState } from './badge.catalog';
import { evaluateUnlockedBadges } from './badge.logic';
import { buildBadgeCollection, toBadgeDto } from './badges.mappers';
import { BadgesRepository } from './badges.repository';

export interface BadgeCompletionContext {
  currentStreak: number;
  flawlessVisualDiscrimination: boolean;
}

@Injectable()
export class BadgesService {
  constructor(private readonly repository: BadgesRepository) {}

  async evaluateAndUnlockWithin(
    client: Prisma.TransactionClient,
    userId: string,
    context: BadgeCompletionContext,
  ): Promise<BadgeDto[]> {
    const [cumulative, unlockedCodes] = await Promise.all([
      this.repository.getCumulativeStateWithin(client, userId),
      this.repository.getUnlockedBadgeCodesWithin(client, userId),
    ]);
    const state: BadgeEvaluationState = {
      currentStreak: context.currentStreak,
      flawlessVisualDiscrimination: context.flawlessVisualDiscrimination,
      completedSessions: cumulative.completedSessions,
      hasCompletedFullSession: cumulative.hasCompletedFullSession,
      bestGlobalScore: cumulative.bestGlobalScore,
      bestAxisScore: cumulative.bestAxisScore,
      completedAxesCount: cumulative.completedAxesCount,
    };
    const newCodes = evaluateUnlockedBadges(state, unlockedCodes);
    if (newCodes.length === 0) {
      return [];
    }
    const badges = await this.repository.getBadgesByCodesWithin(client, newCodes);
    await this.repository.createUserBadgesWithin(
      client,
      userId,
      badges.map((badge) => badge.id),
    );
    return badges.map(toBadgeDto);
  }

  async getCollection(userId: string): Promise<BadgeStatusDto[]> {
    const [catalog, unlockDates] = await Promise.all([
      this.repository.getCatalog(),
      this.repository.getUserUnlockDates(userId),
    ]);
    return buildBadgeCollection(catalog, unlockDates);
  }
}
