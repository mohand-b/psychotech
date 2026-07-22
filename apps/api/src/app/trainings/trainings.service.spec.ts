import { BadRequestException } from '@nestjs/common';
import { AxisType, ScoreBand, Sector } from '@psychotech/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TrainingsRepository } from './trainings.repository';
import { TrainingsService } from './trainings.service';

const RAILWAY_CONFIG = {
  vigilanceThreshold: 65,
  weights: [
    { axis: AxisType.LOGIC, coefficient: 1.0, order: 0 },
    { axis: AxisType.MEMORY, coefficient: 1.2, order: 1 },
    { axis: AxisType.VISUAL_DISCRIMINATION, coefficient: 1.2, order: 2 },
    { axis: AxisType.REACTIVITY, coefficient: 1.4, order: 3 },
    { axis: AxisType.MOTOR_SKILLS, coefficient: 1.0, order: 4 },
  ],
};

function buildCompletedSession(overrides: Record<string, unknown> = {}) {
  return {
    id: 'session-1',
    globalScore: 74.8,
    globalBand: 'ACCEPTABLE',
    isAdmissible: true,
    isEliminated: false,
    sectorThreshold: 70,
    completedAt: new Date('2026-07-11T19:42:00.000Z'),
    ...overrides,
  };
}

function buildBest(axis: AxisType, bestScore: number) {
  return { axis, bestScore };
}

describe('TrainingsService', () => {
  let repository: {
    findSectorConfig: ReturnType<typeof vi.fn>;
    findLastCompletedFullSession: ReturnType<typeof vi.fn>;
    findAxisBests: ReturnType<typeof vi.fn>;
    findPlayedAxes: ReturnType<typeof vi.fn>;
  };
  let service: TrainingsService;

  beforeEach(() => {
    repository = {
      findSectorConfig: vi.fn().mockResolvedValue(RAILWAY_CONFIG),
      findLastCompletedFullSession: vi.fn().mockResolvedValue(null),
      findAxisBests: vi.fn().mockResolvedValue([]),
      findPlayedAxes: vi.fn().mockResolvedValue([]),
    };
    service = new TrainingsService(
      repository as unknown as TrainingsRepository,
    );
  });

  it('rejects an unavailable sector', async () => {
    repository.findSectorConfig.mockResolvedValue(null);

    await expect(
      service.getOverview('user-1', Sector.AVIATION),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns a null last simulation when none has been completed', async () => {
    const overview = await service.getOverview('user-1', Sector.RAILWAY);

    expect(overview.lastSimulation).toBeNull();
    expect(overview.vigilanceThreshold).toBe(65);
    expect(overview.axes).toHaveLength(5);
  });

  it('exposes the last completed simulation with its verdict data', async () => {
    repository.findLastCompletedFullSession.mockResolvedValue(
      buildCompletedSession(),
    );

    const overview = await service.getOverview('user-1', Sector.RAILWAY);

    expect(overview.lastSimulation).toEqual({
      sessionId: 'session-1',
      globalScore: 74.8,
      globalBand: ScoreBand.ACCEPTABLE,
      isAdmissible: true,
      isEliminated: false,
      sectorThreshold: 70,
      completedAt: '2026-07-11T19:42:00.000Z',
    });
  });

  it('marks a never-played axis without best score and without the needs-work flag', async () => {
    repository.findAxisBests.mockResolvedValue([
      buildBest(AxisType.LOGIC, 82),
    ]);
    repository.findPlayedAxes.mockResolvedValue([AxisType.LOGIC]);

    const overview = await service.getOverview('user-1', Sector.RAILWAY);
    const memory = overview.axes.find(
      ({ axis }) => axis === AxisType.MEMORY,
    );

    expect(memory).toEqual({
      axis: AxisType.MEMORY,
      bestScore: null,
      neverPlayed: true,
      isCriticalAxis: false,
      needsWork: false,
    });
  });

  it('keeps a family-filtered axis visible as played even without a best score', async () => {
    repository.findAxisBests.mockResolvedValue([]);
    repository.findPlayedAxes.mockResolvedValue([AxisType.LOGIC]);

    const overview = await service.getOverview('user-1', Sector.RAILWAY);
    const logic = overview.axes.find(({ axis }) => axis === AxisType.LOGIC);

    expect(logic).toMatchObject({
      bestScore: null,
      neverPlayed: false,
    });
  });

  it('flags the critical axis, the needs-work axis and an axis combining both', async () => {
    repository.findAxisBests.mockResolvedValue([
      buildBest(AxisType.REACTIVITY, 70),
      buildBest(AxisType.MEMORY, 61),
      buildBest(AxisType.LOGIC, 82),
    ]);

    const overview = await service.getOverview('user-1', Sector.RAILWAY);
    const byAxis = new Map(overview.axes.map((entry) => [entry.axis, entry]));

    expect(byAxis.get(AxisType.REACTIVITY)).toMatchObject({
      isCriticalAxis: true,
      needsWork: false,
    });
    expect(byAxis.get(AxisType.MEMORY)).toMatchObject({
      isCriticalAxis: false,
      needsWork: true,
    });
    expect(byAxis.get(AxisType.LOGIC)).toMatchObject({
      isCriticalAxis: false,
      needsWork: false,
    });

    repository.findAxisBests.mockResolvedValue([
      buildBest(AxisType.REACTIVITY, 58),
    ]);
    const second = await service.getOverview('user-1', Sector.RAILWAY);
    expect(
      second.axes.find(({ axis }) => axis === AxisType.REACTIVITY),
    ).toMatchObject({ isCriticalAxis: true, needsWork: true });
  });

  it('keeps the sector axis order from the configuration', async () => {
    const overview = await service.getOverview('user-1', Sector.RAILWAY);

    expect(overview.axes.map(({ axis }) => axis)).toEqual([
      AxisType.LOGIC,
      AxisType.MEMORY,
      AxisType.VISUAL_DISCRIMINATION,
      AxisType.REACTIVITY,
      AxisType.MOTOR_SKILLS,
    ]);
  });
});
