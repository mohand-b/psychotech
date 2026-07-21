import { SessionStatus as DbSessionStatus } from '@prisma/client';
import {
  AxisType,
  Sector,
  SessionMode,
  TrainingOptionId,
} from '@psychotech/shared';
import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
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
  it('excludes unfinished sessions and restricts an axis filter to targeted sessions only', async () => {
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
          mode: 'TARGETED',
          axisResults: { some: { axis: 'REACTIVITY' } },
        },
        take: 11,
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
