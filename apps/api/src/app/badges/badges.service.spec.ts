import { BadgeId as DbBadgeId, Prisma } from '@prisma/client';
import {
  AxisType,
  BadgeEvent,
  BadgeId,
  EarnedBadgeDto,
  Sector,
  SessionMode,
} from '@psychotech/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadgeCollector } from './badge-collector';
import { BadgeFactsSource, BadgesRepository } from './badges.repository';
import { BadgesService } from './badges.service';

const tx = {} as Prisma.TransactionClient;
const EARNED_AT = new Date('2026-08-07T10:00:00Z');

function factsSource(
  overrides: Partial<{
    bestScores: Partial<Record<AxisType, number>>;
    accountVerified: boolean;
    tutorialDiscovered: boolean;
  }> = {},
): BadgeFactsSource {
  return {
    sector: Sector.RAILWAY,
    bestScores: overrides.bestScores ?? {},
    user: {
      accountVerified: overrides.accountVerified ?? false,
      tutorialDiscovered: overrides.tutorialDiscovered ?? false,
    },
  };
}

const repository = {
  findEarnedIdsWithin: vi.fn(),
  buildFactsSourceWithin: vi.fn(),
  awardWithin: vi.fn(),
  creditRewardWithin: vi.fn(),
  markTutorialDiscovered: vi.fn(),
  findEarned: vi.fn(),
  findRarities: vi.fn(),
  buildFactsSource: vi.fn(),
  findUnacknowledged: vi.fn(),
  acknowledge: vi.fn(),
};

const collector = new BadgeCollector();
const service = new BadgesService(
  repository as unknown as BadgesRepository,
  collector,
);

