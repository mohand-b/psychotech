import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma, SessionAxis } from '@prisma/client';
import {
  AxisType,
  DifficultyLevel,
  EnergyLedgerReason,
  ScoreBand,
  Sector,
  SessionMode,
} from '@psychotech/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EnergyService } from '../energy/energy.service';
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
    difficulty: 'NORMAL',
    status: 'IN_PROGRESS',
    seed: 'seed',
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
  suspendSession: vi.fn(),
  abandonSession: vi.fn(),
  listSessions: vi.fn(),
};

const energyService = { spendWithin: vi.fn() };
const scoringService = { scoreAxis: vi.fn(), evaluateSession: vi.fn() };

const service = new SessionsService(
  repository as unknown as SessionsRepository,
  energyService as unknown as EnergyService,
  scoringService as unknown as ScoringService,
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
  it('spends energy inside the session creation transaction', async () => {
    repository.findSectorConfig.mockResolvedValue(SECTOR_CONFIG);
    const transactionClient = {} as Prisma.TransactionClient;
    repository.createSession.mockImplementation(
      async (
        _params: unknown,
        spend: (client: Prisma.TransactionClient, sessionId: string) => Promise<void>,
      ) => {
        await spend(transactionClient, 'created-session');
        return buildSession();
      },
    );
    energyService.spendWithin.mockResolvedValue(undefined);

    await service.start('user-1', {
      mode: SessionMode.FULL,
      sector: Sector.RAILWAY,
      difficulty: DifficultyLevel.NORMAL,
    });

    expect(energyService.spendWithin).toHaveBeenCalledWith(
      transactionClient,
      'user-1',
      5,
      EnergyLedgerReason.SESSION_SPENT,
      'created-session',
    );
  });

  it('propagates a spend failure so the transaction rolls back', async () => {
    repository.findSectorConfig.mockResolvedValue(SECTOR_CONFIG);
    repository.createSession.mockImplementation(
      async (
        _params: unknown,
        spend: (client: Prisma.TransactionClient, sessionId: string) => Promise<void>,
      ) => {
        await spend({} as Prisma.TransactionClient, 'created-session');
        return buildSession();
      },
    );
    energyService.spendWithin.mockRejectedValue(new Error('insufficient'));

    await expect(
      service.start('user-1', {
        mode: SessionMode.TARGETED,
        sector: Sector.RAILWAY,
        difficulty: DifficultyLevel.NORMAL,
        axis: AxisType.LOGIC,
      }),
    ).rejects.toThrow('insufficient');
  });

  it('rejects an inactive sector before creating anything', async () => {
    repository.findSectorConfig.mockResolvedValue({ ...SECTOR_CONFIG, isActive: false });

    await expect(
      service.start('user-1', {
        mode: SessionMode.FULL,
        sector: Sector.AVIATION,
        difficulty: DifficultyLevel.NORMAL,
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
        precision: 82,
        itemsAnswered: 40,
        itemsSkipped: 0,
        avgTimePerItemMs: 1100,
        accuracyByType: { numeric: 85, letters: 80, symbols: 80, mixed: 82 },
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
