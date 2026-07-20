import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import {
  AxisType,
  LOGIC_CONTENT_VERSION_V2,
  Sector,
  SessionDto,
  SessionMode,
  SessionStatus,
  SimulationSummaryDto,
  TargetedAxisResultDto,
} from '@psychotech/shared';
import { Subject, of, throwError } from 'rxjs';
import { SimulationSummaryFacade } from '../../sessions/data-access/simulation-summary.facade';
import { TrainingSessionFacade } from '../../sessions/data-access/training-session.facade';
import {
  RESULT_WAIT_MIN_DISPLAY_MS,
  RESULT_WAIT_SLOW_HINT_MS,
  ResultWaitOrchestrator,
} from './result-wait.orchestrator';
import { TUTORIAL_SESSION_ID } from './tutorial-session.facade';

const SESSION_ID = 'session-wait';

function axisResult(axis: AxisType, order: number) {
  return {
    axis,
    order,
    normalizedScore: null,
    band: null,
    skipped: false,
    metrics: null,
    startedAt: '2026-07-20T10:00:00.000Z',
    completedAt: null,
  };
}

function buildSession(overrides: Partial<SessionDto> = {}): SessionDto {
  return {
    id: SESSION_ID,
    mode: SessionMode.TARGETED,
    sector: Sector.RAILWAY,
    status: SessionStatus.IN_PROGRESS,
    seed: 'seed-wait',
    contentVersion: LOGIC_CONTENT_VERSION_V2,
    logicFamily: null,
    options: { enabledOptions: [] },
    energyCost: 1,
    currentAxisIndex: 0,
    globalScore: null,
    globalBand: null,
    isAdmissible: null,
    isEliminated: null,
    sectorThreshold: 70,
    startedAt: '2026-07-20T10:00:00.000Z',
    completedAt: null,
    abandonedAt: null,
    controlModality: null,
    axisResults: [axisResult(AxisType.LOGIC, 0)],
    recommendations: [],
    ...overrides,
  };
}

const FULL_AXES = [
  AxisType.LOGIC,
  AxisType.MEMORY,
  AxisType.VISUAL_DISCRIMINATION,
  AxisType.REACTIVITY,
  AxisType.MOTOR_SKILLS,
];

function buildFullSession(currentAxisIndex: number): SessionDto {
  return buildSession({
    mode: SessionMode.FULL,
    energyCost: 5,
    currentAxisIndex,
    axisResults: FULL_AXES.map((axis, order) => axisResult(axis, order)),
  });
}

const TARGETED_RESULT = {
  sessionId: SESSION_ID,
  axis: AxisType.LOGIC,
} as TargetedAxisResultDto;

const SUMMARY = { sessionId: SESSION_ID } as SimulationSummaryDto;

interface Setup {
  orchestrator: ResultWaitOrchestrator;
  navigate: ReturnType<typeof vi.spyOn>;
  loadTargetedResult: ReturnType<typeof vi.fn>;
  loadSummary: ReturnType<typeof vi.fn>;
}

function setup(active: SessionDto): Setup {
  const loadTargetedResult = vi.fn(() => of(TARGETED_RESULT));
  const loadSummary = vi.fn(() => of(SUMMARY));
  TestBed.configureTestingModule({
    providers: [
      ResultWaitOrchestrator,
      provideRouter([]),
      {
        provide: TrainingSessionFacade,
        useValue: { session: () => active, loadTargetedResult },
      },
      { provide: SimulationSummaryFacade, useValue: { loadSummary } },
    ],
  });
  const navigate = vi
    .spyOn(TestBed.inject(Router), 'navigate')
    .mockResolvedValue(true);
  return {
    orchestrator: TestBed.inject(ResultWaitOrchestrator),
    navigate,
    loadTargetedResult,
    loadSummary,
  };
}

