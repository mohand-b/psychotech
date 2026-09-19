import { Prisma, SessionStatus as DbSessionStatus } from '@prisma/client';
import {
  AxisType,
  RecommendationPriority,
  ScoreBand,
  Sector,
  SessionMode,
  TrainingOptionId,
} from '@psychotech/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
import { SESSION_INCLUDE } from './sessions.mappers';
import { SessionsRepository } from './sessions.repository';

function buildPrismaMock(unfinishedSessions: unknown[]) {
  const tx = {
    session: {
      findMany: vi.fn().mockResolvedValue(unfinishedSessions),
      create: vi.fn().mockResolvedValue({ id: 'created-session' }),
      update: vi.fn().mockResolvedValue({}),
      findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 'created-session' }),
    },
  };
  const prisma = {
    $transaction: vi.fn((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
    session: { findMany: vi.fn().mockResolvedValue([]) },
  };
  return { prisma, tx };
}

const createParams = {
  userId: 'user-1',
  mode: SessionMode.TARGETED,
  sector: Sector.RAILWAY,
  seed: 'seed',
  helpEnabled: false,
  trainingOptions: [],
  energyCost: 1,
  sectorThreshold: 70,
  axes: [AxisType.LOGIC],
};

describe('SessionsRepository.createSession', () => {
  it('abandons the unfinished full session and persists the reached axis inside the creation transaction', async () => {
    const { prisma, tx } = buildPrismaMock([
      {
        id: 'full-session',
        axisResults: [
          { completedAt: new Date(), skipped: false },
          { completedAt: new Date(), skipped: false },
          { completedAt: null, skipped: false },
          { completedAt: null, skipped: false },
          { completedAt: null, skipped: false },
        ],
      },
    ]);
    const repository = new SessionsRepository(
      prisma as unknown as PrismaService,
    );

    await repository.createSession(createParams);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.session.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'user-1',
          status: {
            in: [DbSessionStatus.IN_PROGRESS, DbSessionStatus.SUSPENDED],
          },
        },
      }),
    );
    expect(tx.session.update).toHaveBeenCalledWith({
      where: { id: 'full-session' },
      data: expect.objectContaining({
        status: DbSessionStatus.ABANDONED,
        abandonedAt: expect.any(Date),
        currentAxisIndex: 2,
      }),
    });
    expect(tx.session.create).toHaveBeenCalledTimes(1);
  });

  it('abandons an unfinished targeted session before creating the new one', async () => {
    const { prisma, tx } = buildPrismaMock([
      {
        id: 'targeted-session',
        axisResults: [{ completedAt: null, skipped: false }],
      },
    ]);
    const repository = new SessionsRepository(
      prisma as unknown as PrismaService,
    );

    await repository.createSession(createParams);

    expect(tx.session.update).toHaveBeenCalledWith({
      where: { id: 'targeted-session' },
      data: expect.objectContaining({
        status: DbSessionStatus.ABANDONED,
        currentAxisIndex: 0,
      }),
    });
  });

  it('creates the session without touching anything when no unfinished session exists', async () => {
    const { prisma, tx } = buildPrismaMock([]);
    const repository = new SessionsRepository(
      prisma as unknown as PrismaService,
    );

    await repository.createSession(createParams);

    expect(tx.session.update).not.toHaveBeenCalled();
    expect(tx.session.create).toHaveBeenCalledTimes(1);
  });
});

describe('SessionsRepository.findTargetedAxisHistory', () => {
  it('excludes family-filtered and no-timer sessions from the record history', async () => {
    const prisma = {
      sessionAxis: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const repository = new SessionsRepository(
      prisma as unknown as PrismaService,
    );

    await repository.findTargetedAxisHistory('user-1', AxisType.LOGIC);

    expect(prisma.sessionAxis.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          axis: 'LOGIC',
          session: {
            userId: 'user-1',
            mode: 'TARGETED',
            status: DbSessionStatus.COMPLETED,
            logicFamily: null,
            NOT: { trainingOptions: { has: TrainingOptionId.NO_TIMER } },
          },
        },
      }),
    );
  });
});

describe('SessionsRepository.listHistory', () => {
  it('excludes unfinished sessions and filters an axis through the axis results only', async () => {
    const { prisma } = buildPrismaMock([]);
    const repository = new SessionsRepository(
      prisma as unknown as PrismaService,
    );

    await repository.listHistory('user-1', {
      axis: AxisType.REACTIVITY,
      take: 11,
    });

    expect(prisma.session.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'user-1',
          status: {
            in: [DbSessionStatus.COMPLETED, DbSessionStatus.ABANDONED],
          },
          axisResults: { some: { axis: 'REACTIVITY' } },
        },
        take: 11,
      }),
    );
  });

  it('narrows an axis filter to targeted sessions when a mode is given too', async () => {
    const { prisma } = buildPrismaMock([]);
    const repository = new SessionsRepository(
      prisma as unknown as PrismaService,
    );

    await repository.listHistory('user-1', {
      mode: SessionMode.TARGETED,
      axis: AxisType.LOGIC,
      take: 11,
    });

    expect(prisma.session.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          mode: 'TARGETED',
          axisResults: { some: { axis: 'LOGIC' } },
        }),
      }),
    );
  });

  it('paginates with a cursor that skips the cursor row itself', async () => {
    const { prisma } = buildPrismaMock([]);
    const repository = new SessionsRepository(
      prisma as unknown as PrismaService,
    );

    await repository.listHistory('user-1', {
      mode: SessionMode.FULL,
      cursor: 'cursor-id',
      take: 11,
    });

    expect(prisma.session.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ mode: 'FULL' }),
        cursor: { id: 'cursor-id' },
        skip: 1,
      }),
    );
  });
});

