import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { BadgeCategory, Prisma, SessionAxis } from '@prisma/client';
import {
  AxisType,
  ScoreBand,
  Sector,
  SessionMode,
} from '@psychotech/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadgesService } from '../badges/badges.service';
import { ScoringService } from '../scoring/scoring.service';
import { SessionWithRelations } from './sessions.mappers';
import { SessionsRepository } from './sessions.repository';
import { SessionsService } from './sessions.service';

function buildSession(
  overrides: Partial<SessionWithRelations> = {},
): SessionWithRelations {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    userId: 'user-1',
    mode: 'FULL',
    sector: 'RAILWAY',
    status: 'IN_PROGRESS',
    seed: 'seed',
    helpEnabled: false,
    energyCost: 5,
    currentAxisIndex: 0,
    globalScore: null,
    globalBand: null,
    isAdmissible: null,
    isEliminated: null,
    sectorThreshold: 70,
    startedAt: new Date('2026-06-13T10:00:00Z'),
    completedAt: null,
    abandonedAt: null,
    axisResults: [],
    recommendations: [],
    ...overrides,
  };
}

function buildAxis(overrides: Partial<SessionAxis> = {}): SessionAxis {
  return {
    id: 'axis-1',
    sessionId: '11111111-1111-1111-1111-111111111111',
    axis: 'LOGIC',
    order: 0,
    normalizedScore: null,
    band: null,
    skipped: false,
    startedAt: null,
    completedAt: null,
    metrics: null,
    ...overrides,
  };
}

const repository = {
  createSession: vi.fn(),
  findUserSession: vi.fn(),
  findSectorConfig: vi.fn(),
  findStreakContext: vi.fn(),
  updateAxisResult: vi.fn(),
  completeSession: vi.fn(),
  completeTargetedSession: vi.fn(),
  suspendSession: vi.fn(),
  abandonSession: vi.fn(),
  listSessions: vi.fn(),
};

const scoringService = { scoreAxis: vi.fn(), evaluateSession: vi.fn() };
const badgesService = { evaluateAndUnlockWithin: vi.fn() };

const service = new SessionsService(
  repository as unknown as SessionsRepository,
  scoringService as unknown as ScoringService,
  badgesService as unknown as BadgesService,
);

const SECTOR_CONFIG = {
  isActive: true,
  admissibilityThreshold: 70,
  vigilanceThreshold: 65,
  eliminatoryThreshold: 55,
  weights: [],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SessionsService.start', () => {
  it('creates the session without debiting energy while the debit is disabled', async () => {
    repository.findSectorConfig.mockResolvedValue(SECTOR_CONFIG);
    repository.createSession.mockResolvedValue(
      buildSession({ mode: 'TARGETED', energyCost: 1 }),
    );

    await service.start('user-1', {
      mode: SessionMode.TARGETED,
      sector: Sector.RAILWAY,
      axis: AxisType.LOGIC,
    });

    expect(repository.createSession).toHaveBeenCalledTimes(1);
    expect(repository.createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        mode: SessionMode.TARGETED,
        energyCost: 1,
        axes: [AxisType.LOGIC],
      }),
    );
  });

  it('persists the help option for a targeted session', async () => {
    repository.findSectorConfig.mockResolvedValue(SECTOR_CONFIG);
    repository.createSession.mockResolvedValue(
      buildSession({ mode: 'TARGETED', energyCost: 1, helpEnabled: true }),
    );

    await service.start('user-1', {
      mode: SessionMode.TARGETED,
      sector: Sector.RAILWAY,
      axis: AxisType.LOGIC,
      options: { helpEnabled: true },
    });

    expect(repository.createSession).toHaveBeenCalledWith(
      expect.objectContaining({ helpEnabled: true }),
    );
  });

  it('ignores the help option outside targeted mode', async () => {
    repository.findSectorConfig.mockResolvedValue(SECTOR_CONFIG);
    repository.createSession.mockResolvedValue(buildSession());

    await service.start('user-1', {
      mode: SessionMode.FULL,
      sector: Sector.RAILWAY,
      options: { helpEnabled: true },
    });

    expect(repository.createSession).toHaveBeenCalledWith(
      expect.objectContaining({ helpEnabled: false }),
    );
  });

  it('rejects an inactive sector before creating anything', async () => {
    repository.findSectorConfig.mockResolvedValue({ ...SECTOR_CONFIG, isActive: false });

    await expect(
      service.start('user-1', {
        mode: SessionMode.FULL,
        sector: Sector.AVIATION,
      }),
    ).rejects.toBeDefined();
    expect(repository.createSession).not.toHaveBeenCalled();
  });
});