function evaluateCollecting(
  event: BadgeEvent,
  sessionFacts: Parameters<BadgesService['evaluateWithin']>[3],
): Promise<EarnedBadgeDto[]> {
  return collector.runWithin(async () => {
    await service.evaluateWithin(tx, 'user-1', event, sessionFacts);
    return collector.collected();
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  repository.findEarnedIdsWithin.mockResolvedValue(new Set());
  repository.awardWithin.mockResolvedValue(EARNED_AT);
  repository.creditRewardWithin.mockResolvedValue(undefined);
});

describe('BadgesService.evaluateWithin — session completed', () => {
  it('deposits the axis progression badge when the best score reaches 70', async () => {
    repository.buildFactsSourceWithin.mockResolvedValue(
      factsSource({ bestScores: { [AxisType.LOGIC]: 72 } }),
    );

    const won = await evaluateCollecting(BadgeEvent.SESSION_COMPLETED, {
      mode: SessionMode.TARGETED,
      axes: [{ axis: AxisType.LOGIC, score: 72, perfection: false, exitFree: false }],
      simulation: null,
    });

    expect(won).toHaveLength(1);
    expect(won[0].badgeId).toBe(BadgeId.LOGIC_PROGRESSION);
    expect(won[0].gain).toBeNull();
    expect(won[0].earnedAt).toBe(EARNED_AT.toISOString());
    expect(won[0].conditions).toEqual([
      expect.objectContaining({ met: true, justValidated: true }),
    ]);
    expect(repository.awardWithin).toHaveBeenCalledWith(
      tx,
      'user-1',
      DbBadgeId.LOGIC_PROGRESSION,
      null,
    );
    expect(repository.creditRewardWithin).not.toHaveBeenCalled();
  });

  it('credits the exam favorable reward inside the same transaction', async () => {
    repository.buildFactsSourceWithin.mockResolvedValue(factsSource());

    const won = await evaluateCollecting(BadgeEvent.SESSION_COMPLETED, {
      mode: SessionMode.FULL,
      axes: [{ axis: AxisType.LOGIC, score: 60, perfection: false, exitFree: false }],
      simulation: { globalScore: 86, verdictFavorable: true },
    });

    const badgeIds = won.map((badge) => badge.badgeId);
    expect(badgeIds).toContain(BadgeId.EXAM_FIRST);
    expect(badgeIds).toContain(BadgeId.EXAM_FAVORABLE);
    const favorable = won.find(
      (badge) => badge.badgeId === BadgeId.EXAM_FAVORABLE,
    );
    expect(favorable?.gain).toBe(2);
    expect(repository.creditRewardWithin).toHaveBeenCalledTimes(1);
    expect(repository.creditRewardWithin).toHaveBeenCalledWith(
      tx,
      'user-1',
      2,
      BadgeId.EXAM_FAVORABLE,
    );
  });

  it('never evaluates a badge that is already earned', async () => {
    repository.findEarnedIdsWithin.mockResolvedValue(
      new Set([DbBadgeId.EXAM_FIRST, DbBadgeId.EXAM_FAVORABLE]),
    );
    repository.buildFactsSourceWithin.mockResolvedValue(factsSource());

    const won = await evaluateCollecting(BadgeEvent.SESSION_COMPLETED, {
      mode: SessionMode.FULL,
      axes: [{ axis: AxisType.LOGIC, score: 60, perfection: false, exitFree: false }],
      simulation: { globalScore: 86, verdictFavorable: true },
    });

    expect(won).toEqual([]);
    expect(repository.awardWithin).not.toHaveBeenCalled();
    expect(repository.creditRewardWithin).not.toHaveBeenCalled();
  });

  it('never credits when a concurrent event already awarded the badge', async () => {
    repository.buildFactsSourceWithin.mockResolvedValue(factsSource());
    repository.awardWithin.mockResolvedValue(null);

    const won = await evaluateCollecting(BadgeEvent.SESSION_COMPLETED, {
      mode: SessionMode.FULL,
      axes: [{ axis: AxisType.LOGIC, score: 60, perfection: false, exitFree: false }],
      simulation: { globalScore: 86, verdictFavorable: true },
    });

    expect(won).toEqual([]);
    expect(repository.creditRewardWithin).not.toHaveBeenCalled();
  });

  it('awards the gold badge on the perfection proof, whatever the score', async () => {
    repository.buildFactsSourceWithin.mockResolvedValue(
      factsSource({ bestScores: { [AxisType.MEMORY]: 96 } }),
    );

    const won = await evaluateCollecting(BadgeEvent.SESSION_COMPLETED, {
      mode: SessionMode.TARGETED,
      axes: [{ axis: AxisType.MEMORY, score: 96, perfection: true, exitFree: false }],
      simulation: null,
    });

    expect(won.map((badge) => badge.badgeId)).toEqual([
      BadgeId.MEMORY_PROGRESSION,
      BadgeId.MEMORY_EXCELLENCE,
      BadgeId.MEMORY_PERFECTION,
    ]);
  });

  it('withholds the gold badge on a perfect score without the perfection proof', async () => {
    repository.buildFactsSourceWithin.mockResolvedValue(
      factsSource({ bestScores: { [AxisType.MEMORY]: 100 } }),
    );

    const won = await evaluateCollecting(BadgeEvent.SESSION_COMPLETED, {
      mode: SessionMode.TARGETED,
      axes: [{ axis: AxisType.MEMORY, score: 100, perfection: false, exitFree: false }],
      simulation: null,
    });

    expect(won.map((badge) => badge.badgeId)).toEqual([
      BadgeId.MEMORY_PROGRESSION,
      BadgeId.MEMORY_EXCELLENCE,
    ]);
  });

  it('marks the exam gold condition as just validated by the awarding exam', async () => {
    repository.findEarnedIdsWithin.mockResolvedValue(
      new Set([DbBadgeId.EXAM_FIRST, DbBadgeId.EXAM_FAVORABLE]),
    );
    repository.buildFactsSourceWithin.mockResolvedValue(factsSource());

    const won = await evaluateCollecting(BadgeEvent.SESSION_COMPLETED, {
      mode: SessionMode.FULL,
      axes: [
        { axis: AxisType.LOGIC, score: 80, perfection: false, exitFree: false },
        { axis: AxisType.MEMORY, score: 75, perfection: false, exitFree: false },
      ],
      simulation: { globalScore: 96, verdictFavorable: true },
    });

    const solid = won.find((badge) => badge.badgeId === BadgeId.EXAM_SOLID);
    expect(solid).toBeDefined();
    expect(solid?.conditions.every((condition) => condition.met)).toBe(true);
    expect(
      solid?.conditions.every((condition) => condition.justValidated),
    ).toBe(true);
  });

  it('awards the sector badge once every railway axis reaches 70', async () => {
    repository.buildFactsSourceWithin.mockResolvedValue(
      factsSource({
        bestScores: {
          [AxisType.LOGIC]: 70,
          [AxisType.MEMORY]: 75,
          [AxisType.VISUAL_DISCRIMINATION]: 80,
          [AxisType.REACTIVITY]: 71,
          [AxisType.MOTOR_SKILLS]: 90,
        },
      }),
    );
    repository.findEarnedIdsWithin.mockResolvedValue(
      new Set([
        DbBadgeId.LOGIC_PROGRESSION,
        DbBadgeId.MEMORY_PROGRESSION,
        DbBadgeId.DISCRIMINATION_PROGRESSION,
        DbBadgeId.REACTIVITY_PROGRESSION,
        DbBadgeId.MOTOR_PROGRESSION,
        DbBadgeId.MOTOR_EXCELLENCE,
      ]),
    );

    const won = await evaluateCollecting(BadgeEvent.SESSION_COMPLETED, {
      mode: SessionMode.TARGETED,
      axes: [{ axis: AxisType.REACTIVITY, score: 71, perfection: false, exitFree: false }],
      simulation: null,
    });

    expect(won.map((badge) => badge.badgeId)).toContain(
      BadgeId.SECTOR_MASTERY,
    );
  });
});

describe('BadgesService.evaluateWithin — first steps', () => {
  it('awards first steps and singles out the condition validated by the event', async () => {
    repository.buildFactsSourceWithin.mockResolvedValue(
      factsSource({
        accountVerified: true,
        tutorialDiscovered: true,
      }),
    );

    const won = await evaluateCollecting(BadgeEvent.TUTORIAL_OPENED, null);

    expect(won).toHaveLength(1);
    expect(won[0].badgeId).toBe(BadgeId.FIRST_STEPS);
    expect(won[0].gain).toBe(2);
    expect(
      won[0].conditions.map((condition) => [
        condition.id,
        condition.met,
        condition.justValidated,
      ]),
    ).toEqual([
      ['verified', true, false],
      ['tutorial', true, true],
    ]);
    expect(repository.creditRewardWithin).toHaveBeenCalledWith(
      tx,
      'user-1',
      2,
      BadgeId.FIRST_STEPS,
    );
  });

  it('withholds first steps while a condition is missing', async () => {
    repository.buildFactsSourceWithin.mockResolvedValue(
      factsSource({ accountVerified: true }),
    );

    const won = await evaluateCollecting(BadgeEvent.ACCOUNT_VERIFIED, null);

    expect(won).toEqual([]);
    expect(repository.awardWithin).not.toHaveBeenCalled();
  });
});

describe('BadgesService.evaluateWithin — outside a collection scope', () => {
  it('still awards and credits without a collector context', async () => {
    repository.buildFactsSourceWithin.mockResolvedValue(
      factsSource({ bestScores: { [AxisType.LOGIC]: 72 } }),
    );

    await service.evaluateWithin(tx, 'user-1', BadgeEvent.SESSION_COMPLETED, {
      mode: SessionMode.TARGETED,
      axes: [{ axis: AxisType.LOGIC, score: 72, perfection: false, exitFree: false }],
      simulation: null,
    });

    expect(repository.awardWithin).toHaveBeenCalledTimes(1);
    expect(collector.collected()).toEqual([]);
  });
});

describe('BadgesService.markTutorialDiscovered', () => {
  it('marks the flag and evaluates the tutorial event in the same transaction', async () => {
    repository.markTutorialDiscovered.mockImplementation(
      async (
        _userId: string,
        evaluate: (client: Prisma.TransactionClient) => Promise<unknown>,
      ) => evaluate(tx),
    );
    repository.buildFactsSourceWithin.mockResolvedValue(
      factsSource({ tutorialDiscovered: true }),
    );

    await service.markTutorialDiscovered('user-1');

    expect(repository.markTutorialDiscovered).toHaveBeenCalledTimes(1);
    expect(repository.findEarnedIdsWithin).toHaveBeenCalledWith(tx, 'user-1');
  });
});
