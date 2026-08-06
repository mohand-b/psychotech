import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BadgeId as DbBadgeId } from '@prisma/client';
import {
  BADGE_CATALOG,
  BadgeDefinition,
  BadgeRarityDenominator,
} from '@psychotech/shared';
import { mapEnumValue } from '../common/enum.util';
import { BadgesRepository } from './badges.repository';

const NIGHTLY_AT_THREE = '0 3 * * *';

@Injectable()
export class BadgeRarityService {
  private readonly logger = new Logger(BadgeRarityService.name);

  constructor(private readonly repository: BadgesRepository) {}

  @Cron(NIGHTLY_AT_THREE)
  async refreshNightly(): Promise<void> {
    try {
      await this.refresh(new Date());
    } catch (error) {
      this.logger.error(
        'Badge rarity refresh failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async refresh(computedAt: Date): Promise<void> {
    const [axisPlayers, examFinishers, sessionFinishers, verifiedAccounts, earnedCounts] =
      await Promise.all([
        this.repository.countAxisPlayers(),
        this.repository.countExamFinishers(),
        this.repository.countSessionFinishers(),
        this.repository.countVerifiedAccounts(),
        this.repository.countEarnedByBadge(),
      ]);
    for (const definition of BADGE_CATALOG) {
      const eligibleCount = this.eligibleFor(definition, {
        axisPlayers,
        examFinishers,
        sessionFinishers,
        verifiedAccounts,
      });
      const badgeId = mapEnumValue(DbBadgeId, definition.id);
      await this.repository.upsertRarity(
        badgeId,
        eligibleCount,
        earnedCounts.get(badgeId) ?? 0,
        computedAt,
      );
    }
  }

  private eligibleFor(
    definition: BadgeDefinition,
    counts: {
      axisPlayers: ReadonlyMap<string, number>;
      examFinishers: number;
      sessionFinishers: number;
      verifiedAccounts: number;
    },
  ): number {
    switch (definition.rarityDenominator) {
      case BadgeRarityDenominator.AXIS_PLAYERS:
        return definition.axis
          ? (counts.axisPlayers.get(definition.axis) ?? 0)
          : 0;
      case BadgeRarityDenominator.EXAM_FINISHERS:
        return counts.examFinishers;
      case BadgeRarityDenominator.SESSION_FINISHERS:
        return counts.sessionFinishers;
      case BadgeRarityDenominator.VERIFIED_ACCOUNTS:
        return counts.verifiedAccounts;
    }
  }
}
