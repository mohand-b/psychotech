import { Injectable } from '@nestjs/common';
import { BadgeId as DbBadgeId, Prisma } from '@prisma/client';
import {
  BADGE_BY_ID,
  BADGE_CATALOG,
  BadgeEvent,
  BadgeFacts,
  BadgeId,
  BadgeFeedDto,
  BadgeSessionFacts,
  BadgeStatusDto,
  EarnedBadgeDto,
  badgeEarned,
  badgesListeningTo,
} from '@psychotech/shared';
import { mapEnumValue } from '../common/enum.util';
import { BadgeCollector } from './badge-collector';
import { BadgesRepository } from './badges.repository';
import {
  toBadgeFeedEntries,
  toBadgeStatusDto,
  toEarnedBadgeDto,
  toReconciledEarnedBadgeDto,
} from './badges.mappers';

export const FEED_VISIBILITY_THRESHOLD = 100;
export const FEED_LIMIT = 20;

type PrismaClientLike = Prisma.TransactionClient;

@Injectable()
export class BadgesService {
  constructor(
    private readonly repository: BadgesRepository,
    private readonly collector: BadgeCollector,
  ) {}

  async evaluateWithin(
    client: PrismaClientLike,
    userId: string,
    event: BadgeEvent,
    sessionFacts: BadgeSessionFacts | null,
    sessionId: string | null = null,
  ): Promise<void> {
    const listening = badgesListeningTo(event);
    if (listening.length === 0) {
      return;
    }
    const earned = await this.repository.findEarnedIdsWithin(client, userId);
    const pending = listening.filter(
      (definition) => !earned.has(mapEnumValue(DbBadgeId, definition.id)),
    );
    if (pending.length === 0) {
      return;
    }
    const source = await this.repository.buildFactsSourceWithin(client, userId);
    if (!source) {
      return;
    }
    const facts: BadgeFacts = { ...source, session: sessionFacts };
    for (const definition of pending) {
      if (!badgeEarned(definition, facts)) {
        continue;
      }
      const earnedAt = await this.repository.awardWithin(
        client,
        userId,
        mapEnumValue(DbBadgeId, definition.id),
        sessionId,
      );
      if (!earnedAt) {
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
      this.collector.deposit(
        toEarnedBadgeDto(definition, earnedAt, facts, event),
      );
    }
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

  async getFeed(): Promise<BadgeFeedDto> {
    const eligibleCount = await this.repository.countVerifiedAccounts();
    if (eligibleCount < FEED_VISIBILITY_THRESHOLD) {
      return { visible: false, entries: [] };
    }
    const rows = await this.repository.findRecentEarned(FEED_LIMIT);
    return { visible: true, entries: toBadgeFeedEntries(rows) };
  }

  async getForSession(
    userId: string,
    sessionId: string,
  ): Promise<EarnedBadgeDto[]> {
    const rows = await this.repository.findBySession(userId, sessionId);
    return rows.flatMap((row) => {
      const definition = BADGE_BY_ID.get(mapEnumValue(BadgeId, row.badgeId));
      return definition
        ? [toReconciledEarnedBadgeDto(definition, row.earnedAt)]
        : [];
    });
  }

  async getUnacknowledged(userId: string): Promise<EarnedBadgeDto[]> {
    const rows = await this.repository.findUnacknowledged(userId);
    return rows.flatMap((row) => {
      const definition = BADGE_BY_ID.get(mapEnumValue(BadgeId, row.badgeId));
      return definition
        ? [toReconciledEarnedBadgeDto(definition, row.earnedAt)]
        : [];
    });
  }

  async acknowledge(userId: string, badgeId: BadgeId): Promise<void> {
    await this.repository.acknowledge(userId, mapEnumValue(DbBadgeId, badgeId));
  }
}
