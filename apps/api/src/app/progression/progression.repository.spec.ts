import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressionRepository } from './progression.repository';

describe('ProgressionRepository.countCompletedSessionsByMode', () => {
  it('counts completed sessions per mode, excluding tutorials and abandoned ones', async () => {
    const prisma = {
      session: {
        groupBy: vi.fn().mockResolvedValue([
          { mode: 'FULL', _count: { _all: 8 } },
          { mode: 'TARGETED', _count: { _all: 15 } },
        ]),
      },
    };
    const repository = new ProgressionRepository(prisma as unknown as PrismaService);

    const counts = await repository.countCompletedSessionsByMode('user-1');

    expect(prisma.session.groupBy).toHaveBeenCalledWith({
      by: ['mode'],
      where: { userId: 'user-1', status: 'COMPLETED', mode: { in: ['FULL', 'TARGETED'] } },
      _count: { _all: true },
    });
    expect(counts).toEqual({ full: 8, targeted: 15 });
  });

  it('returns zero counts when no session is completed', async () => {
    const prisma = { session: { groupBy: vi.fn().mockResolvedValue([]) } };
    const repository = new ProgressionRepository(prisma as unknown as PrismaService);

    expect(await repository.countCompletedSessionsByMode('user-1')).toEqual({
      full: 0,
      targeted: 0,
    });
  });
});

describe('ProgressionRepository.getFirstSessionDate', () => {
  it('restricts the first date to completed full and targeted sessions', async () => {
    const prisma = {
      session: {
        aggregate: vi
          .fn()
          .mockResolvedValue({ _min: { startedAt: new Date('2026-04-14T09:00:00Z') } }),
      },
    };
    const repository = new ProgressionRepository(prisma as unknown as PrismaService);

    const first = await repository.getFirstSessionDate('user-1');

    expect(prisma.session.aggregate).toHaveBeenCalledWith({
      where: { userId: 'user-1', status: 'COMPLETED', mode: { in: ['FULL', 'TARGETED'] } },
      _min: { startedAt: true },
    });
    expect(first?.toISOString()).toBe('2026-04-14T09:00:00.000Z');
  });
});

describe('ProgressionRepository.getBestFullSession', () => {
  it('returns the highest scored completed simulation with its date', async () => {
    const prisma = {
      session: {
        findFirst: vi.fn().mockResolvedValue({
          globalScore: 78.2,
          completedAt: new Date('2026-06-02T18:00:00Z'),
        }),
      },
    };
    const repository = new ProgressionRepository(prisma as unknown as PrismaService);

    const best = await repository.getBestFullSession('user-1');

    expect(prisma.session.findFirst).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        status: 'COMPLETED',
        mode: 'FULL',
        globalScore: { not: null },
      },
      orderBy: [{ globalScore: 'desc' }, { completedAt: 'asc' }],
      select: { globalScore: true, completedAt: true },
    });
    expect(best).toEqual({
      globalScore: 78.2,
      completedAt: new Date('2026-06-02T18:00:00Z'),
    });
  });

  it('returns null when no simulation is completed', async () => {
    const prisma = { session: { findFirst: vi.fn().mockResolvedValue(null) } };
    const repository = new ProgressionRepository(prisma as unknown as PrismaService);

    expect(await repository.getBestFullSession('user-1')).toBeNull();
  });
});
