import { AxisType, ScoreBand, SessionMode } from '@psychotech/shared';
import { describe, expect, it, vi } from 'vitest';
import { ProgressionRepository } from './progression.repository';
import { ProgressionService } from './progression.service';

function repositoryMock(overrides: Partial<Record<keyof ProgressionRepository, unknown>> = {}) {
  return {
    getStreak: vi.fn().mockResolvedValue({ current: 3, longest: 7 }),
    countCompletedSessionsByMode: vi.fn().mockResolvedValue({ full: 8, targeted: 15 }),
    getFirstScoredSessionDate: vi.fn().mockResolvedValue(new Date('2026-04-14T09:00:00Z')),
    getBestFullSession: vi.fn().mockResolvedValue({
      globalScore: 78.2,
      completedAt: new Date('2026-06-02T18:00:00Z'),
    }),
    getEvolution: vi.fn().mockResolvedValue([
      {
        sessionId: 'first',
        completedAt: new Date('2026-04-14T10:00:00Z'),
        globalScore: 64.2,
        band: ScoreBand.FRAGILE,
      },
      {
        sessionId: 'last',
        completedAt: new Date('2026-06-13T19:42:00Z'),
        globalScore: 74.8,
        band: ScoreBand.ACCEPTABLE,
      },
    ]),
    getFirstFullSession: vi.fn().mockResolvedValue({
      globalScore: 64.2,
      completedAt: new Date('2026-04-14T10:00:00Z'),
      axes: [{ axis: AxisType.LOGIC, score: 70 }],
    }),
    getLastFullSession: vi.fn().mockResolvedValue({
      globalScore: 74.8,
      completedAt: new Date('2026-06-13T19:42:00Z'),
      axes: [{ axis: AxisType.LOGIC, score: 82 }],
    }),
    getAxisHistory: vi.fn().mockResolvedValue([
      {
        date: new Date('2026-06-13T19:42:00Z'),
        score: 82,
        band: ScoreBand.EXCELLENT,
        metrics: null,
        sessionId: 'last',
        sessionMode: SessionMode.FULL,
      },
    ]),
    ...overrides,
  } as unknown as ProgressionRepository;
}

describe('ProgressionService.getProgression', () => {
  it('assembles counts, boundary scores and their dates from completed sessions', async () => {
    const service = new ProgressionService(repositoryMock());

    const progression = await service.getProgression('user-1');

    expect(progression.stats).toEqual({
      currentStreak: 3,
      longestStreak: 7,
      completedSessions: 23,
      fullSessionsCount: 8,
      targetedSessionsCount: 15,
      firstSessionAt: '2026-04-14T09:00:00.000Z',
      firstFullSessionAt: '2026-04-14T10:00:00.000Z',
      firstGlobalScore: 64.2,
      bestGlobalScore: 78.2,
      bestGlobalScoreAt: '2026-06-02T18:00:00.000Z',
    });
    expect(progression.radar.first[0]).toEqual({ axis: AxisType.LOGIC, score: 70 });
    expect(progression.radar.last[0]).toEqual({ axis: AxisType.LOGIC, score: 82 });
    expect(progression.axes[0].lastSessionId).toBe('last');
    expect(progression.axes[0].lastSessionMode).toBe(SessionMode.FULL);
  });

  it('returns empty aggregates for an account with no completed session', async () => {
    const service = new ProgressionService(
      repositoryMock({
        getStreak: vi.fn().mockResolvedValue(null),
        countCompletedSessionsByMode: vi.fn().mockResolvedValue({ full: 0, targeted: 0 }),
        getFirstScoredSessionDate: vi.fn().mockResolvedValue(null),
        getBestFullSession: vi.fn().mockResolvedValue(null),
        getEvolution: vi.fn().mockResolvedValue([]),
        getFirstFullSession: vi.fn().mockResolvedValue(null),
        getLastFullSession: vi.fn().mockResolvedValue(null),
        getAxisHistory: vi.fn().mockResolvedValue([]),
      }),
    );

    const progression = await service.getProgression('user-1');

    expect(progression.stats).toEqual({
      currentStreak: 0,
      longestStreak: 0,
      completedSessions: 0,
      fullSessionsCount: 0,
      targetedSessionsCount: 0,
      firstSessionAt: null,
      firstFullSessionAt: null,
      firstGlobalScore: null,
      bestGlobalScore: null,
      bestGlobalScoreAt: null,
    });
    expect(progression.evolution).toEqual([]);
    expect(progression.axes.every((axis) => axis.currentScore === null)).toBe(true);
    expect(progression.axes.every((axis) => axis.lastSessionId === null)).toBe(true);
    expect(progression.radar.last.every((entry) => entry.score === null)).toBe(true);
  });
});
