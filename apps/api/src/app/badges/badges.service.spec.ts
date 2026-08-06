import { BadgeId as DbBadgeId, Prisma } from '@prisma/client';
import {
  AxisType,
  BadgeEvent,
  BadgeId,
  Sector,
  SessionMode,
} from '@psychotech/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadgeFactsSource, BadgesRepository } from './badges.repository';
import { BadgesService } from './badges.service';

const tx = {} as Prisma.TransactionClient;

function factsSource(
  overrides: Partial<{
    bestScores: Partial<Record<AxisType, number>>;
    accountVerified: boolean;
    tutorialDiscovered: boolean;
    sessionStarted: boolean;
  }> = {},
): BadgeFactsSource {
  return {
    sector: Sector.RAILWAY,
    bestScores: overrides.bestScores ?? {},
    user: {
      accountVerified: overrides.accountVerified ?? false,
      tutorialDiscovered: overrides.tutorialDiscovered ?? false,
      sessionStarted: overrides.sessionStarted ?? false,
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

const service = new BadgesService(repository as unknown as BadgesRepository);

beforeEach(() => {
  vi.clearAllMocks();
  repository.findEarnedIdsWithin.mockResolvedValue(new Set());
  repository.awardWithin.mockResolvedValue(true);
  repository.creditRewardWithin.mockResolvedValue(undefined);
});

describe('BadgesService.evaluateWithin — session completed', () => {
  it('awards the axis progression badge when the best score reaches 70', async () => {
    repository.buildFactsSourceWithin.mockResolvedValue(
      factsSource({ bestScores: { [AxisType.LOGIC]: 72 } }),
    );

    const won = await service.evaluateWithin(
      tx,
      'user-1',
      BadgeEvent.SESSION_COMPLETED,
      {
        mode: SessionMode.TARGETED,
        axes: [{ axis: AxisType.LOGIC, score: 72 }],
        simulation: null,
      },
    );

    expect(won).toEqual([
      { badgeId: BadgeId.LOGIC_PROGRESSION, energyReward: 0 },
    ]);
    expect(repository.awardWithin).toHaveBeenCalledWith(
      tx,
      'user-1',
      DbBadgeId.LOGIC_PROGRESSION,
    );
    expect(repository.creditRewardWithin).not.toHaveBeenCalled();
  });

  it('credits the exam favorable reward inside the same transaction', async () => {
    repository.buildFactsSourceWithin.mockResolvedValue(factsSource());

    const won = await service.evaluateWithin(
      tx,
      'user-1',
      BadgeEvent.SESSION_COMPLETED,
      {
        mode: SessionMode.FULL,
        axes: [{ axis: AxisType.LOGIC, score: 60 }],
        simulation: { verdictFavorable: true },
      },
    );

    const badgeIds = won.map((badge) => badge.badgeId);
    expect(badgeIds).toContain(BadgeId.EXAM_FIRST);
    expect(badgeIds).toContain(BadgeId.EXAM_FAVORABLE);
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

    const won = await service.evaluateWithin(
      tx,
      'user-1',
      BadgeEvent.SESSION_COMPLETED,
      {
        mode: SessionMode.FULL,
        axes: [{ axis: AxisType.LOGIC, score: 60 }],
        simulation: { verdictFavorable: true },
      },
    );

    expect(won).toEqual([]);
    expect(repository.awardWithin).not.toHaveBeenCalled();
    expect(repository.creditRewardWithin).not.toHaveBeenCalled();
  });

  it('never credits when a concurrent event already awarded the badge', async () => {
    repository.buildFactsSourceWithin.mockResolvedValue(factsSource());
    repository.awardWithin.mockResolvedValue(false);

    const won = await service.evaluateWithin(
      tx,
      'user-1',
      BadgeEvent.SESSION_COMPLETED,
      {
        mode: SessionMode.FULL,
        axes: [{ axis: AxisType.LOGIC, score: 60 }],
        simulation: { verdictFavorable: true },
      },
    );

    expect(won).toEqual([]);
    expect(repository.creditRewardWithin).not.toHaveBeenCalled();
  });

  it('awards the gold badge only at a perfect best score of 100', async () => {
    repository.buildFactsSourceWithin.mockResolvedValue(
      factsSource({ bestScores: { [AxisType.MEMORY]: 100 } }),
    );

    const won = await service.evaluateWithin(
      tx,
      'user-1',
      BadgeEvent.SESSION_COMPLETED,
      {
        mode: SessionMode.TARGETED,
        axes: [{ axis: AxisType.MEMORY, score: 100 }],
        simulation: null,
      },
    );

    expect(won.map((badge) => badge.badgeId)).toEqual([
      BadgeId.MEMORY_PROGRESSION,
      BadgeId.MEMORY_EXCELLENCE,
      BadgeId.MEMORY_PERFECTION,
    ]);
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

    const won = await service.evaluateWithin(
      tx,
      'user-1',
      BadgeEvent.SESSION_COMPLETED,
      {
        mode: SessionMode.TARGETED,
        axes: [{ axis: AxisType.REACTIVITY, score: 71 }],
        simulation: null,
      },
    );

    expect(won.map((badge) => badge.badgeId)).toContain(
      BadgeId.SECTOR_MASTERY,
    );
  });
});

describe('BadgesService.evaluateWithin — first steps', () => {
  it('awards and credits first steps once the three conditions hold', async () => {
    repository.buildFactsSourceWithin.mockResolvedValue(
      factsSource({
        accountVerified: true,
        tutorialDiscovered: true,
        sessionStarted: true,
      }),
    );

    const won = await service.evaluateWithin(
      tx,
      'user-1',
      BadgeEvent.SESSION_STARTED,
      null,
    );

    expect(won).toEqual([{ badgeId: BadgeId.FIRST_STEPS, energyReward: 5 }]);
    expect(repository.creditRewardWithin).toHaveBeenCalledWith(
      tx,
      'user-1',
      5,
      BadgeId.FIRST_STEPS,
    );
  });

  it('withholds first steps while a condition is missing', async () => {
    repository.buildFactsSourceWithin.mockResolvedValue(
      factsSource({ accountVerified: true, sessionStarted: true }),
    );

    const won = await service.evaluateWithin(
      tx,
      'user-1',
      BadgeEvent.ACCOUNT_VERIFIED,
      null,
    );

    expect(won).toEqual([]);
    expect(repository.awardWithin).not.toHaveBeenCalled();
  });
});

describe('BadgesService.markTutorialDiscovered', () => {
  it('marks the flag and evaluates the tutorial event in the same transaction', async () => {
    repository.markTutorialDiscovered.mockImplementation(
      async (_userId: string, evaluate: (client: Prisma.TransactionClient) => Promise<unknown>) =>
        evaluate(tx),
    );
    repository.buildFactsSourceWithin.mockResolvedValue(
      factsSource({ tutorialDiscovered: true }),
    );

    await service.markTutorialDiscovered('user-1');

    expect(repository.markTutorialDiscovered).toHaveBeenCalledTimes(1);
    expect(repository.findEarnedIdsWithin).toHaveBeenCalledWith(tx, 'user-1');
  });
});
