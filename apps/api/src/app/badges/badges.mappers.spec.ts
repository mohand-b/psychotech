import { BadgeId as DbBadgeId, BadgeRarity, UserBadge } from '@prisma/client';
import { BADGE_BY_ID, BadgeFacts, BadgeId, Sector } from '@psychotech/shared';
import { describe, expect, it } from 'vitest';
import { toBadgeStatusDto } from './badges.mappers';

function definitionOf(badgeId: BadgeId) {
  const definition = BADGE_BY_ID.get(badgeId);
  if (!definition) {
    throw new Error(`Missing definition for ${badgeId}`);
  }
  return definition;
}

function earnedRow(overrides: Partial<UserBadge> = {}): UserBadge {
  return {
    id: 'user-badge-1',
    userId: 'user-1',
    badgeId: DbBadgeId.FIRST_STEPS,
    earnedAt: new Date('2026-08-06T10:00:00Z'),
    acknowledgedAt: null,
    ...overrides,
  };
}

function rarityRow(overrides: Partial<BadgeRarity> = {}): BadgeRarity {
  return {
    badgeId: DbBadgeId.FIRST_STEPS,
    eligibleCount: 250,
    earnedCount: 200,
    computedAt: new Date('2026-08-06T03:00:00Z'),
    ...overrides,
  };
}

const facts: BadgeFacts = {
  sector: Sector.RAILWAY,
  bestScores: {},
  user: {
    accountVerified: true,
    tutorialDiscovered: false,
  },
  session: null,
};

describe('toBadgeStatusDto', () => {
  it('exposes the per-condition state for a multi-condition badge', () => {
    const dto = toBadgeStatusDto(
      definitionOf(BadgeId.FIRST_STEPS),
      null,
      null,
      facts,
    );

    expect(dto.conditions.map((condition) => condition.met)).toEqual([
      true,
      false,
    ]);
    expect(dto.earnedAt).toBeNull();
  });

  it('marks every condition met once the badge is earned', () => {
    const dto = toBadgeStatusDto(
      definitionOf(BadgeId.FIRST_STEPS),
      earnedRow(),
      null,
      facts,
    );

    expect(dto.conditions.every((condition) => condition.met)).toBe(true);
    expect(dto.earnedAt).toBe('2026-08-06T10:00:00.000Z');
  });

  it('computes the rarity from the very first eligible candidate', () => {
    const single = toBadgeStatusDto(
      definitionOf(BadgeId.FIRST_STEPS),
      null,
      rarityRow({ eligibleCount: 1, earnedCount: 1 }),
      facts,
    );
    const partial = toBadgeStatusDto(
      definitionOf(BadgeId.FIRST_STEPS),
      null,
      rarityRow({ eligibleCount: 100, earnedCount: 40 }),
      facts,
    );

    expect(single.rarityPercent).toBe(100);
    expect(partial.rarityPercent).toBe(40);
  });

  it('hides the rarity only when nobody is eligible yet', () => {
    const noRow = toBadgeStatusDto(
      definitionOf(BadgeId.FIRST_STEPS),
      null,
      null,
      facts,
    );
    const empty = toBadgeStatusDto(
      definitionOf(BadgeId.FIRST_STEPS),
      null,
      rarityRow({ eligibleCount: 0, earnedCount: 0 }),
      facts,
    );

    expect(noRow.rarityPercent).toBeNull();
    expect(empty.rarityPercent).toBeNull();
  });
});
