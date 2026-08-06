import { Injectable } from '@nestjs/common';
import { BadgeId as DbBadgeId, Prisma } from '@prisma/client';
import {
  BADGE_CATALOG,
  BadgeEvent,
  BadgeFacts,
  BadgeId,
  BadgeSessionFacts,
  BadgeStatusDto,
  NewBadgeDto,
  UnacknowledgedBadgeDto,
  badgeEarned,
  badgesListeningTo,
} from '@psychotech/shared';
import { mapEnumValue } from '../common/enum.util';
import { BadgesRepository } from './badges.repository';
import { toBadgeStatusDto } from './badges.mappers';

type PrismaClientLike = Prisma.TransactionClient;

@Injectable()
export class BadgesService {
  constructor(private readonly repository: BadgesRepository) {}

  async evaluateWithin(
    client: PrismaClientLike,
    userId: string,
    event: BadgeEvent,
    sessionFacts: BadgeSessionFacts | null,
  ): Promise<NewBadgeDto[]> {
    const listening = badgesListeningTo(event);
    if (listening.length === 0) {
      return [];
    }
    const earned = await this.repository.findEarnedIdsWithin(client, userId);
    const pending = listening.filter(
      (definition) => !earned.has(mapEnumValue(DbBadgeId, definition.id)),
    );
    if (pending.length === 0) {
      return [];
    }
    const source = await this.repository.buildFactsSourceWithin(client, userId);
    if (!source) {
      return [];
    }
    const facts: BadgeFacts = { ...source, session: sessionFacts };
    const won: NewBadgeDto[] = [];
    for (const definition of pending) {
      if (!badgeEarned(definition, facts)) {
        continue;
      }
      const created = await this.repository.awardWithin(
        client,
        userId,
        mapEnumValue(DbBadgeId, definition.id),
      );
      if (!created) {
        continue;
      }
      if (definition.energyReward > 0) {
        await this.repository.creditRewardWithin(
          client,
          userId,
          definition.energyReward,
          definition.id,
        );
      }
      won.push({
        badgeId: definition.id,
        energyReward: definition.energyReward,
      });
    }
    return won;
  }

  async markTutorialDiscovered(userId: string): Promise<void> {
    await this.repository.markTutorialDiscovered(userId, (client) =>
      this.evaluateWithin(client, userId, BadgeEvent.TUTORIAL_OPENED, null),
    );
  }

  async getCollection(userId: string): Promise<BadgeStatusDto[]> {
    const [earned, rarities, source] = await Promise.all([
      this.repository.findEarned(userId),
      this.repository.findRarities(),
      this.repository.buildFactsSource(userId),
    ]);
    const facts: BadgeFacts | null = source
      ? { ...source, session: null }
      : null;
    const earnedById = new Map(
      earned.map((row) => [mapEnumValue(BadgeId, row.badgeId), row]),
    );
    const rarityById = new Map(
      rarities.map((row) => [mapEnumValue(BadgeId, row.badgeId), row]),
    );
    return BADGE_CATALOG.map((definition) =>
      toBadgeStatusDto(
        definition,
        earnedById.get(definition.id) ?? null,
        rarityById.get(definition.id) ?? null,
        facts,
      ),
    );
  }

  async getUnacknowledged(userId: string): Promise<UnacknowledgedBadgeDto[]> {
    const rows = await this.repository.findUnacknowledged(userId);
    return rows.map((row) => {
      const badgeId = mapEnumValue(BadgeId, row.badgeId);
      const definition = BADGE_CATALOG.find((entry) => entry.id === badgeId);
      return {
        badgeId,
        earnedAt: row.earnedAt.toISOString(),
        energyReward: definition?.energyReward ?? 0,
      };
    });
  }

  async acknowledge(userId: string, badgeId: BadgeId): Promise<void> {
    await this.repository.acknowledge(userId, mapEnumValue(DbBadgeId, badgeId));
  }
}
