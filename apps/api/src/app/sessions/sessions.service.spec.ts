import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BadgeCategory, Prisma, SessionAxis } from '@prisma/client';
import {
  AxisType,
  ControlModality,
  MotorSkillsMetrics,
  ScoreBand,
  Sector,
  SessionMode,
  LogicFamilyFilter,
  TrainingOptionId,
  generateMotricityCourses,
  scoreMotricitySession,
} from '@psychotech/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadgesService } from '../badges/badges.service';
import { ScoringService } from '../scoring/scoring.service';
import { TierResolutionService } from '../subscriptions/tier-resolution.service';
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
    contentVersion: 1,
    logicFamily: null,
    helpEnabled: false,
    trainingOptions: [],
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
    controlModality: null,
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

function walk(
  course: ReturnType<typeof generateMotricityCourses>[number],
  durationMs: number,
  untilPct = 100,
) {
  const targetLength = (untilPct / 100) * course.totalLength;
  const sampleCount = Math.round(durationMs / (1000 / 60));
  return Array.from({ length: sampleCount + 1 }, (_, index) => {
    let remaining = (index / sampleCount) * targetLength;
    let position = course.centerline[0];
    for (const segment of course.segments) {
      if (remaining <= segment.length) {
        const ratio = remaining / segment.length;
        position = {
          x: segment.start.x + (segment.end.x - segment.start.x) * ratio,
          y: segment.start.y + (segment.end.y - segment.start.y) * ratio,
        };
        break;
      }
      remaining -= segment.length;
      position = segment.end;
    }
    return {
      t: Math.round(index * (1000 / 60)),
      x: position.x,
      y: position.y,
    };
  });
}

const repository = {
  createSession: vi.fn(),
  findUserSubscription: vi.fn(),
  findUserSession: vi.fn(),
  findSectorConfig: vi.fn(),
  findStreakContext: vi.fn(),
  completeFullSessionAxis: vi.fn(),
  completeSession: vi.fn(),
  completeTargetedSession: vi.fn(),
  suspendSession: vi.fn(),
  listHistory: vi.fn(),
  findCurrentSession: vi.fn(),
  findTargetedAxisHistory: vi.fn(),
  persistAxisScore: vi.fn(),
};

const scoringService = { scoreAxis: vi.fn(), evaluateSession: vi.fn() };
const badgesService = { evaluateAndUnlockWithin: vi.fn() };

const tierResolution = new TierResolutionService({
  getOrThrow: () => ({ enabled: true }),
} as unknown as ConfigService);

const service = new SessionsService(
  repository as unknown as SessionsRepository,
  scoringService as unknown as ScoringService,
  badgesService as unknown as BadgesService,
  tierResolution,
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
  repository.findUserSubscription.mockResolvedValue({
    tier: 'ESSENTIAL',
    status: 'ACTIVE',
  });
});