describe('SessionsService.submitAxis', () => {
  const sessionId = '11111111-1111-1111-1111-111111111111';

  it('scores the submitted axis and stores the result', async () => {
    repository.findUserSession
      .mockResolvedValueOnce(buildSession({ axisResults: [buildAxis()] }))
      .mockResolvedValueOnce(buildSession({ axisResults: [buildAxis()] }));
    scoringService.scoreAxis.mockReturnValue({
      normalizedScore: 82,
      band: ScoreBand.EXCELLENT,
    });

    await service.submitAxis('user-1', sessionId, AxisType.LOGIC, {
      axis: AxisType.LOGIC,
      metrics: {
        axis: AxisType.LOGIC,
        pointsEarned: 50,
        itemsProcessed: 18,
      },
    });

    expect(scoringService.scoreAxis).toHaveBeenCalledTimes(1);
    expect(repository.updateAxisResult).toHaveBeenCalledWith(
      sessionId,
      AxisType.LOGIC,
      expect.objectContaining({ normalizedScore: 82, band: ScoreBand.EXCELLENT, skipped: false }),
    );
  });

  it('rejects a submission on a session that is not in progress', async () => {
    repository.findUserSession.mockResolvedValue(
      buildSession({ status: 'COMPLETED', axisResults: [buildAxis()] }),
    );

    await expect(
      service.submitAxis('user-1', sessionId, AxisType.LOGIC, { axis: AxisType.LOGIC, skipped: true }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.updateAxisResult).not.toHaveBeenCalled();
  });

  it('rejects a submission on a session that does not belong to the user', async () => {
    repository.findUserSession.mockResolvedValue(null);

    await expect(
      service.submitAxis('user-1', sessionId, AxisType.LOGIC, { axis: AxisType.LOGIC, skipped: true }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('SessionsService.completeTargeted', () => {
  const sessionId = '11111111-1111-1111-1111-111111111111';
  const targetedSession = () =>
    buildSession({ mode: 'TARGETED', energyCost: 1, axisResults: [buildAxis()] });
  const answers = (count: number) =>
    Array.from({ length: count }, (_, index) => ({
      index,
      answerIndex: index % 4 === 0 ? null : 0,
      timeMs: 1200,
      helpUsed: index % 5 === 0,
    }));

  it('stores raw answers as metrics and completes the session without scoring', async () => {
    repository.findUserSession.mockResolvedValue(targetedSession());
    repository.completeTargetedSession.mockResolvedValue(
      buildSession({ mode: 'TARGETED', status: 'COMPLETED', axisResults: [buildAxis()] }),
    );

    const result = await service.completeTargeted('user-1', sessionId, AxisType.LOGIC, {
      axis: AxisType.LOGIC,
      items: answers(40),
    });

    expect(scoringService.scoreAxis).not.toHaveBeenCalled();
    expect(scoringService.evaluateSession).not.toHaveBeenCalled();
    expect(repository.completeTargetedSession).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId,
        axis: AxisType.LOGIC,
        rawResult: { axis: AxisType.LOGIC, items: answers(40) },
      }),
    );
    expect(result.status).toBe('COMPLETED');
  });

  it('rejects a session that is already completed', async () => {
    repository.findUserSession.mockResolvedValue(
      buildSession({ mode: 'TARGETED', status: 'COMPLETED', axisResults: [buildAxis()] }),
    );

    await expect(
      service.completeTargeted('user-1', sessionId, AxisType.LOGIC, {
        axis: AxisType.LOGIC,
        items: answers(40),
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.completeTargetedSession).not.toHaveBeenCalled();
  });

  it('rejects a session that is not targeted', async () => {
    repository.findUserSession.mockResolvedValue(
      buildSession({ axisResults: [buildAxis()] }),
    );

    await expect(
      service.completeTargeted('user-1', sessionId, AxisType.LOGIC, {
        axis: AxisType.LOGIC,
        items: answers(40),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.completeTargetedSession).not.toHaveBeenCalled();
  });

  it('rejects duplicate or out-of-range item indexes', async () => {
    repository.findUserSession.mockResolvedValue(targetedSession());

    await expect(
      service.completeTargeted('user-1', sessionId, AxisType.LOGIC, {
        axis: AxisType.LOGIC,
        items: [...answers(2), { index: 0, answerIndex: 1, timeMs: 500 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.completeTargeted('user-1', sessionId, AxisType.LOGIC, {
        axis: AxisType.LOGIC,
        items: [{ index: 40, answerIndex: 1, timeMs: 500 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.completeTargetedSession).not.toHaveBeenCalled();
  });
});

describe('SessionsService.completeTargeted (memory)', () => {
  const sessionId = '11111111-1111-1111-1111-111111111111';
  const memorySession = () =>
    buildSession({
      mode: 'TARGETED',
      energyCost: 1,
      axisResults: [buildAxis({ axis: 'MEMORY' })],
    });
  const sequenceAnswers = [
    { index: 0, input: [3, 7, 1, 9], timeMs: 8200, timedOut: false },
    { index: 1, input: [5, 2, 8, 4, 6], timeMs: 12400, timedOut: false },
    { index: 2, input: [], timeMs: 30000, timedOut: true },
    { index: 3, input: [9, 1, 7, 3], timeMs: 9100, timedOut: false },
    { index: 4, input: [6, 4, 8], timeMs: 30000, timedOut: true },
  ];

  it('stores raw sequence answers as metrics without scoring', async () => {
    repository.findUserSession.mockResolvedValue(memorySession());
    repository.completeTargetedSession.mockResolvedValue(
      buildSession({
        mode: 'TARGETED',
        status: 'COMPLETED',
        axisResults: [buildAxis({ axis: 'MEMORY' })],
      }),
    );

    await service.completeTargeted('user-1', sessionId, AxisType.MEMORY, {
      axis: AxisType.MEMORY,
      sequences: sequenceAnswers,
    });

    expect(scoringService.scoreAxis).not.toHaveBeenCalled();
    expect(repository.completeTargetedSession).toHaveBeenCalledWith(
      expect.objectContaining({
        axis: AxisType.MEMORY,
        rawResult: { axis: AxisType.MEMORY, sequences: sequenceAnswers },
      }),
    );
  });

  it('rejects duplicate sequence indexes or inputs longer than the plan', async () => {
    repository.findUserSession.mockResolvedValue(memorySession());

    await expect(
      service.completeTargeted('user-1', sessionId, AxisType.MEMORY, {
        axis: AxisType.MEMORY,
        sequences: [sequenceAnswers[0], { ...sequenceAnswers[1], index: 0 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.completeTargeted('user-1', sessionId, AxisType.MEMORY, {
        axis: AxisType.MEMORY,
        sequences: [
          { index: 0, input: [1, 2, 3, 4, 5, 6, 7], timeMs: 500, timedOut: false },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.completeTargetedSession).not.toHaveBeenCalled();
  });
});

describe('SessionsService.completeTargeted (discrimination)', () => {
  const sessionId = '11111111-1111-1111-1111-111111111111';
  const discriminationSession = () =>
    buildSession({
      mode: 'TARGETED',
      energyCost: 1,
      axisResults: [buildAxis({ axis: 'VISUAL_DISCRIMINATION' })],
    });
  const trialAnswers = Array.from({ length: 36 }, (_, index) => ({
    index,
    answer:
      index < 20 ? (index % 2 === 0 ? ('IDENTICAL' as const) : ('DIFFERENT' as const)) : null,
    timeMs: index < 20 ? 2400 : 0,
  }));

  it('stores raw trial answers as metrics without scoring', async () => {
    repository.findUserSession.mockResolvedValue(discriminationSession());
    repository.completeTargetedSession.mockResolvedValue(
      buildSession({
        mode: 'TARGETED',
        status: 'COMPLETED',
        axisResults: [buildAxis({ axis: 'VISUAL_DISCRIMINATION' })],
      }),
    );

    await service.completeTargeted(
      'user-1',
      sessionId,
      AxisType.VISUAL_DISCRIMINATION,
      { axis: AxisType.VISUAL_DISCRIMINATION, trials: trialAnswers },
    );

    expect(scoringService.scoreAxis).not.toHaveBeenCalled();
    expect(repository.completeTargetedSession).toHaveBeenCalledWith(
      expect.objectContaining({
        axis: AxisType.VISUAL_DISCRIMINATION,
        rawResult: {
          axis: AxisType.VISUAL_DISCRIMINATION,
          trials: trialAnswers,
        },
      }),
    );
  });

  it('rejects duplicate or out-of-range trial indexes', async () => {
    repository.findUserSession.mockResolvedValue(discriminationSession());

    await expect(
      service.completeTargeted('user-1', sessionId, AxisType.VISUAL_DISCRIMINATION, {
        axis: AxisType.VISUAL_DISCRIMINATION,
        trials: [trialAnswers[0], { ...trialAnswers[1], index: 0 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.completeTargeted('user-1', sessionId, AxisType.VISUAL_DISCRIMINATION, {
        axis: AxisType.VISUAL_DISCRIMINATION,
        trials: [{ index: 36, answer: null, timeMs: 0 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.completeTargetedSession).not.toHaveBeenCalled();
  });
});

describe('SessionsService.complete', () => {
  const sessionId = '11111111-1111-1111-1111-111111111111';
  const unlockedBadge = {
    code: 'VOLUME_FIRST_SIMULATION',
    name: 'Première simulation',
    description: 'Terminez votre première simulation complète.',
    category: BadgeCategory.VOLUME,
    icon: 'rocket',
  };

  it('evaluates badges within the completion transaction and returns the freshly unlocked ones', async () => {
    const scoredAxis = buildAxis({ normalizedScore: 75, band: 'ACCEPTABLE' });
    repository.findUserSession.mockResolvedValue(
      buildSession({ status: 'IN_PROGRESS', axisResults: [scoredAxis] }),
    );
    repository.findSectorConfig.mockResolvedValue({
      ...SECTOR_CONFIG,
      weights: [{ axis: AxisType.LOGIC, coefficient: 1, isCritical: false }],
    });
    scoringService.evaluateSession.mockReturnValue({
      globalScore: 75,
      globalBand: ScoreBand.ACCEPTABLE,
      isAdmissible: true,
      isEliminated: false,
      recommendations: [],
    });
    repository.findStreakContext.mockResolvedValue({
      timezone: 'Europe/Paris',
      streak: null,
    });
    badgesService.evaluateAndUnlockWithin.mockResolvedValue([unlockedBadge]);
    repository.completeSession.mockImplementation(
      async (
        _params: unknown,
        unlockBadges: (client: Prisma.TransactionClient) => Promise<unknown>,
      ) => {
        const unlockedBadges = await unlockBadges({} as Prisma.TransactionClient);
        return {
          session: buildSession({
            status: 'COMPLETED',
            globalScore: 75,
            globalBand: 'ACCEPTABLE',
            axisResults: [scoredAxis],
          }),
          unlockedBadges,
        };
      },
    );

    const result = await service.complete('user-1', sessionId);

    expect(badgesService.evaluateAndUnlockWithin).toHaveBeenCalledTimes(1);
    expect(badgesService.evaluateAndUnlockWithin).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      { currentStreak: 1, flawlessVisualDiscrimination: false },
    );
    expect(result.unlockedBadges).toEqual([unlockedBadge]);
  });
});
