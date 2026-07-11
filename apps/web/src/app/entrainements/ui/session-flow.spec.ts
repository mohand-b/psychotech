import {
  AxisType,
  ScoreBand,
  Sector,
  SessionDto,
  SessionMode,
  SessionStatus,
} from '@psychotech/shared';
import { afterAxisSubmitRoute, simulationCurrentAxis } from './session-flow';

const FULL_ORDER = [
  AxisType.LOGIC,
  AxisType.MEMORY,
  AxisType.VISUAL_DISCRIMINATION,
  AxisType.REACTIVITY,
  AxisType.MOTOR_SKILLS,
];

function buildSession(overrides: Partial<SessionDto> = {}): SessionDto {
  return {
    id: 'session-1',
    mode: SessionMode.FULL,
    sector: Sector.RAILWAY,
    status: SessionStatus.IN_PROGRESS,
    seed: 'seed',
    options: { enabledOptions: [] },
    energyCost: 5,
    currentAxisIndex: 0,
    globalScore: null,
    globalBand: null,
    isAdmissible: null,
    isEliminated: null,
    sectorThreshold: 70,
    startedAt: '2026-07-11T10:00:00.000Z',
    completedAt: null,
    abandonedAt: null,
    controlModality: null,
    axisResults: FULL_ORDER.map((axis, order) => ({
      axis,
      order,
      normalizedScore: null,
      band: null as ScoreBand | null,
      skipped: false,
      metrics: null,
      startedAt: null,
      completedAt: null,
    })),
    recommendations: [],
    ...overrides,
  };
}

describe('simulationCurrentAxis', () => {
  it('returns the axis at the current index', () => {
    expect(simulationCurrentAxis(buildSession({ currentAxisIndex: 2 }))).toBe(
      AxisType.VISUAL_DISCRIMINATION,
    );
  });

  it('returns null once every axis is played', () => {
    expect(
      simulationCurrentAxis(buildSession({ currentAxisIndex: 5 })),
    ).toBeNull();
  });
});

describe('afterAxisSubmitRoute', () => {
  it('routes a targeted session to its axis result page', () => {
    expect(
      afterAxisSubmitRoute(
        buildSession({ mode: SessionMode.TARGETED }),
        AxisType.MEMORY,
      ),
    ).toEqual([
      '/entrainements/cible',
      'memoire',
      'session',
      'session-1',
      'resultat',
    ]);
  });

  it('routes a running simulation to the next axis briefing', () => {
    expect(
      afterAxisSubmitRoute(
        buildSession({ currentAxisIndex: 1 }),
        AxisType.LOGIC,
      ),
    ).toEqual(['/entrainements/simulation/session', 'session-1']);
  });

  it('routes a completed simulation to the session results', () => {
    expect(
      afterAxisSubmitRoute(
        buildSession({
          status: SessionStatus.COMPLETED,
          currentAxisIndex: 5,
        }),
        AxisType.MOTOR_SKILLS,
      ),
    ).toEqual(['/sessions', 'session-1', 'resultat']);
  });
});