function buildClosurePrismaMock(closedCount: number) {
  const storedSession = {
    id: 'full-session',
    status: DbSessionStatus.COMPLETED,
  };
  const tx = {
    session: {
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: closedCount }),
      findUniqueOrThrow: vi.fn().mockResolvedValue(storedSession),
    },
    recommendation: { createMany: vi.fn().mockResolvedValue({}) },
    axisBest: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
    },
    streak: { upsert: vi.fn().mockResolvedValue({}) },
  };
  const prisma = {
    $transaction: vi.fn((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
  };
  return { prisma, tx, storedSession };
}

const closureCompletedAt = new Date('2026-06-13T10:30:00Z');

const closureParams = {
  sessionId: 'full-session',
  userId: 'user-1',
  globalScore: 72,
  globalBand: ScoreBand.ACCEPTABLE,
  isAdmissible: true,
  isEliminated: false,
  completedAt: closureCompletedAt,
  axisCount: 5,
  recommendations: [
    {
      axis: AxisType.MEMORY,
      priority: RecommendationPriority.HIGH,
      code: 'MEMORY_FRAGILE',
      label: 'Memory needs work',
    },
  ],
  axisBests: [
    {
      axis: AxisType.LOGIC,
      score: 81,
      band: ScoreBand.EXCELLENT,
      sessionAxisId: 'axis-1',
    },
    {
      axis: AxisType.MEMORY,
      score: 64,
      band: ScoreBand.FRAGILE,
      sessionAxisId: 'axis-2',
    },
  ],
  streak: { current: 3, longest: 7, lastActivityDate: closureCompletedAt },
};

describe('SessionsRepository.completeSession', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('closes the session through a compare-and-set restricted to the in-progress status', async () => {
    const { prisma, tx } = buildClosurePrismaMock(1);
    const repository = new SessionsRepository(
      prisma as unknown as PrismaService,
    );

    await repository.completeSession(closureParams, vi.fn());

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.session.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.session.updateMany).toHaveBeenCalledWith({
      where: { id: 'full-session', status: DbSessionStatus.IN_PROGRESS },
      data: {
        status: DbSessionStatus.COMPLETED,
        globalScore: 72,
        globalBand: 'ACCEPTABLE',
        isAdmissible: true,
        isEliminated: false,
        completedAt: closureCompletedAt,
        currentAxisIndex: 5,
      },
    });
    expect(tx.session.update).not.toHaveBeenCalled();
  });

  it('writes the recommendations, the axis bests and the streak then evaluates the badges once when the closure wins', async () => {
    const { prisma, tx, storedSession } = buildClosurePrismaMock(1);
    tx.axisBest.findUnique.mockResolvedValueOnce({ bestScore: 75 });
    const evaluateBadges = vi.fn().mockResolvedValue(undefined);
    const repository = new SessionsRepository(
      prisma as unknown as PrismaService,
    );

    const result = await repository.completeSession(
      closureParams,
      evaluateBadges,
    );

    expect(tx.recommendation.createMany).toHaveBeenCalledTimes(1);
    expect(tx.recommendation.createMany).toHaveBeenCalledWith({
      data: [
        {
          sessionId: 'full-session',
          axis: 'MEMORY',
          priority: 'HIGH',
          code: 'MEMORY_FRAGILE',
          label: 'Memory needs work',
        },
      ],
    });
    expect(tx.axisBest.update).toHaveBeenCalledTimes(1);
    expect(tx.axisBest.update).toHaveBeenCalledWith({
      where: { userId_axis: { userId: 'user-1', axis: 'LOGIC' } },
      data: {
        bestScore: 81,
        band: 'EXCELLENT',
        achievedAt: closureCompletedAt,
        sessionAxisId: 'axis-1',
      },
    });
    expect(tx.axisBest.create).toHaveBeenCalledTimes(1);
    expect(tx.axisBest.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        axis: 'MEMORY',
        bestScore: 64,
        band: 'FRAGILE',
        achievedAt: closureCompletedAt,
        sessionAxisId: 'axis-2',
      },
    });
    expect(tx.streak.upsert).toHaveBeenCalledTimes(1);
    expect(tx.streak.upsert).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      update: {
        current: 3,
        longest: 7,
        lastActivityDate: closureCompletedAt,
      },
      create: {
        userId: 'user-1',
        current: 3,
        longest: 7,
        lastActivityDate: closureCompletedAt,
      },
    });
    expect(evaluateBadges).toHaveBeenCalledTimes(1);
    expect(evaluateBadges).toHaveBeenCalledWith(tx);
    const [closedOrder] = tx.session.updateMany.mock.invocationCallOrder;
    const [streakOrder] = tx.streak.upsert.mock.invocationCallOrder;
    const [badgesOrder] = evaluateBadges.mock.invocationCallOrder;
    const [readOrder] = tx.session.findUniqueOrThrow.mock.invocationCallOrder;
    expect(closedOrder).toBeLessThan(streakOrder);
    expect(streakOrder).toBeLessThan(badgesOrder);
    expect(badgesOrder).toBeLessThan(readOrder);
    expect(result).toEqual({ session: storedSession });
  });

  it('skips the recommendation write when the evaluation produced none and still closes the rest', async () => {
    const { prisma, tx } = buildClosurePrismaMock(1);
    const evaluateBadges = vi.fn().mockResolvedValue(undefined);
    const repository = new SessionsRepository(
      prisma as unknown as PrismaService,
    );

    await repository.completeSession(
      { ...closureParams, recommendations: [] },
      evaluateBadges,
    );

    expect(tx.recommendation.createMany).not.toHaveBeenCalled();
    expect(tx.axisBest.create).toHaveBeenCalledTimes(2);
    expect(tx.streak.upsert).toHaveBeenCalledTimes(1);
    expect(evaluateBadges).toHaveBeenCalledTimes(1);
  });

  it('writes no outcome and evaluates no badge when the session was already closed, yet returns the stored session', async () => {
    const { prisma, tx, storedSession } = buildClosurePrismaMock(0);
    const evaluateBadges = vi.fn().mockResolvedValue(undefined);
    const repository = new SessionsRepository(
      prisma as unknown as PrismaService,
    );

    const result = await repository.completeSession(
      closureParams,
      evaluateBadges,
    );

    expect(tx.session.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.recommendation.createMany).not.toHaveBeenCalled();
    expect(tx.axisBest.findUnique).not.toHaveBeenCalled();
    expect(tx.axisBest.create).not.toHaveBeenCalled();
    expect(tx.axisBest.update).not.toHaveBeenCalled();
    expect(tx.streak.upsert).not.toHaveBeenCalled();
    expect(evaluateBadges).not.toHaveBeenCalled();
    expect(tx.session.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: 'full-session' },
      include: SESSION_INCLUDE,
    });
    expect(result).toEqual({ session: storedSession });
  });

  it('lets a single closure write the outcome when two completions race on the same session', async () => {
    const { prisma, tx, storedSession } = buildClosurePrismaMock(0);
    tx.session.updateMany.mockResolvedValueOnce({ count: 1 });
    const evaluateBadges = vi.fn().mockResolvedValue(undefined);
    const repository = new SessionsRepository(
      prisma as unknown as PrismaService,
    );

    const results = await Promise.all([
      repository.completeSession(closureParams, evaluateBadges),
      repository.completeSession(closureParams, evaluateBadges),
    ]);

    expect(tx.session.updateMany).toHaveBeenCalledTimes(2);
    expect(tx.recommendation.createMany).toHaveBeenCalledTimes(1);
    expect(tx.axisBest.create).toHaveBeenCalledTimes(2);
    expect(tx.streak.upsert).toHaveBeenCalledTimes(1);
    expect(evaluateBadges).toHaveBeenCalledTimes(1);
    expect(results).toEqual([
      { session: storedSession },
      { session: storedSession },
    ]);
  });

  it('writes the outcome once when the transaction is retried after a closure that did commit', async () => {
    vi.useFakeTimers();
    const { prisma, tx, storedSession } = buildClosurePrismaMock(0);
    tx.session.updateMany.mockResolvedValueOnce({ count: 1 });
    prisma.$transaction.mockImplementationOnce(async (callback) => {
      await callback(tx);
      throw new Prisma.PrismaClientKnownRequestError(
        'Server has closed the connection',
        { code: 'P1017', clientVersion: 'test' },
      );
    });
    const evaluateBadges = vi.fn().mockResolvedValue(undefined);
    const repository = new SessionsRepository(
      prisma as unknown as PrismaService,
    );

    const pending = repository.completeSession(closureParams, evaluateBadges);
    await vi.runAllTimersAsync();
    const result = await pending;

    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(tx.session.updateMany).toHaveBeenCalledTimes(2);
    expect(tx.recommendation.createMany).toHaveBeenCalledTimes(1);
    expect(tx.streak.upsert).toHaveBeenCalledTimes(1);
    expect(evaluateBadges).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ session: storedSession });
  });
});
