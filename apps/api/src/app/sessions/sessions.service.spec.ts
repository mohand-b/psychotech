import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { BadgeCategory, Prisma, SessionAxis } from '@prisma/client';
import {
  AxisType,
  ControlModality,
  MotorSkillsMetrics,
  ScoreBand,
  Sector,
  SessionMode,
  TrainingOptionId,
  generateMotricityCourses,
  scoreMotricitySession,
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

const repository = {
  createSession: vi.fn(),
  findUserSession: vi.fn(),
  findSectorConfig: vi.fn(),
  findStreakContext: vi.fn(),
  updateAxisResult: vi.fn(),
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
      answerIndex: 0,
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

  it('rejects a completion while the axis is still being played', async () => {
    repository.findUserSession.mockResolvedValue(targetedSession());

    await expect(
      service.completeTargeted('user-1', sessionId, AxisType.LOGIC, {
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

    await service.completeTargeted('user-1', sessionId, AxisType.LOGIC, {
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

  it('rejects a completion before the five sequences are played', async () => {
    repository.findUserSession.mockResolvedValue(memorySession());

    await expect(
      service.completeTargeted('user-1', sessionId, AxisType.MEMORY, {
        axis: AxisType.MEMORY,
        sequences: sequenceAnswers.slice(0, 4),
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.completeTargetedSession).not.toHaveBeenCalled();
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

  it('rejects a completion while trials remain unanswered and the timer is not over', async () => {
    repository.findUserSession.mockResolvedValue(discriminationSession());

    await expect(
      service.completeTargeted('user-1', sessionId, AxisType.VISUAL_DISCRIMINATION, {
        axis: AxisType.VISUAL_DISCRIMINATION,
        trials: trialAnswers.slice(0, 12),
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.completeTargetedSession).not.toHaveBeenCalled();
  });
});

describe('SessionsService.completeTargeted (reactivity)', () => {
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
      service.completeTargeted('user-1', sessionId, AxisType.REACTIVITY, {
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

    await service.completeTargeted('user-1', sessionId, AxisType.REACTIVITY, {
      axis: AxisType.REACTIVITY,
      stimuli,
      waitPresses: [],
      playedMs: 180000,
    });

    expect(repository.completeTargetedSession).toHaveBeenCalledTimes(1);
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
  });
});

describe('SessionsService.completeTargeted (motricity)', () => {
  const sessionId = '11111111-1111-1111-1111-111111111111';
  const motricitySession = () =>
    buildSession({
      mode: 'TARGETED',
      energyCost: 1,
      seed: 'motricity-seed',
      axisResults: [buildAxis({ axis: 'MOTOR_SKILLS' })],
    });

  const walk = (
    course: ReturnType<typeof generateMotricityCourses>[number],
    durationMs: number,
    untilPct = 100,
  ) => {
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
  };

  const courses = generateMotricityCourses('motricity-seed');
  const fullTrajectories = courses.map((course) => ({
    index: course.index,
    samples: walk(course, 45000),
  }));

  it('rejects a completion with only two courses played', async () => {
    repository.findUserSession.mockResolvedValue(motricitySession());

    await expect(
      service.completeTargeted('user-1', sessionId, AxisType.MOTOR_SKILLS, {
        axis: AxisType.MOTOR_SKILLS,
        courses: fullTrajectories.slice(0, 2),
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.completeTargetedSession).not.toHaveBeenCalled();
  });

  it('rejects a completion when a course is neither crossed nor played to the timer', async () => {
    repository.findUserSession.mockResolvedValue(motricitySession());

    await expect(
      service.completeTargeted('user-1', sessionId, AxisType.MOTOR_SKILLS, {
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

    await service.completeTargeted('user-1', sessionId, AxisType.MOTOR_SKILLS, {
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

    await service.completeTargeted('user-1', sessionId, AxisType.MOTOR_SKILLS, {
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

    await service.completeTargeted('user-1', sessionId, AxisType.MOTOR_SKILLS, {
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

    await service.completeTargeted('user-1', sessionId, AxisType.MOTOR_SKILLS, {
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

  it('evaluates the axis record against the whole history at consultation time', async () => {
    repository.findUserSession.mockResolvedValue(resultSession());
    repository.findTargetedAxisHistory.mockResolvedValue([
      historyRow(sessionId, 76, new Date('2026-07-04T10:05:00Z')),
      historyRow(laterSessionId, 80, new Date('2026-07-08T18:00:00Z')),
    ]);

    const result = await service.targetedResult(
      'user-1',
      sessionId,
      AxisType.LOGIC,
    );

    expect(result.bestScore).toBe(80);
    expect(result.isNewBest).toBe(false);
    expect(result.isEqualBest).toBe(false);
    expect(result.previousScore).toBe(80);
  });

  it('still reports the record when no other session has reached this score', async () => {
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
    expect(result.isNewBest).toBe(true);
    expect(result.isEqualBest).toBe(false);
    expect(result.previousScore).toBe(60);
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