describe('SessionsService.start subscription gate', () => {
  it('rejects a targeted session without a paid subscription', async () => {
    repository.findUserSubscription.mockResolvedValue(null);

    await expect(
      service.start('user-1', {
        mode: SessionMode.TARGETED,
        sector: Sector.RAILWAY,
        axis: AxisType.LOGIC,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.createSession).not.toHaveBeenCalled();
  });

  it('rejects a full session without a paid subscription', async () => {
    repository.findUserSubscription.mockResolvedValue(null);

    await expect(
      service.start('user-1', {
        mode: SessionMode.FULL,
        sector: Sector.RAILWAY,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.createSession).not.toHaveBeenCalled();
  });

  it('rejects again once the subscription is canceled by webhook', async () => {
    repository.findUserSubscription.mockResolvedValue({
      tier: 'ESSENTIAL',
      status: 'CANCELED',
    });

    await expect(
      service.start('user-1', {
        mode: SessionMode.TARGETED,
        sector: Sector.RAILWAY,
        axis: AxisType.LOGIC,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('keeps tutorials open without any subscription', async () => {
    repository.findUserSubscription.mockResolvedValue(null);
    repository.findSectorConfig.mockResolvedValue(SECTOR_CONFIG);
    repository.createSession.mockResolvedValue(
      buildSession({ mode: 'TUTORIAL', energyCost: 0 }),
    );

    await service.start('user-1', {
      mode: SessionMode.TUTORIAL,
      sector: Sector.RAILWAY,
      axis: AxisType.LOGIC,
    });

    expect(repository.findUserSubscription).not.toHaveBeenCalled();
    expect(repository.createSession).toHaveBeenCalledTimes(1);
  });
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

  it('persists the enabled training options for a targeted session', async () => {
    repository.findSectorConfig.mockResolvedValue(SECTOR_CONFIG);
    repository.createSession.mockResolvedValue(
      buildSession({ mode: 'TARGETED', energyCost: 1, helpEnabled: true }),
    );

    await service.start('user-1', {
      mode: SessionMode.TARGETED,
      sector: Sector.RAILWAY,
      axis: AxisType.LOGIC,
      options: { enabledOptions: [TrainingOptionId.LOGIC_HELP] },
    });

    expect(repository.createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        helpEnabled: true,
        trainingOptions: [TrainingOptionId.LOGIC_HELP],
      }),
    );
  });

  it('accepts the no-timer option combined with help for logic', async () => {
    repository.findSectorConfig.mockResolvedValue(SECTOR_CONFIG);
    repository.createSession.mockResolvedValue(
      buildSession({ mode: 'TARGETED', energyCost: 1, helpEnabled: true }),
    );

    await service.start('user-1', {
      mode: SessionMode.TARGETED,
      sector: Sector.RAILWAY,
      axis: AxisType.LOGIC,
      options: {
        enabledOptions: [TrainingOptionId.LOGIC_HELP, TrainingOptionId.NO_TIMER],
      },
    });

    expect(repository.createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        helpEnabled: true,
        trainingOptions: [
          TrainingOptionId.LOGIC_HELP,
          TrainingOptionId.NO_TIMER,
        ],
      }),
    );
  });

  it('accepts the no-timer option for visual discrimination', async () => {
    repository.findSectorConfig.mockResolvedValue(SECTOR_CONFIG);
    repository.createSession.mockResolvedValue(
      buildSession({ mode: 'TARGETED', energyCost: 1 }),
    );

    await service.start('user-1', {
      mode: SessionMode.TARGETED,
      sector: Sector.RAILWAY,
      axis: AxisType.VISUAL_DISCRIMINATION,
      options: { enabledOptions: [TrainingOptionId.NO_TIMER] },
    });

    expect(repository.createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        helpEnabled: false,
        trainingOptions: [TrainingOptionId.NO_TIMER],
      }),
    );
  });

  it('rejects the no-timer option for an axis without it', async () => {
    repository.findSectorConfig.mockResolvedValue(SECTOR_CONFIG);

    await expect(
      service.start('user-1', {
        mode: SessionMode.TARGETED,
        sector: Sector.RAILWAY,
        axis: AxisType.MEMORY,
        options: { enabledOptions: [TrainingOptionId.NO_TIMER] },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.createSession).not.toHaveBeenCalled();
  });

  it('rejects a training option outside targeted mode', async () => {
    repository.findSectorConfig.mockResolvedValue(SECTOR_CONFIG);

    await expect(
      service.start('user-1', {
        mode: SessionMode.FULL,
        sector: Sector.RAILWAY,
        options: { enabledOptions: [TrainingOptionId.LOGIC_HELP] },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.createSession).not.toHaveBeenCalled();
  });

  it('rejects the no-timer option in a full simulation', async () => {
    repository.findSectorConfig.mockResolvedValue(SECTOR_CONFIG);

    await expect(
      service.start('user-1', {
        mode: SessionMode.FULL,
        sector: Sector.RAILWAY,
        options: { enabledOptions: [TrainingOptionId.NO_TIMER] },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.createSession).not.toHaveBeenCalled();
  });

  it('rejects a training option that does not belong to the targeted axis', async () => {
    repository.findSectorConfig.mockResolvedValue(SECTOR_CONFIG);

    await expect(
      service.start('user-1', {
        mode: SessionMode.TARGETED,
        sector: Sector.RAILWAY,
        axis: AxisType.MEMORY,
        options: {
          enabledOptions: [TrainingOptionId.REACTIVITY_LIVE_METRICS],
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.createSession).not.toHaveBeenCalled();
  });

  it('persists the logic family filter and the content version for a targeted logic session', async () => {
    repository.findSectorConfig.mockResolvedValue(SECTOR_CONFIG);
    repository.createSession.mockResolvedValue(
      buildSession({ mode: 'TARGETED', energyCost: 1 }),
    );

    await service.start('user-1', {
      mode: SessionMode.TARGETED,
      sector: Sector.RAILWAY,
      axis: AxisType.LOGIC,
      options: { enabledOptions: [], logicFamily: LogicFamilyFilter.DOMINO },
    });

    expect(repository.createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        contentVersion: 4,
        logicFamily: LogicFamilyFilter.DOMINO,
      }),
    );
  });

  it('rejects the family filter in a full simulation', async () => {
    repository.findSectorConfig.mockResolvedValue(SECTOR_CONFIG);

    await expect(
      service.start('user-1', {
        mode: SessionMode.FULL,
        sector: Sector.RAILWAY,
        options: { enabledOptions: [], logicFamily: LogicFamilyFilter.MATRIX },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.createSession).not.toHaveBeenCalled();
  });

  it('rejects the family filter on a non-logic targeted axis', async () => {
    repository.findSectorConfig.mockResolvedValue(SECTOR_CONFIG);

    await expect(
      service.start('user-1', {
        mode: SessionMode.TARGETED,
        sector: Sector.RAILWAY,
        axis: AxisType.MEMORY,
        options: { enabledOptions: [], logicFamily: LogicFamilyFilter.NUMERIC },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.createSession).not.toHaveBeenCalled();
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

describe('SessionsService.completeAxis (targeted)', () => {
  const sessionId = '11111111-1111-1111-1111-111111111111';
  const targetedSession = () =>
    buildSession({ mode: 'TARGETED', energyCost: 1, axisResults: [buildAxis()] });
  const answers = (count: number) =>
    Array.from({ length: count }, (_, index) => ({
      index,
      answerIndex: 0,
      timeMs: 1200,
      helpUsed: index % 5 === 0,
    }));

  it('stores raw answers as metrics and completes the session without scoring', async () => {
    repository.findUserSession.mockResolvedValue(targetedSession());
    repository.completeTargetedSession.mockResolvedValue(
      buildSession({ mode: 'TARGETED', status: 'COMPLETED', axisResults: [buildAxis()] }),
    );

    const result = await service.completeAxis('user-1', sessionId, AxisType.LOGIC, {
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
        excludeFromBest: false,
      }),
    );
    expect(result.status).toBe('COMPLETED');
  });

  it('excludes a family-filtered session from the axis best', async () => {
    repository.findUserSession.mockResolvedValue(
      buildSession({
        mode: 'TARGETED',
        energyCost: 1,
        contentVersion: 2,
        logicFamily: LogicFamilyFilter.DOMINO,
        axisResults: [buildAxis()],
      }),
    );
    repository.completeTargetedSession.mockResolvedValue(
      buildSession({ mode: 'TARGETED', status: 'COMPLETED', axisResults: [buildAxis()] }),
    );

    await service.completeAxis('user-1', sessionId, AxisType.LOGIC, {
      axis: AxisType.LOGIC,
      items: answers(40),
    });

    expect(repository.completeTargetedSession).toHaveBeenCalledWith(
      expect.objectContaining({ excludeFromBest: true }),
    );
  });

  it('excludes a no-timer session from the axis best', async () => {
    repository.findUserSession.mockResolvedValue(
      buildSession({
        mode: 'TARGETED',
        energyCost: 1,
        trainingOptions: [TrainingOptionId.NO_TIMER],
        axisResults: [buildAxis()],
      }),
    );
    repository.completeTargetedSession.mockResolvedValue(
      buildSession({ mode: 'TARGETED', status: 'COMPLETED', axisResults: [buildAxis()] }),
    );

    await service.completeAxis('user-1', sessionId, AxisType.LOGIC, {
      axis: AxisType.LOGIC,
      items: answers(40),
    });

    expect(repository.completeTargetedSession).toHaveBeenCalledWith(
      expect.objectContaining({ excludeFromBest: true }),
    );
  });

  it('rejects a session that is already completed', async () => {
    repository.findUserSession.mockResolvedValue(
      buildSession({ mode: 'TARGETED', status: 'COMPLETED', axisResults: [buildAxis()] }),
    );

    await expect(
      service.completeAxis('user-1', sessionId, AxisType.LOGIC, {
        axis: AxisType.LOGIC,
        items: answers(40),
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.completeTargetedSession).not.toHaveBeenCalled();
  });

  it('rejects a submission on a session that does not belong to the user', async () => {
    repository.findUserSession.mockResolvedValue(null);

    await expect(
      service.completeAxis('user-1', sessionId, AxisType.LOGIC, {
        axis: AxisType.LOGIC,
        items: answers(40),
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.completeTargetedSession).not.toHaveBeenCalled();
  });

  it('rejects a session that is not targeted nor full', async () => {
    repository.findUserSession.mockResolvedValue(
      buildSession({ mode: 'TUTORIAL', energyCost: 0, axisResults: [buildAxis()] }),
    );

    await expect(
      service.completeAxis('user-1', sessionId, AxisType.LOGIC, {
        axis: AxisType.LOGIC,
        items: answers(40),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.completeTargetedSession).not.toHaveBeenCalled();
  });

  it('rejects duplicate or out-of-range item indexes', async () => {
    repository.findUserSession.mockResolvedValue(targetedSession());

    await expect(
      service.completeAxis('user-1', sessionId, AxisType.LOGIC, {
        axis: AxisType.LOGIC,
        items: [...answers(2), { index: 0, answerIndex: 1, timeMs: 500 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.completeAxis('user-1', sessionId, AxisType.LOGIC, {
        axis: AxisType.LOGIC,
        items: [{ index: 40, answerIndex: 1, timeMs: 500 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.completeTargetedSession).not.toHaveBeenCalled();
  });

  it('rejects a completion while the axis is still being played', async () => {
    repository.findUserSession.mockResolvedValue(targetedSession());

    await expect(
      service.completeAxis('user-1', sessionId, AxisType.LOGIC, {
        axis: AxisType.LOGIC,
        items: answers(10),
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.completeTargetedSession).not.toHaveBeenCalled();
  });

  it('accepts a completion once the active play time reaches the timer, even with unanswered items', async () => {
    repository.findUserSession.mockResolvedValue(targetedSession());
    repository.completeTargetedSession.mockResolvedValue(
      buildSession({ mode: 'TARGETED', status: 'COMPLETED', axisResults: [buildAxis()] }),
    );

    await service.completeAxis('user-1', sessionId, AxisType.LOGIC, {
      axis: AxisType.LOGIC,
      items: Array.from({ length: 30 }, (_, index) => ({
        index,
        answerIndex: index % 3 === 0 ? null : 0,
        timeMs: 20000,
        helpUsed: false,
        visited: true,
      })),
    });

    expect(repository.completeTargetedSession).toHaveBeenCalledTimes(1);
  });
});

describe('SessionsService.completeAxis (memory)', () => {
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

    await service.completeAxis('user-1', sessionId, AxisType.MEMORY, {
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

  it('rejects a completion before the five sequences are played', async () => {
    repository.findUserSession.mockResolvedValue(memorySession());

    await expect(
      service.completeAxis('user-1', sessionId, AxisType.MEMORY, {
        axis: AxisType.MEMORY,
        sequences: sequenceAnswers.slice(0, 4),
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.completeTargetedSession).not.toHaveBeenCalled();
  });

  it('rejects duplicate sequence indexes or inputs longer than the plan', async () => {
    repository.findUserSession.mockResolvedValue(memorySession());

    await expect(
      service.completeAxis('user-1', sessionId, AxisType.MEMORY, {
        axis: AxisType.MEMORY,
        sequences: [sequenceAnswers[0], { ...sequenceAnswers[1], index: 0 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.completeAxis('user-1', sessionId, AxisType.MEMORY, {
        axis: AxisType.MEMORY,
        sequences: [
          { index: 0, input: [1, 2, 3, 4, 5, 6, 7], timeMs: 500, timedOut: false },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.completeTargetedSession).not.toHaveBeenCalled();
  });
});

describe('SessionsService.completeAxis (discrimination)', () => {
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
      index % 2 === 0 ? ('IDENTICAL' as const) : ('DIFFERENT' as const),
    timeMs: 2400,
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

    await service.completeAxis(
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
      service.completeAxis('user-1', sessionId, AxisType.VISUAL_DISCRIMINATION, {
        axis: AxisType.VISUAL_DISCRIMINATION,
        trials: [trialAnswers[0], { ...trialAnswers[1], index: 0 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.completeAxis('user-1', sessionId, AxisType.VISUAL_DISCRIMINATION, {
        axis: AxisType.VISUAL_DISCRIMINATION,
        trials: [{ index: 36, answer: null, timeMs: 0 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.completeTargetedSession).not.toHaveBeenCalled();
  });

  it('rejects a completion while trials remain unanswered and the timer is not over', async () => {
    repository.findUserSession.mockResolvedValue(discriminationSession());

    await expect(
      service.completeAxis('user-1', sessionId, AxisType.VISUAL_DISCRIMINATION, {
        axis: AxisType.VISUAL_DISCRIMINATION,
        trials: trialAnswers.slice(0, 12),
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.completeTargetedSession).not.toHaveBeenCalled();
  });
});

describe('SessionsService.completeAxis (reactivity)', () => {
  const sessionId = '11111111-1111-1111-1111-111111111111';
  const reactivitySession = () =>
    buildSession({
      mode: 'TARGETED',
      energyCost: 1,
      axisResults: [buildAxis({ axis: 'REACTIVITY' })],
    });
  const stimuli = [{ index: 0, commandPressed: 'LEFT' as const, trMs: 400 }];

  it('rejects a completion whose transmitted active play time is short of the timer', async () => {
    repository.findUserSession.mockResolvedValue(reactivitySession());

    await expect(
      service.completeAxis('user-1', sessionId, AxisType.REACTIVITY, {
        axis: AxisType.REACTIVITY,
        stimuli,
        waitPresses: [],
        playedMs: 60000,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.completeTargetedSession).not.toHaveBeenCalled();
  });

  it('accepts a completion once the transmitted active play time reaches the trial duration', async () => {
    repository.findUserSession.mockResolvedValue(reactivitySession());
    repository.completeTargetedSession.mockResolvedValue(
      buildSession({
        mode: 'TARGETED',
        status: 'COMPLETED',
        axisResults: [buildAxis({ axis: 'REACTIVITY' })],
      }),
    );

    await service.completeAxis('user-1', sessionId, AxisType.REACTIVITY, {
      axis: AxisType.REACTIVITY,
      stimuli,
      waitPresses: [],
      playedMs: 180000,
    });

    expect(repository.completeTargetedSession).toHaveBeenCalledTimes(1);
  });
});

describe('SessionsService.completeAxis (full simulation)', () => {
  const sessionId = '11111111-1111-1111-1111-111111111111';
  const axisOrder = [
    'LOGIC',
    'MEMORY',
    'VISUAL_DISCRIMINATION',
    'REACTIVITY',
    'MOTOR_SKILLS',
  ] as const;
  const fullAxes = (doneCount: number) =>
    axisOrder.map((axis, order) =>
      buildAxis({
        id: `axis-${order + 1}`,
        axis,
        order,
        ...(order < doneCount
          ? {
              normalizedScore: 70,
              band: 'ACCEPTABLE' as const,
              completedAt: new Date('2026-06-13T10:05:00Z'),
            }
          : {}),
      }),
    );
  const fullSession = (doneCount: number) =>
    buildSession({
      currentAxisIndex: doneCount,
      axisResults: fullAxes(doneCount),
    });
  const logicAnswers = Array.from({ length: 40 }, (_, index) => ({
    index,
    answerIndex: 0,
    timeMs: 1200,
    helpUsed: false,
  }));

  it('rejects an axis submitted before its turn in the simulation order', async () => {
    repository.findUserSession.mockResolvedValue(fullSession(0));

    await expect(
      service.completeAxis('user-1', sessionId, AxisType.MEMORY, {
        axis: AxisType.MEMORY,
        sequences: [],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.completeFullSessionAxis).not.toHaveBeenCalled();
  });

  it('rejects an axis that was already played', async () => {
    repository.findUserSession.mockResolvedValue(fullSession(1));

    await expect(
      service.completeAxis('user-1', sessionId, AxisType.LOGIC, {
        axis: AxisType.LOGIC,
        items: logicAnswers,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.completeFullSessionAxis).not.toHaveBeenCalled();
  });

  it('rejects the current axis while its content is not fully played', async () => {
    repository.findUserSession.mockResolvedValue(fullSession(0));

    await expect(
      service.completeAxis('user-1', sessionId, AxisType.LOGIC, {
        axis: AxisType.LOGIC,
        items: logicAnswers.slice(0, 10),
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.completeFullSessionAxis).not.toHaveBeenCalled();
  });

  it('scores the current axis, advances the sequencing and hides the score while the simulation runs', async () => {
    repository.findUserSession
      .mockResolvedValueOnce(fullSession(0))
      .mockResolvedValueOnce(fullSession(1));

    const result = await service.completeAxis(
      'user-1',
      sessionId,
      AxisType.LOGIC,
      { axis: AxisType.LOGIC, items: logicAnswers },
    );

    expect(repository.completeFullSessionAxis).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId,
        axis: AxisType.LOGIC,
        nextAxisIndex: 1,
        rawResult: { axis: AxisType.LOGIC, items: logicAnswers },
        score: expect.objectContaining({
          normalizedScore: expect.any(Number),
        }),
      }),
    );
    expect(repository.completeSession).not.toHaveBeenCalled();
    expect(result.status).toBe('IN_PROGRESS');
    expect(result.currentAxisIndex).toBe(1);
    expect(result.axisResults[0].completedAt).not.toBeNull();
    expect(result.axisResults[0].normalizedScore).toBeNull();
    expect(result.axisResults[0].band).toBeNull();
    expect(result.axisResults[0].metrics).toBeNull();
  });

  it('completes the simulation once the fifth axis is played', async () => {
    const seedCourses = generateMotricityCourses('seed');
    const trajectories = seedCourses.map((course) => ({
      index: course.index,
      samples: walk(course, 45000),
    }));
    const allDone = buildSession({
      currentAxisIndex: 5,
      axisResults: fullAxes(5),
    });
    const completedSession = buildSession({
      status: 'COMPLETED',
      currentAxisIndex: 5,
      globalScore: 70,
      globalBand: 'ACCEPTABLE',
      completedAt: new Date('2026-06-13T10:30:00Z'),
      axisResults: fullAxes(5),
    });
    repository.findUserSession
      .mockResolvedValueOnce(fullSession(4))
      .mockResolvedValueOnce(allDone)
      .mockResolvedValueOnce(allDone)
      .mockResolvedValueOnce(completedSession);
    repository.findSectorConfig.mockResolvedValue(SECTOR_CONFIG);
    scoringService.evaluateSession.mockReturnValue({
      globalScore: 70,
      globalBand: ScoreBand.ACCEPTABLE,
      isAdmissible: true,
      isEliminated: false,
      recommendations: [],
    });
    repository.findStreakContext.mockResolvedValue({
      timezone: 'Europe/Paris',
      streak: null,
    });
    badgesService.evaluateAndUnlockWithin.mockResolvedValue([]);
    repository.completeSession.mockResolvedValue({
      session: completedSession,
      unlockedBadges: [],
    });

    const result = await service.completeAxis(
      'user-1',
      sessionId,
      AxisType.MOTOR_SKILLS,
      { axis: AxisType.MOTOR_SKILLS, courses: trajectories },
    );

    expect(repository.completeFullSessionAxis).toHaveBeenCalledWith(
      expect.objectContaining({
        axis: AxisType.MOTOR_SKILLS,
        nextAxisIndex: 5,
      }),
    );
    expect(repository.completeSession).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('COMPLETED');
    expect(result.axisResults[0].normalizedScore).toBe(70);
  });
});

describe('SessionsService.simulationSummary', () => {
  const sessionId = '11111111-1111-1111-1111-111111111111';
  const RAILWAY_WEIGHTS = [
    { axis: AxisType.LOGIC, coefficient: 1, isCritical: false },
    { axis: AxisType.MEMORY, coefficient: 1.2, isCritical: true },
    { axis: AxisType.VISUAL_DISCRIMINATION, coefficient: 1.2, isCritical: true },
    { axis: AxisType.REACTIVITY, coefficient: 1.4, isCritical: true },
    { axis: AxisType.MOTOR_SKILLS, coefficient: 1, isCritical: false },
  ];
  const AXIS_METRICS: Record<string, unknown> = {
    LOGIC: { axis: 'LOGIC', items: [] },
    MEMORY: { axis: 'MEMORY', sequences: [] },
    VISUAL_DISCRIMINATION: { axis: 'VISUAL_DISCRIMINATION', trials: [] },
    REACTIVITY: { axis: 'REACTIVITY', stimuli: [], waitPresses: [] },
    MOTOR_SKILLS: {
      axis: 'MOTOR_SKILLS',
      minorErrors: 5,
      majorErrors: 1,
      totalTimeMs: 120000,
      coursesCompleted: 3,
      controlModality: null,
      courses: [],
      timeline: [],
      events: [],
    },
  };
  const scoredAxes = (scores: Partial<Record<string, number>>) =>
    (
      [
        ['LOGIC', 'EXCELLENT'],
        ['MEMORY', 'FRAGILE'],
        ['VISUAL_DISCRIMINATION', 'ACCEPTABLE'],
        ['REACTIVITY', 'INSUFFICIENT'],
        ['MOTOR_SKILLS', 'EXCELLENT'],
      ] as const
    ).map(([axis, band], order) =>
      buildAxis({
        id: `axis-${order + 1}`,
        axis,
        order,
        normalizedScore: scores[axis] ?? 75,
        band,
        completedAt: new Date('2026-07-12T10:30:00Z'),
        metrics: AXIS_METRICS[axis] as Prisma.JsonValue,
      }),
    );
  const completedSimulation = (
    scores: Partial<Record<string, number>>,
    overrides: Partial<SessionWithRelations> = {},
  ) =>
    buildSession({
      status: 'COMPLETED',
      currentAxisIndex: 5,
      globalScore: 72.4,
      globalBand: 'ACCEPTABLE',
      isAdmissible: false,
      isEliminated: true,
      completedAt: new Date('2026-07-12T10:30:00Z'),
      axisResults: scoredAxes(scores),
      ...overrides,
    });

  it('rejects a session that is not a full simulation', async () => {
    repository.findUserSession.mockResolvedValue(
      buildSession({ mode: 'TARGETED', status: 'COMPLETED', axisResults: [buildAxis()] }),
    );

    await expect(
      service.simulationSummary('user-1', sessionId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects a simulation that is not completed', async () => {
    repository.findUserSession.mockResolvedValue(
      buildSession({ axisResults: [buildAxis()] }),
    );

    await expect(
      service.simulationSummary('user-1', sessionId),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('keeps the persisted unfavourable verdict and names the eliminatory axes', async () => {
    repository.findUserSession.mockResolvedValue(
      completedSimulation({
        LOGIC: 82,
        MEMORY: 61,
        VISUAL_DISCRIMINATION: 75,
        REACTIVITY: 48,
        MOTOR_SKILLS: 88,
      }),
    );
    repository.findSectorConfig.mockResolvedValue({
      ...SECTOR_CONFIG,
      weights: RAILWAY_WEIGHTS,
    });

    const summary = await service.simulationSummary('user-1', sessionId);

    expect(summary.globalScore).toBe(72.4);
    expect(summary.admissibilityGap).toBe(2.4);
    expect(summary.isEliminated).toBe(true);
    expect(summary.isAdmissible).toBe(false);
    expect(summary.eliminatoryAxes).toEqual([AxisType.REACTIVITY]);
    expect(summary.selection.weaknesses[0]).toMatchObject({
      axis: AxisType.REACTIVITY,
      thresholdKind: 'ELIMINATORY',
      thresholdValue: 55,
    });
    expect(summary.selection.weaknesses[1]).toMatchObject({
      axis: AxisType.MEMORY,
      thresholdKind: 'VIGILANCE',
      thresholdValue: 65,
    });
    expect(
      summary.appreciation.lead.map(({ text }) => text).join(''),
    ).toContain('seuil éliminatoire');
    expect(summary.appreciation.priority).toEqual({
      axis: AxisType.VISUAL_DISCRIMINATION,
      label: 'Fiabiliser la comparaison des séquences',
    });
    expect(summary.selection.recommendations[0]).toMatchObject({
      axis: AxisType.VISUAL_DISCRIMINATION,
    });
    expect(
      summary.selection.recommendations[0].findings[0].id,
    ).toBe('DISCRIMINATION_SLOW_ACCURATE');
    expect(summary.selection.strengths[0].sublabel).toBe(
      'Votre meilleur axe de la session',
    );
  });

  it('exposes the five axes with their own thresholds and observables', async () => {
    repository.findUserSession.mockResolvedValue(
      completedSimulation(
        {},
        { isAdmissible: true, isEliminated: false, globalScore: 74.8 },
      ),
    );
    repository.findSectorConfig.mockResolvedValue({
      ...SECTOR_CONFIG,
      weights: RAILWAY_WEIGHTS,
    });

    const summary = await service.simulationSummary('user-1', sessionId);

    expect(summary.axes).toHaveLength(5);
    expect(summary.axes.map(({ axis }) => axis)).toEqual([
      AxisType.LOGIC,
      AxisType.MEMORY,
      AxisType.VISUAL_DISCRIMINATION,
      AxisType.REACTIVITY,
      AxisType.MOTOR_SKILLS,
    ]);
    expect(summary.appreciation.lead.length).toBeGreaterThan(0);
    expect(
      summary.appreciation.lead.every(
        (segment) =>
          typeof segment.text === 'string' &&
          typeof segment.value === 'boolean',
      ),
    ).toBe(true);
    expect(
      summary.appreciation.lead.map(({ text }) => text).join(''),
    ).toContain('dépasse le seuil Ferroviaire de ');
    expect(
      summary.appreciation.lead.find(({ value }) => value)?.text,
    ).toBe('4,8');
    expect(summary.appreciation.detail.length).toBeGreaterThan(0);
    const logic = summary.axes[0];
    expect(logic.eliminatoryThreshold).toBeNull();
    expect(logic.vigilanceThreshold).toBe(65);
    expect(logic.observables[0]).toEqual({
      label: null,
      value: '0/40',
      caption: 'items',
    });
    const reactivity = summary.axes[3];
    expect(reactivity.eliminatoryThreshold).toBe(55);
    expect(reactivity.observables[0].label).toBe('TR moyen');
    const motor = summary.axes[4];
    expect(motor.observables[0]).toEqual({
      label: null,
      value: '3/3',
      caption: 'parcours',
    });
    expect(summary.admissibilityGap).toBe(4.8);
    expect(summary.eliminatoryAxes).toEqual([]);
  });
});

describe('SessionsService.results', () => {
  const sessionId = '11111111-1111-1111-1111-111111111111';

  it('refuses to expose the results while the simulation is in progress', async () => {
    repository.findUserSession.mockResolvedValue(
      buildSession({
        axisResults: [
          buildAxis({
            normalizedScore: 82,
            band: 'EXCELLENT',
            completedAt: new Date(),
          }),
        ],
      }),
    );

    await expect(service.results('user-1', sessionId)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('exposes the results of a completed session', async () => {
    repository.findUserSession.mockResolvedValue(
      buildSession({
        status: 'COMPLETED',
        globalScore: 75,
        globalBand: 'ACCEPTABLE',
        completedAt: new Date('2026-06-13T10:30:00Z'),
        axisResults: [
          buildAxis({
            normalizedScore: 82,
            band: 'EXCELLENT',
            completedAt: new Date('2026-06-13T10:30:00Z'),
          }),
        ],
      }),
    );

    const result = await service.results('user-1', sessionId);

    expect(result.status).toBe('COMPLETED');
    expect(result.globalScore).toBe(75);
    expect(result.axisResults[0].normalizedScore).toBe(82);
  });
});

describe('SessionsService.list', () => {
  it('rejects combined mode and axis filters', async () => {
    await expect(
      service.list('user-1', {
        mode: SessionMode.TARGETED,
        axis: AxisType.LOGIC,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.listHistory).not.toHaveBeenCalled();
  });

  it('returns a next cursor only when an extra row exists beyond the page', async () => {
    const rows = Array.from({ length: 11 }, (_, index) =>
      buildSession({
        id: `00000000-0000-0000-0000-0000000000${String(index).padStart(2, '0')}`,
        status: 'COMPLETED',
        completedAt: new Date('2026-07-01T10:00:00Z'),
        globalScore: 74.8,
        globalBand: 'ACCEPTABLE',
      }),
    );
    repository.listHistory.mockResolvedValue(rows);

    const page = await service.list('user-1', {});

    expect(repository.listHistory).toHaveBeenCalledWith('user-1', {
      mode: undefined,
      axis: undefined,
      cursor: undefined,
      take: 11,
    });
    expect(page.items).toHaveLength(10);
    expect(page.nextCursor).toBe(page.items[9].id);

    repository.listHistory.mockResolvedValue(rows.slice(0, 4));
    const lastPage = await service.list('user-1', {});
    expect(lastPage.items).toHaveLength(4);
    expect(lastPage.nextCursor).toBeNull();
  });

  it('maps an abandoned full session with the reached axis, no result and only the played time', async () => {
    repository.listHistory.mockResolvedValue([
      buildSession({
        status: 'ABANDONED',
        currentAxisIndex: 1,
        globalScore: null,
        globalBand: null,
        startedAt: new Date('2026-07-01T10:00:00Z'),
        abandonedAt: new Date('2026-07-02T10:09:00Z'),
        axisResults: [
          buildAxis({
            order: 0,
            completedAt: new Date(),
            normalizedScore: 80,
            band: 'EXCELLENT',
            metrics: {
              axis: 'LOGIC',
              items: [
                { index: 0, answerIndex: 1, timeMs: 80000, helpUsed: false, visited: true },
                { index: 1, answerIndex: 0, timeMs: 40000, helpUsed: false, visited: true },
              ],
            } as unknown as Prisma.JsonValue,
          }),
          buildAxis({ id: 'axis-2', axis: 'MEMORY', order: 1 }),
          buildAxis({ id: 'axis-3', axis: 'VISUAL_DISCRIMINATION', order: 2 }),
          buildAxis({ id: 'axis-4', axis: 'REACTIVITY', order: 3 }),
          buildAxis({ id: 'axis-5', axis: 'MOTOR_SKILLS', order: 4 }),
        ],
      }),
    ]);

    const page = await service.list('user-1', {});
    const item = page.items[0];

    expect(item.status).toBe('ABANDONED');
    expect(item.axis).toBeNull();
    expect(item.score).toBeNull();
    expect(item.band).toBeNull();
    expect(item.axisReached).toBe(2);
    expect(item.axisTotal).toBe(5);
    expect(item.finishedAt).toBe('2026-07-02T10:09:00.000Z');
    expect(item.durationSec).toBe(120);
  });

  it('maps a completed targeted session with its persisted score and active play duration', async () => {
    repository.listHistory.mockResolvedValue([
      buildSession({
        mode: 'TARGETED',
        status: 'COMPLETED',
        startedAt: new Date('2026-07-01T10:00:00Z'),
        completedAt: new Date('2026-07-01T12:04:00Z'),
        axisResults: [
          buildAxis({
            axis: 'REACTIVITY',
            normalizedScore: 76,
            band: 'ACCEPTABLE',
            completedAt: new Date('2026-07-01T12:04:00Z'),
            metrics: {
              axis: 'REACTIVITY',
              stimuli: [{ index: 0, commandPressed: 'LEFT', trMs: 400 }],
              waitPresses: [],
            } as unknown as Prisma.JsonValue,
          }),
        ],
      }),
    ]);

    const page = await service.list('user-1', {});
    const item = page.items[0];

    expect(item.mode).toBe('TARGETED');
    expect(item.axis).toBe(AxisType.REACTIVITY);
    expect(item.score).toBe(76);
    expect(item.band).toBe(ScoreBand.ACCEPTABLE);
    expect(item.axisReached).toBeNull();
    expect(item.axisTotal).toBe(1);
    expect(item.durationSec).toBe(180);
    expect(item.untimed).toBe(false);
  });

  it('flags a no-timer targeted session in the history', async () => {
    repository.listHistory.mockResolvedValue([
      buildSession({
        mode: 'TARGETED',
        status: 'COMPLETED',
        trainingOptions: [TrainingOptionId.NO_TIMER],
        completedAt: new Date('2026-07-01T10:04:00Z'),
        axisResults: [
          buildAxis({
            normalizedScore: 82,
            band: 'EXCELLENT',
            completedAt: new Date('2026-07-01T10:04:00Z'),
          }),
        ],
      }),
    ]);

    const page = await service.list('user-1', {});

    expect(page.items[0].untimed).toBe(true);
  });
});

describe('SessionsService.completeAxis (motricity)', () => {
  const sessionId = '11111111-1111-1111-1111-111111111111';
  const motricitySession = () =>
    buildSession({
      mode: 'TARGETED',
      energyCost: 1,
      seed: 'motricity-seed',
      axisResults: [buildAxis({ axis: 'MOTOR_SKILLS' })],
    });

  const courses = generateMotricityCourses('motricity-seed');
  const fullTrajectories = courses.map((course) => ({
    index: course.index,
    samples: walk(course, 45000),
  }));

  it('rejects a completion with only two courses played', async () => {
    repository.findUserSession.mockResolvedValue(motricitySession());

    await expect(
      service.completeAxis('user-1', sessionId, AxisType.MOTOR_SKILLS, {
        axis: AxisType.MOTOR_SKILLS,
        courses: fullTrajectories.slice(0, 2),
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.completeTargetedSession).not.toHaveBeenCalled();
  });

  it('rejects a completion when a course is neither crossed nor played to the timer', async () => {
    repository.findUserSession.mockResolvedValue(motricitySession());

    await expect(
      service.completeAxis('user-1', sessionId, AxisType.MOTOR_SKILLS, {
        axis: AxisType.MOTOR_SKILLS,
        courses: [
          fullTrajectories[0],
          fullTrajectories[1],
          { index: 2, samples: walk(courses[2], 30000, 50) },
        ],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('accepts a fully crossed session and persists the shared recomputed score', async () => {
    repository.findUserSession.mockResolvedValue(motricitySession());
    repository.completeTargetedSession.mockResolvedValue(
      buildSession({
        mode: 'TARGETED',
        status: 'COMPLETED',
        axisResults: [buildAxis({ axis: 'MOTOR_SKILLS' })],
      }),
    );

    await service.completeAxis('user-1', sessionId, AxisType.MOTOR_SKILLS, {
      axis: AxisType.MOTOR_SKILLS,
      courses: fullTrajectories,
    });

    const expected = scoreMotricitySession(fullTrajectories, 'motricity-seed');
    expect(repository.completeTargetedSession).toHaveBeenCalledWith(
      expect.objectContaining({
        axis: AxisType.MOTOR_SKILLS,
        score: expect.objectContaining({ normalizedScore: expected.score }),
        controlModality: null,
        rawResult: expect.objectContaining({
          axis: AxisType.MOTOR_SKILLS,
          courses: expected.courses.map(
            ({ index, minorErrors, majorErrors, progressionPct, tReelMs }) => ({
              index,
              minorErrors,
              majorErrors,
              progressionPct,
              tReelMs,
              avgLatencyMs: null,
              jitterMs: null,
            }),
          ),
        }),
      }),
    );
  });

  it('persists the control modality and the per-course latency observables', async () => {
    repository.findUserSession.mockResolvedValue(motricitySession());
    repository.completeTargetedSession.mockResolvedValue(
      buildSession({
        mode: 'TARGETED',
        status: 'COMPLETED',
        axisResults: [buildAxis({ axis: 'MOTOR_SKILLS' })],
      }),
    );

    await service.completeAxis('user-1', sessionId, AxisType.MOTOR_SKILLS, {
      axis: AxisType.MOTOR_SKILLS,
      controlModality: ControlModality.PHONE_GAMEPAD,
      courses: fullTrajectories.map((trajectory, index) => ({
        ...trajectory,
        avgLatencyMs: 20 + index,
        jitterMs: 3 + index,
      })),
    });

    expect(repository.completeTargetedSession).toHaveBeenCalledWith(
      expect.objectContaining({
        controlModality: ControlModality.PHONE_GAMEPAD,
        rawResult: expect.objectContaining({
          courses: expect.arrayContaining([
            expect.objectContaining({ index: 0, avgLatencyMs: 20, jitterMs: 3 }),
            expect.objectContaining({ index: 2, avgLatencyMs: 22, jitterMs: 5 }),
          ]),
        }),
      }),
    );
  });

  it('accepts a course stopped by the timer', async () => {
    repository.findUserSession.mockResolvedValue(motricitySession());
    repository.completeTargetedSession.mockResolvedValue(
      buildSession({
        mode: 'TARGETED',
        status: 'COMPLETED',
        axisResults: [buildAxis({ axis: 'MOTOR_SKILLS' })],
      }),
    );

    await service.completeAxis('user-1', sessionId, AxisType.MOTOR_SKILLS, {
      axis: AxisType.MOTOR_SKILLS,
      courses: [
        fullTrajectories[0],
        fullTrajectories[1],
        { index: 2, samples: walk(courses[2], 90000, 70) },
      ],
    });

    expect(repository.completeTargetedSession).toHaveBeenCalledTimes(1);
  });

  it('persists the derived timeline, events and modality inside the metrics', async () => {
    repository.findUserSession.mockResolvedValue(motricitySession());
    repository.completeTargetedSession.mockResolvedValue(
      buildSession({
        mode: 'TARGETED',
        status: 'COMPLETED',
        axisResults: [buildAxis({ axis: 'MOTOR_SKILLS' })],
      }),
    );

    await service.completeAxis('user-1', sessionId, AxisType.MOTOR_SKILLS, {
      axis: AxisType.MOTOR_SKILLS,
      controlModality: ControlModality.KEYBOARD,
      courses: fullTrajectories,
    });

    const persisted = repository.completeTargetedSession.mock.calls[0][0]
      .rawResult as MotorSkillsMetrics;
    expect(persisted.axis).toBe(AxisType.MOTOR_SKILLS);
    expect(persisted.coursesCompleted).toBe(3);
    expect(persisted.controlModality).toBe(ControlModality.KEYBOARD);
    expect(persisted.timeline).toHaveLength(3);
    expect(persisted.timeline[0].points.length).toBeGreaterThan(0);
    expect(Array.isArray(persisted.events)).toBe(true);
    expect(persisted.handIndependence).toBeUndefined();
    expect(persisted.totalTimeMs).toBe(
      persisted.courses.reduce((sum, course) => sum + course.tReelMs, 0),
    );
  });
});

describe('SessionsService.targetedResult (motricity)', () => {
  const sessionId = '11111111-1111-1111-1111-111111111111';
  const laterSessionId = '22222222-2222-2222-2222-222222222222';

  const motorMetrics = {
    axis: 'MOTOR_SKILLS',
    minorErrors: 5,
    majorErrors: 1,
    totalTimeMs: 124_000,
    coursesCompleted: 3,
    controlModality: 'PHONE_GAMEPAD',
    courses: [
      {
        index: 0,
        minorErrors: 5,
        majorErrors: 1,
        progressionPct: 100,
        tReelMs: 124_000,
        avgLatencyMs: 18,
        jitterMs: 3,
      },
    ],
    timeline: [
      { courseIndex: 0, points: [{ tMs: 0, deviationPct: 12 }] },
    ],
    events: [
      { courseIndex: 0, tMs: 4200, type: 'CONTACT', segment: 'DIAG' },
    ],
  };

  const motorSession = (metrics: unknown) =>
    buildSession({
      mode: 'TARGETED',
      status: 'COMPLETED',
      controlModality: 'PHONE_GAMEPAD',
      completedAt: new Date('2026-07-09T10:05:00Z'),
      axisResults: [
        buildAxis({
          axis: 'MOTOR_SKILLS',
          normalizedScore: 88,
          band: 'EXCELLENT',
          startedAt: new Date('2026-07-09T10:00:00Z'),
          completedAt: new Date('2026-07-09T10:05:00Z'),
          metrics: metrics as Prisma.JsonValue,
        }),
      ],
    });

  const motorHistoryRow = (
    rowSessionId: string,
    score: number,
    completedAt: Date,
  ) => ({
    ...buildAxis({
      id: `axis-${rowSessionId}`,
      sessionId: rowSessionId,
      axis: 'MOTOR_SKILLS',
      normalizedScore: score,
      completedAt,
    }),
    session: buildSession({ id: rowSessionId, completedAt }),
  });

  it('returns the persisted metrics with the record flag when the score beats the history', async () => {
    repository.findUserSession.mockResolvedValue(motorSession(motorMetrics));
    repository.findTargetedAxisHistory.mockResolvedValue([
      motorHistoryRow(laterSessionId, 80, new Date('2026-07-08T18:00:00Z')),
      motorHistoryRow(sessionId, 88, new Date('2026-07-09T10:05:00Z')),
    ]);

    const result = await service.targetedResult(
      'user-1',
      sessionId,
      AxisType.MOTOR_SKILLS,
    );

    expect(result.axis).toBe(AxisType.MOTOR_SKILLS);
    if (result.axis !== AxisType.MOTOR_SKILLS) {
      return;
    }
    expect(result.score).toBe(88);
    expect(result.bestScore).toBe(88);
    expect(result.isNewBest).toBe(true);
    expect(result.isEqualBest).toBe(false);
    expect(result.metrics.controlModality).toBe(ControlModality.PHONE_GAMEPAD);
    expect(result.metrics.timeline).toHaveLength(1);
    expect(result.metrics.events).toHaveLength(1);
  });

  it('reports an equaled record and no record accordingly', async () => {
    repository.findUserSession.mockResolvedValue(motorSession(motorMetrics));
    repository.findTargetedAxisHistory.mockResolvedValue([
      motorHistoryRow(laterSessionId, 88, new Date('2026-07-08T18:00:00Z')),
      motorHistoryRow(sessionId, 88, new Date('2026-07-09T10:05:00Z')),
    ]);
    const equaled = await service.targetedResult(
      'user-1',
      sessionId,
      AxisType.MOTOR_SKILLS,
    );
    expect(equaled.isNewBest).toBe(false);
    expect(equaled.isEqualBest).toBe(true);

    repository.findTargetedAxisHistory.mockResolvedValue([
      motorHistoryRow(laterSessionId, 95, new Date('2026-07-08T18:00:00Z')),
      motorHistoryRow(sessionId, 88, new Date('2026-07-09T10:05:00Z')),
    ]);
    const beaten = await service.targetedResult(
      'user-1',
      sessionId,
      AxisType.MOTOR_SKILLS,
    );
    expect(beaten.isNewBest).toBe(false);
    expect(beaten.isEqualBest).toBe(false);
    expect(beaten.bestScore).toBe(95);
  });

  it('maps a legacy row without timeline to metrics with an empty timeline', async () => {
    const legacyMetrics = {
      axis: 'MOTOR_SKILLS',
      courses: [
        {
          index: 0,
          minorErrors: 2,
          majorErrors: 0,
          progressionPct: 100,
          tReelMs: 60_000,
          avgLatencyMs: null,
          jitterMs: null,
        },
        {
          index: 1,
          minorErrors: 1,
          majorErrors: 1,
          progressionPct: 80,
          tReelMs: 90_000,
          avgLatencyMs: null,
          jitterMs: null,
        },
      ],
    };
    repository.findUserSession.mockResolvedValue(motorSession(legacyMetrics));
    repository.findTargetedAxisHistory.mockResolvedValue([
      motorHistoryRow(sessionId, 88, new Date('2026-07-09T10:05:00Z')),
    ]);

    const result = await service.targetedResult(
      'user-1',
      sessionId,
      AxisType.MOTOR_SKILLS,
    );

    if (result.axis !== AxisType.MOTOR_SKILLS) {
      return;
    }
    expect(result.metrics.timeline).toEqual([]);
    expect(result.metrics.events).toEqual([]);
    expect(result.metrics.minorErrors).toBe(3);
    expect(result.metrics.majorErrors).toBe(1);
    expect(result.metrics.totalTimeMs).toBe(150_000);
    expect(result.metrics.coursesCompleted).toBe(1);
    expect(result.metrics.controlModality).toBe(ControlModality.PHONE_GAMEPAD);
  });
});

describe('SessionsService.targetedResult', () => {
  const sessionId = '11111111-1111-1111-1111-111111111111';
  const laterSessionId = '22222222-2222-2222-2222-222222222222';

  const resultSession = () =>
    buildSession({
      mode: 'TARGETED',
      status: 'COMPLETED',
      completedAt: new Date('2026-07-04T10:05:00Z'),
      axisResults: [
        buildAxis({
          axis: 'LOGIC',
          normalizedScore: 76,
          band: 'ACCEPTABLE',
          startedAt: new Date('2026-07-04T10:00:00Z'),
          completedAt: new Date('2026-07-04T10:05:00Z'),
          metrics: { axis: 'LOGIC', items: [] } as unknown as Prisma.JsonValue,
        }),
      ],
    });

  const historyRow = (
    rowSessionId: string,
    score: number,
    completedAt: Date,
  ) => ({
    ...buildAxis({
      id: `axis-${rowSessionId}`,
      sessionId: rowSessionId,
      axis: 'LOGIC',
      normalizedScore: score,
      completedAt,
    }),
    session: buildSession({ id: rowSessionId, completedAt }),
  });

  it('references the best score reached before the session, ignoring later ones', async () => {
    repository.findUserSession.mockResolvedValue(resultSession());
    repository.findTargetedAxisHistory.mockResolvedValue([
      historyRow('00000000-0000-0000-0000-000000000000', 52, new Date('2026-07-01T09:00:00Z')),
      historyRow('00000000-0000-0000-0000-000000000001', 68, new Date('2026-07-02T09:00:00Z')),
      historyRow(sessionId, 76, new Date('2026-07-04T10:05:00Z')),
      historyRow(laterSessionId, 99, new Date('2026-07-08T18:00:00Z')),
    ]);

    const result = await service.targetedResult(
      'user-1',
      sessionId,
      AxisType.LOGIC,
    );

    expect(result.previousBestScore).toBe(68);
    expect(result.bestScore).toBe(76);
    expect(result.isNewBest).toBe(true);
    expect(result.isEqualBest).toBe(false);
  });

  it('tells the same story between the delta reference and the record mention', async () => {
    repository.findUserSession.mockResolvedValue(resultSession());
    repository.findTargetedAxisHistory.mockResolvedValue([
      historyRow('00000000-0000-0000-0000-000000000000', 99, new Date('2026-07-01T09:00:00Z')),
      historyRow('00000000-0000-0000-0000-000000000001', 21, new Date('2026-07-03T09:00:00Z')),
      historyRow(sessionId, 76, new Date('2026-07-04T10:05:00Z')),
    ]);

    const result = await service.targetedResult(
      'user-1',
      sessionId,
      AxisType.LOGIC,
    );

    expect(result.previousBestScore).toBe(99);
    expect(result.bestScore).toBe(99);
    expect(result.isNewBest).toBe(false);
    expect(result.isEqualBest).toBe(false);
  });

  it('serves the axis result of a completed full simulation without targeted history', async () => {
    repository.findUserSession.mockResolvedValue(
      buildSession({
        mode: 'FULL',
        status: 'COMPLETED',
        energyCost: 5,
        completedAt: new Date('2026-07-12T10:30:00Z'),
        axisResults: [
          buildAxis({
            axis: 'LOGIC',
            normalizedScore: 76,
            band: 'ACCEPTABLE',
            startedAt: new Date('2026-07-12T10:00:00Z'),
            completedAt: new Date('2026-07-12T10:10:00Z'),
            metrics: { axis: 'LOGIC', items: [] } as unknown as Prisma.JsonValue,
          }),
        ],
      }),
    );
    repository.findTargetedAxisHistory.mockResolvedValue([]);

    const result = await service.targetedResult(
      'user-1',
      sessionId,
      AxisType.LOGIC,
    );

    expect(result.score).toBe(76);
    expect(result.bestScore).toBe(76);
    expect(result.isNewBest).toBe(false);
    expect(result.previousBestScore).toBeNull();
  });

  it('serves an untimed session without any record, flagged for the front', async () => {
    const session = resultSession();
    repository.findUserSession.mockResolvedValue({
      ...session,
      trainingOptions: [TrainingOptionId.NO_TIMER],
    });
    repository.findTargetedAxisHistory.mockResolvedValue([
      historyRow('00000000-0000-0000-0000-000000000001', 68, new Date('2026-07-02T09:00:00Z')),
    ]);

    const result = await service.targetedResult(
      'user-1',
      sessionId,
      AxisType.LOGIC,
    );

    expect(result.untimed).toBe(true);
    expect(result.score).toBe(76);
    expect(result.bestScore).toBe(76);
    expect(result.isNewBest).toBe(false);
    expect(result.isEqualBest).toBe(false);
    expect(result.previousBestScore).toBeNull();
  });

  it('claims no record and no delta reference on the first session of the axis', async () => {
    repository.findUserSession.mockResolvedValue(resultSession());
    repository.findTargetedAxisHistory.mockResolvedValue([
      historyRow(sessionId, 76, new Date('2026-07-04T10:05:00Z')),
      historyRow(laterSessionId, 60, new Date('2026-07-08T18:00:00Z')),
    ]);

    const result = await service.targetedResult(
      'user-1',
      sessionId,
      AxisType.LOGIC,
    );

    expect(result.bestScore).toBe(76);
    expect(result.isNewBest).toBe(false);
    expect(result.isEqualBest).toBe(false);
    expect(result.previousBestScore).toBeNull();
  });

  it('exposes the per-family aggregates for a v2+ logic session', async () => {
    const session = resultSession();
    repository.findUserSession.mockResolvedValue({
      ...session,
      contentVersion: 3,
    });
    repository.findTargetedAxisHistory.mockResolvedValue([
      historyRow(sessionId, 76, new Date('2026-07-04T10:05:00Z')),
    ]);

    const result = await service.targetedResult(
      'user-1',
      sessionId,
      AxisType.LOGIC,
    );

    expect(result.axis).toBe(AxisType.LOGIC);
    const families =
      result.axis === AxisType.LOGIC ? (result.families ?? []) : [];
    expect(families).toHaveLength(4);
    expect(families.every((family) => family.total === 10)).toBe(true);
    expect(families.every((family) => family.marker === 'WEAKNESS')).toBe(true);
  });

  it('omits the per-family aggregates for a pre-v2 logic session', async () => {
    repository.findUserSession.mockResolvedValue(resultSession());
    repository.findTargetedAxisHistory.mockResolvedValue([
      historyRow(sessionId, 76, new Date('2026-07-04T10:05:00Z')),
    ]);

    const result = await service.targetedResult(
      'user-1',
      sessionId,
      AxisType.LOGIC,
    );

    expect(
      result.axis === AxisType.LOGIC ? result.families : undefined,
    ).toBeUndefined();
  });
});

describe('SessionsService.current', () => {
  it('returns null without a session in progress', async () => {
    repository.findCurrentSession.mockResolvedValue(null);
    expect(await service.current('user-1')).toBeNull();
  });

  it('maps the per-axis progression with one current axis', async () => {
    repository.findCurrentSession.mockResolvedValue(
      buildSession({
        axisResults: [
          buildAxis({ order: 0, completedAt: new Date() }),
          buildAxis({ id: 'axis-2', axis: 'MEMORY', order: 1, completedAt: new Date() }),
          buildAxis({ id: 'axis-3', axis: 'VISUAL_DISCRIMINATION', order: 2, skipped: true, completedAt: new Date() }),
          buildAxis({ id: 'axis-4', axis: 'REACTIVITY', order: 3 }),
          buildAxis({ id: 'axis-5', axis: 'MOTOR_SKILLS', order: 4 }),
        ],
      }),
    );

    const current = await service.current('user-1');

    expect(current?.mode).toBe('FULL');
    expect(current?.axes.map(({ status }) => status)).toEqual([
      'DONE',
      'DONE',
      'DONE',
      'CURRENT',
      'PENDING',
    ]);
  });

  it('resumes a suspended simulation at the start of the current axis', async () => {
    repository.findCurrentSession.mockResolvedValue(
      buildSession({
        status: 'SUSPENDED',
        currentAxisIndex: 2,
        axisResults: [
          buildAxis({ order: 0, completedAt: new Date() }),
          buildAxis({ id: 'axis-2', axis: 'MEMORY', order: 1, completedAt: new Date() }),
          buildAxis({ id: 'axis-3', axis: 'VISUAL_DISCRIMINATION', order: 2 }),
          buildAxis({ id: 'axis-4', axis: 'REACTIVITY', order: 3 }),
          buildAxis({ id: 'axis-5', axis: 'MOTOR_SKILLS', order: 4 }),
        ],
      }),
    );

    const current = await service.current('user-1');

    expect(current?.axes[2]).toEqual({
      axis: AxisType.VISUAL_DISCRIMINATION,
      status: 'CURRENT',
    });
  });
});

describe('SessionsService.complete', () => {
  const sessionId = '11111111-1111-1111-1111-111111111111';
  const unlockedBadge = {
    code: 'VOLUME_FIRST_SIMULATION',
    name: 'PremiÃ¨re simulation',
    description: 'Terminez votre premiÃ¨re simulation complÃ¨te.',
    category: BadgeCategory.VOLUME,
    icon: 'rocket',
  };

  it('rejects the completion of a simulation while an axis is missing', async () => {
    repository.findUserSession.mockResolvedValue(
      buildSession({
        status: 'IN_PROGRESS',
        axisResults: [
          buildAxis({ normalizedScore: 75, band: 'ACCEPTABLE', completedAt: new Date() }),
          buildAxis({ id: 'axis-2', axis: 'MEMORY', order: 1 }),
        ],
      }),
    );

    await expect(service.complete('user-1', sessionId)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(repository.completeSession).not.toHaveBeenCalled();
  });

  it('evaluates badges within the completion transaction and returns the freshly unlocked ones', async () => {
    const scoredAxis = buildAxis({
      normalizedScore: 75,
      band: 'ACCEPTABLE',
      completedAt: new Date('2026-06-13T10:10:00Z'),
    });
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