describe('ResultWaitOrchestrator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('never navigates before the minimum display duration even when the back answers instantly', () => {
    const { orchestrator, navigate } = setup(buildSession());
    const completed = buildSession({ status: SessionStatus.COMPLETED });
    orchestrator.submit({
      axis: AxisType.LOGIC,
      complete: () => of(completed),
      onSilentFailure: vi.fn(),
    });

    expect(orchestrator.active()).toBe(true);
    vi.advanceTimersByTime(RESULT_WAIT_MIN_DISPLAY_MS - 1);
    expect(navigate).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(navigate).toHaveBeenCalledWith([
      '/entrainements/cible',
      'logique',
      'session',
      SESSION_ID,
      'resultat',
    ]);
  });

  it('navigates as soon as the data arrives once the minimum duration has elapsed', () => {
    const { orchestrator, navigate, loadTargetedResult } = setup(
      buildSession(),
    );
    const prefetch = new Subject<TargetedAxisResultDto>();
    loadTargetedResult.mockReturnValue(prefetch.asObservable());
    orchestrator.submit({
      axis: AxisType.LOGIC,
      complete: () => of(buildSession({ status: SessionStatus.COMPLETED })),
      onSilentFailure: vi.fn(),
    });

    vi.advanceTimersByTime(RESULT_WAIT_MIN_DISPLAY_MS + 500);
    expect(navigate).not.toHaveBeenCalled();

    prefetch.next(TARGETED_RESULT);
    prefetch.complete();
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('shows the reassurance line after the slow threshold', () => {
    const { orchestrator, loadTargetedResult } = setup(buildSession());
    loadTargetedResult.mockReturnValue(
      new Subject<TargetedAxisResultDto>().asObservable(),
    );
    orchestrator.submit({
      axis: AxisType.LOGIC,
      complete: () => of(buildSession({ status: SessionStatus.COMPLETED })),
      onSilentFailure: vi.fn(),
    });

    vi.advanceTimersByTime(RESULT_WAIT_SLOW_HINT_MS - 1);
    expect(orchestrator.slow()).toBe(false);

    vi.advanceTimersByTime(1);
    expect(orchestrator.slow()).toBe(true);
  });

  it('replays only the completion after a completion failure', () => {
    const { orchestrator, navigate } = setup(buildSession());
    const completed = buildSession({ status: SessionStatus.COMPLETED });
    const complete = vi
      .fn(() => of(completed))
      .mockImplementationOnce(() => throwError(() => new Error('down')));
    orchestrator.submit({
      axis: AxisType.LOGIC,
      complete,
      onSilentFailure: vi.fn(),
    });

    expect(orchestrator.failed()).toBe(true);
    expect(orchestrator.phase()).toBe('failed-complete');
    expect(complete).toHaveBeenCalledTimes(1);

    orchestrator.retry();
    expect(complete).toHaveBeenCalledTimes(2);
    expect(orchestrator.failed()).toBe(false);

    vi.advanceTimersByTime(RESULT_WAIT_MIN_DISPLAY_MS);
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('never replays the completion when retrying a prefetch failure', () => {
    const { orchestrator, navigate, loadTargetedResult } = setup(
      buildSession(),
    );
    loadTargetedResult.mockImplementationOnce(() =>
      throwError(() => new Error('down')),
    );
    const complete = vi.fn(() =>
      of(buildSession({ status: SessionStatus.COMPLETED })),
    );
    orchestrator.submit({
      axis: AxisType.LOGIC,
      complete,
      onSilentFailure: vi.fn(),
    });

    expect(orchestrator.phase()).toBe('failed-prefetch');
    expect(complete).toHaveBeenCalledTimes(1);

    orchestrator.retry();
    expect(complete).toHaveBeenCalledTimes(1);
    expect(loadTargetedResult).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(RESULT_WAIT_MIN_DISPLAY_MS);
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('shows no wait screen for a tutorial and navigates immediately', () => {
    const tutorial = buildSession({ id: TUTORIAL_SESSION_ID, energyCost: 0 });
    const { orchestrator, navigate, loadTargetedResult } = setup(tutorial);
    const completed = buildSession({
      id: TUTORIAL_SESSION_ID,
      status: SessionStatus.COMPLETED,
    });
    orchestrator.submit({
      axis: AxisType.LOGIC,
      complete: () => of(completed),
      onSilentFailure: vi.fn(),
    });

    expect(orchestrator.active()).toBe(false);
    expect(loadTargetedResult).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith([
      '/entrainements/tutoriel',
      'logique',
      'fin',
    ]);
  });

  it('keeps the direct transition for intermediate simulation axes', () => {
    const { orchestrator, navigate, loadSummary } = setup(buildFullSession(0));
    const afterAxis = buildFullSession(1);
    orchestrator.submit({
      axis: AxisType.LOGIC,
      complete: () => of(afterAxis),
      onSilentFailure: vi.fn(),
    });

    expect(orchestrator.active()).toBe(false);
    expect(loadSummary).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith([
      '/entrainements/simulation/session',
      SESSION_ID,
    ]);
  });

  it('waits on the fifth simulation axis and prefetches the summary', () => {
    const { orchestrator, navigate, loadSummary, loadTargetedResult } = setup(
      buildFullSession(4),
    );
    const completed = {
      ...buildFullSession(4),
      status: SessionStatus.COMPLETED,
    };
    orchestrator.submit({
      axis: AxisType.MOTOR_SKILLS,
      complete: () => of(completed),
      onSilentFailure: vi.fn(),
    });

    expect(orchestrator.active()).toBe(true);
    expect(orchestrator.simulation()).toBe(true);
    expect(loadSummary).toHaveBeenCalledWith(SESSION_ID);
    expect(loadTargetedResult).not.toHaveBeenCalled();

    vi.advanceTimersByTime(RESULT_WAIT_MIN_DISPLAY_MS);
    expect(navigate).toHaveBeenCalledWith(['/sessions', SESSION_ID, 'resultat']);
  });

  it('reports the silent failure when a bypassed completion fails', () => {
    const { orchestrator, navigate } = setup(buildFullSession(1));
    const onSilentFailure = vi.fn();
    orchestrator.submit({
      axis: AxisType.MEMORY,
      complete: () => throwError(() => new Error('down')),
      onSilentFailure,
    });

    expect(orchestrator.active()).toBe(false);
    expect(onSilentFailure).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
  });
});
