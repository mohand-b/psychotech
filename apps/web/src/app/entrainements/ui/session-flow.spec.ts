import {
  AxisType,
  ScoreBand,
  Sector,
  SessionDto,
  SessionMode,
  SessionStatus,
} from '@psychotech/shared';
import { TUTORIAL_SESSION_ID } from '../data-access/tutorial-session.facade';
import {
  resolveRouteAfterAxis,
  resolveInactiveSessionRoute,
  findCurrentSimulationAxis,
} from './session-flow';

const FULL_ORDER = [
  AxisType.LOGIC,
  AxisType.MEMORY,
  AxisType.VISUAL_DISCRIMINATION,
  AxisType.REACTIVITY,
  AxisType.MOTOR_SKILLS,
];

const TRAINING_HUB_ROUTE = ['/entrainements'];

function buildSession(overrides: Partial<SessionDto> = {}): SessionDto {
  return {
    id: 'session-1',
    mode: SessionMode.FULL,
    sector: Sector.RAILWAY,
    status: SessionStatus.IN_PROGRESS,
    seed: 'seed',
    contentVersion: 1,
    logicFamily: null,
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

describe('findCurrentSimulationAxis', () => {
  it('returns the axis at the current index', () => {
    expect(
      findCurrentSimulationAxis(buildSession({ currentAxisIndex: 2 })),
    ).toBe(AxisType.VISUAL_DISCRIMINATION);
  });

  it('returns null once every axis is played', () => {
    expect(
      findCurrentSimulationAxis(buildSession({ currentAxisIndex: 5 })),
    ).toBeNull();
  });
});

describe('resolveRouteAfterAxis', () => {
  it('routes a targeted session to its axis result page', () => {
    expect(
      resolveRouteAfterAxis(
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
      resolveRouteAfterAxis(
        buildSession({ currentAxisIndex: 1 }),
        AxisType.LOGIC,
      ),
    ).toEqual(['/entrainements/examen-blanc/session', 'session-1']);
  });

  it('routes a completed simulation to the session results', () => {
    expect(
      resolveRouteAfterAxis(
        buildSession({
          status: SessionStatus.COMPLETED,
          currentAxisIndex: 5,
        }),
        AxisType.MOTOR_SKILLS,
      ),
    ).toEqual(['/sessions', 'session-1', 'resultat']);
  });
});

describe('resolveInactiveSessionRoute', () => {
  it('routes a completed targeted session to its axis result page', () => {
    expect(
      resolveInactiveSessionRoute(
        buildSession({
          mode: SessionMode.TARGETED,
          status: SessionStatus.COMPLETED,
          completedAt: '2026-07-11T10:05:00.000Z',
        }),
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

  it('routes a completed full session to the exam results whatever axis page was reloaded', () => {
    const completed = buildSession({
      status: SessionStatus.COMPLETED,
      currentAxisIndex: 5,
      completedAt: '2026-07-11T10:45:00.000Z',
    });
    for (const axis of FULL_ORDER) {
      expect(resolveInactiveSessionRoute(completed, axis)).toEqual([
        '/sessions',
        'session-1',
        'resultat',
      ]);
    }
  });

  it('routes a completed tutorial session to the tutorial end page', () => {
    expect(
      resolveInactiveSessionRoute(
        buildSession({
          id: TUTORIAL_SESSION_ID,
          mode: SessionMode.TARGETED,
          status: SessionStatus.COMPLETED,
          energyCost: 0,
          completedAt: '2026-07-11T10:03:00.000Z',
        }),
        AxisType.REACTIVITY,
      ),
    ).toEqual(['/entrainements/tutoriel', 'reactivite', 'fin']);
  });

  it.each([
    { status: SessionStatus.ABANDONED, mode: SessionMode.FULL },
    { status: SessionStatus.ABANDONED, mode: SessionMode.TARGETED },
    { status: SessionStatus.SUSPENDED, mode: SessionMode.FULL },
    { status: SessionStatus.SUSPENDED, mode: SessionMode.TARGETED },
  ])(
    'routes a $status $mode session back to the training hub',
    ({ status, mode }) => {
      expect(
        resolveInactiveSessionRoute(
          buildSession({ status, mode, currentAxisIndex: 2 }),
          AxisType.VISUAL_DISCRIMINATION,
        ),
      ).toEqual(TRAINING_HUB_ROUTE);
    },
  );

  it('routes an abandoned full session with every axis played back to the training hub', () => {
    expect(
      resolveInactiveSessionRoute(
        buildSession({
          status: SessionStatus.ABANDONED,
          currentAxisIndex: 5,
          abandonedAt: '2026-07-11T10:30:00.000Z',
        }),
        AxisType.MOTOR_SKILLS,
      ),
    ).toEqual(TRAINING_HUB_ROUTE);
  });

  it('routes an abandoned tutorial session back to the training hub', () => {
    expect(
      resolveInactiveSessionRoute(
        buildSession({
          id: TUTORIAL_SESSION_ID,
          mode: SessionMode.TARGETED,
          status: SessionStatus.ABANDONED,
        }),
        AxisType.LOGIC,
      ),
    ).toEqual(TRAINING_HUB_ROUTE);
  });
});
