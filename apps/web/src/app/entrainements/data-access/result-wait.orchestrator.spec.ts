import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import {
  AxisType,
  FULL_SESSION_AXIS_ORDER,
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
import {
  SessionNoLongerActiveError,
  TrainingSessionFacade,
} from '../../sessions/data-access/training-session.facade';
import {
  RESULT_WAIT_COMPLETION_TIMEOUT_MS,
  RESULT_WAIT_DIRECT_REVEAL_MS,
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

function buildFullSession(currentAxisIndex: number): SessionDto {
  return buildSession({
    mode: SessionMode.FULL,
    energyCost: 5,
    currentAxisIndex,
    axisResults: FULL_SESSION_AXIS_ORDER.map((axis, order) =>
      axisResult(axis, order),
    ),
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
  clear: ReturnType<typeof vi.fn>;
}

function setup(active: SessionDto | null): Setup {
  const loadTargetedResult = vi.fn(() => of(TARGETED_RESULT));
  const loadSummary = vi.fn(() => of(SUMMARY));
  const clear = vi.fn();
  TestBed.configureTestingModule({
    providers: [
      ResultWaitOrchestrator,
      provideRouter([]),
      {
        provide: TrainingSessionFacade,
        useValue: { session: () => active, loadTargetedResult, clear },
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
    clear,
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
    });

    expect(orchestrator.active()).toBe(true);
    vi.advanceTimersByTime(RESULT_WAIT_MIN_DISPLAY_MS - 1);
    expect(navigate).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(navigate).toHaveBeenCalledWith(
      [
        '/entrainements/cible',
        'logique',
        'session',
        SESSION_ID,
        'resultat',
      ],
      { replaceUrl: true },
    );
  });

  it('navigates as soon as the data arrives once the minimum duration has elapsed', () => {
    const { orchestrator, navigate, loadTargetedResult } =
      setup(buildSession());
    const prefetch = new Subject<TargetedAxisResultDto>();
    loadTargetedResult.mockReturnValue(prefetch.asObservable());
    orchestrator.submit({
      axis: AxisType.LOGIC,
      complete: () => of(buildSession({ status: SessionStatus.COMPLETED })),
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
    const { orchestrator, navigate, loadTargetedResult } =
      setup(buildSession());
    loadTargetedResult.mockImplementationOnce(() =>
      throwError(() => new Error('down')),
    );
    const complete = vi.fn(() =>
      of(buildSession({ status: SessionStatus.COMPLETED })),
    );
    orchestrator.submit({
      axis: AxisType.LOGIC,
      complete,
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
    });

    expect(orchestrator.active()).toBe(false);
    expect(loadTargetedResult).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(
      [
        '/entrainements/tutoriel',
        'logique',
        'fin',
      ],
      { replaceUrl: true },
    );
  });

  it('keeps the direct transition for intermediate simulation axes', () => {
    const { orchestrator, navigate, loadSummary } = setup(buildFullSession(0));
    const afterAxis = buildFullSession(1);
    orchestrator.submit({
      axis: AxisType.VISUAL_DISCRIMINATION,
      complete: () => of(afterAxis),
    });

    expect(orchestrator.active()).toBe(false);
    expect(loadSummary).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(
      [
        '/entrainements/examen-blanc/session',
        SESSION_ID,
      ],
      { replaceUrl: true },
    );
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
      axis: AxisType.REACTIVITY,
      complete: () => of(completed),
    });

    expect(orchestrator.active()).toBe(true);
    expect(orchestrator.simulation()).toBe(true);
    expect(loadSummary).toHaveBeenCalledWith(SESSION_ID);
    expect(loadTargetedResult).not.toHaveBeenCalled();

    vi.advanceTimersByTime(RESULT_WAIT_MIN_DISPLAY_MS);
    expect(navigate).toHaveBeenCalledWith(
      [
        '/sessions',
        SESSION_ID,
        'resultat',
      ],
      { replaceUrl: true },
    );
  });

  it('tells a failed completion from a failed prefetch', () => {
    const { orchestrator, loadTargetedResult } = setup(buildSession());
    const complete = vi
      .fn(() => of(buildSession({ status: SessionStatus.COMPLETED })))
      .mockImplementationOnce(() => throwError(() => new Error('down')));
    loadTargetedResult.mockImplementationOnce(() =>
      throwError(() => new Error('down')),
    );
    orchestrator.submit({ axis: AxisType.LOGIC, complete });

    expect(orchestrator.phase()).toBe('failed-complete');
    expect(orchestrator.failure()).toBe('completion');

    orchestrator.retry();
    expect(orchestrator.phase()).toBe('failed-prefetch');
    expect(orchestrator.failure()).toBe('prefetch');
  });

  it('shows the retry screen when an intermediate simulation axis fails and replays the same request', () => {
    const { orchestrator, navigate, loadSummary } = setup(buildFullSession(3));
    const complete = vi
      .fn(() => of(buildFullSession(4)))
      .mockImplementationOnce(() => throwError(() => new Error('down')));
    orchestrator.submit({ axis: AxisType.MOTOR_SKILLS, complete });

    expect(orchestrator.active()).toBe(true);
    expect(orchestrator.failed()).toBe(true);
    expect(orchestrator.failure()).toBe('completion');
    expect(orchestrator.simulation()).toBe(false);
    expect(navigate).not.toHaveBeenCalled();

    orchestrator.retry();
    expect(complete).toHaveBeenCalledTimes(2);
    expect(loadSummary).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(
      [
        '/entrainements/examen-blanc/session',
        SESSION_ID,
      ],
      { replaceUrl: true },
    );
  });

  it('keeps failing visibly on every intermediate retry until the completion goes through', () => {
    const { orchestrator, navigate } = setup(buildFullSession(1));
    const complete = vi
      .fn(() => of(buildFullSession(2)))
      .mockImplementationOnce(() => throwError(() => new Error('down')))
      .mockImplementationOnce(() => throwError(() => new Error('down')));
    orchestrator.submit({ axis: AxisType.LOGIC, complete });

    orchestrator.retry();
    expect(orchestrator.failed()).toBe(true);
    expect(navigate).not.toHaveBeenCalled();

    orchestrator.retry();
    expect(complete).toHaveBeenCalledTimes(3);
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('reveals the wait screen when an intermediate completion is slow, then navigates without prefetch', () => {
    const { orchestrator, navigate, loadSummary } = setup(buildFullSession(3));
    const completion = new Subject<SessionDto>();
    orchestrator.submit({
      axis: AxisType.MOTOR_SKILLS,
      complete: () => completion.asObservable(),
    });

    vi.advanceTimersByTime(RESULT_WAIT_DIRECT_REVEAL_MS - 1);
    expect(orchestrator.active()).toBe(false);

    vi.advanceTimersByTime(1);
    expect(orchestrator.active()).toBe(true);
    expect(orchestrator.failed()).toBe(false);

    completion.next(buildFullSession(4));
    completion.complete();
    expect(loadSummary).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('ignores a second submission while the first one is in flight', () => {
    const { orchestrator } = setup(buildFullSession(2));
    const complete = vi.fn(() => new Subject<SessionDto>().asObservable());
    orchestrator.submit({ axis: AxisType.MEMORY, complete });
    orchestrator.submit({ axis: AxisType.MEMORY, complete });

    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('ignores a second submission after a failure so only the retry can resend', () => {
    const { orchestrator } = setup(buildFullSession(2));
    const complete = vi.fn(() => throwError(() => new Error('down')));
    orchestrator.submit({ axis: AxisType.MEMORY, complete });
    orchestrator.submit({ axis: AxisType.MEMORY, complete });

    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('never navigates once the screen has been left', () => {
    const { orchestrator, navigate } = setup(buildFullSession(0));
    const completion = new Subject<SessionDto>();
    orchestrator.submit({
      axis: AxisType.VISUAL_DISCRIMINATION,
      complete: () => completion.asObservable(),
    });

    TestBed.resetTestingModule();
    completion.next(buildFullSession(1));

    expect(navigate).not.toHaveBeenCalled();
  });

  it('reports a session closed elsewhere as a failure that cannot be retried', () => {
    const { orchestrator } = setup(buildSession());
    const complete = vi.fn(() =>
      throwError(() => new SessionNoLongerActiveError()),
    );
    orchestrator.submit({ axis: AxisType.LOGIC, complete });

    expect(orchestrator.failure()).toBe('session-closed');
    expect(orchestrator.unsent()).toBe(false);

    orchestrator.retry();
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('turns a stalled completion into a retryable failure', () => {
    const { orchestrator } = setup(buildFullSession(3));
    orchestrator.submit({
      axis: AxisType.MOTOR_SKILLS,
      complete: () => new Subject<SessionDto>().asObservable(),
    });

    vi.advanceTimersByTime(RESULT_WAIT_COMPLETION_TIMEOUT_MS - 1);
    expect(orchestrator.failed()).toBe(false);

    vi.advanceTimersByTime(1);
    expect(orchestrator.failure()).toBe('completion');
  });

  it('holds the answers as unsent until the completion goes through', () => {
    const { orchestrator } = setup(buildFullSession(1));
    const complete = vi
      .fn(() => of(buildFullSession(2)))
      .mockImplementationOnce(() => throwError(() => new Error('down')));
    expect(orchestrator.unsent()).toBe(false);

    orchestrator.submit({ axis: AxisType.LOGIC, complete });
    expect(orchestrator.unsent()).toBe(true);

    orchestrator.retry();
    expect(orchestrator.unsent()).toBe(false);
  });

  it('ignores a second retry while the first one is in flight', () => {
    const { orchestrator } = setup(buildFullSession(1));
    const complete = vi
      .fn(() => new Subject<SessionDto>().asObservable())
      .mockImplementationOnce(() => throwError(() => new Error('down')));
    orchestrator.submit({ axis: AxisType.LOGIC, complete });

    orchestrator.retry();
    orchestrator.retry();

    expect(complete).toHaveBeenCalledTimes(2);
  });

  it('restarts the reassurance delay on every retry', () => {
    const { orchestrator } = setup(buildFullSession(1));
    const complete = vi
      .fn(() => new Subject<SessionDto>().asObservable())
      .mockImplementationOnce(() => throwError(() => new Error('down')));
    orchestrator.submit({ axis: AxisType.LOGIC, complete });
    vi.advanceTimersByTime(RESULT_WAIT_SLOW_HINT_MS);

    orchestrator.retry();
    expect(orchestrator.slow()).toBe(false);

    vi.advanceTimersByTime(RESULT_WAIT_SLOW_HINT_MS);
    expect(orchestrator.slow()).toBe(true);
  });

  it('drops the stale session and leaves to the dashboard on quit, releasing the leave guard', () => {
    const { orchestrator, navigate, clear } = setup(buildFullSession(1));
    orchestrator.submit({
      axis: AxisType.LOGIC,
      complete: () => throwError(() => new Error('down')),
    });

    orchestrator.quit();

    expect(clear).toHaveBeenCalledTimes(1);
    expect(orchestrator.unsent()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('falls back to the direct path and still fails visibly without an active session', () => {
    const { orchestrator } = setup(null);
    orchestrator.submit({
      axis: AxisType.LOGIC,
      complete: () => throwError(() => new Error('down')),
    });

    expect(orchestrator.active()).toBe(true);
    expect(orchestrator.failure()).toBe('completion');
  });
});
