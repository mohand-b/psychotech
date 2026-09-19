import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  AxisType,
  ControlModality,
  FULL_SESSION_AXIS_ORDER,
  LOGIC_CONTENT_VERSION_V2,
  RailwayPlayableAxis,
  Sector,
  SessionDto,
  SessionMode,
  SessionStatus,
  globalTimerDurationSec,
} from '@psychotech/shared';
import { Observable, of, throwError } from 'rxjs';
import { AuthFacade } from '../../auth/data-access/auth.facade';
import { EnergyFacade } from '../../energy/data-access/energy.facade';
import { SessionsApi } from './sessions.api';
import {
  SessionNoLongerActiveError,
  TrainingSessionFacade,
} from './training-session.facade';
import { TrainingSessionStore } from './training-session.store';

const SESSION_ID = 'session-1';
const INSTALLED_AT_MS = Date.UTC(2026, 6, 11, 10, 0, 0);
const AXIS_RECORDED_AT = '2026-07-11T10:05:00.000Z';
const SESSION_CLOSED_AT = '2026-07-11T10:06:00.000Z';
const MS_PER_SEC = 1000;
const LONG_BRIEFING_EXTRA_SEC = 30;
const PLAYED_SEC = 10;
const PLAYED_MS = PLAYED_SEC * MS_PER_SEC;
const OFFLINE_STATUS = 0;

const GLOBAL_TIMER_AXES: RailwayPlayableAxis[] = FULL_SESSION_AXIS_ORDER.filter(
  (axis) => globalTimerDurationSec(axis) !== null,
);

const INACTIVE_STATUSES: SessionStatus[] = [
  SessionStatus.COMPLETED,
  SessionStatus.ABANDONED,
  SessionStatus.SUSPENDED,
];

const CLOSED_ELSEWHERE_STATUSES: SessionStatus[] = [
  SessionStatus.ABANDONED,
  SessionStatus.SUSPENDED,
];

const NON_CONFLICT_STATUSES: number[] = [
  OFFLINE_STATUS,
  HttpStatusCode.BadRequest,
  HttpStatusCode.Forbidden,
  HttpStatusCode.PayloadTooLarge,
  HttpStatusCode.InternalServerError,
];

interface CompletionCase {
  axis: RailwayPlayableAxis;
  complete: (facade: TrainingSessionFacade) => Observable<SessionDto>;
}

const COMPLETION_CASES: CompletionCase[] = [
  {
    axis: AxisType.LOGIC,
    complete: (facade) => facade.completeTargeted([]),
  },
  {
    axis: AxisType.MEMORY,
    complete: (facade) => facade.completeTargetedMemory([]),
  },
  {
    axis: AxisType.VISUAL_DISCRIMINATION,
    complete: (facade) => facade.completeTargetedDiscrimination([], PLAYED_MS),
  },
  {
    axis: AxisType.MOTOR_SKILLS,
    complete: (facade) =>
      facade.completeTargetedMotricity([], ControlModality.KEYBOARD),
  },
  {
    axis: AxisType.REACTIVITY,
    complete: (facade) => facade.completeTargetedReactivity([], [], PLAYED_MS),
  },
];

interface CompletionOutcome {
  value: SessionDto | null;
  error: unknown;
}

function observe(source: Observable<SessionDto>): CompletionOutcome {
  const outcome: CompletionOutcome = { value: null, error: null };
  source.subscribe({
    next: (session) => (outcome.value = session),
    error: (error: unknown) => (outcome.error = error),
  });
  return outcome;
}

function buildSession(
  axes: readonly AxisType[],
  overrides: Partial<SessionDto> = {},
): SessionDto {
  return {
    id: SESSION_ID,
    mode: SessionMode.FULL,
    sector: Sector.RAILWAY,
    status: SessionStatus.IN_PROGRESS,
    seed: 'seed',
    contentVersion: LOGIC_CONTENT_VERSION_V2,
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
    axisResults: axes.map((axis, order) => ({
      axis,
      order,
      normalizedScore: null,
      band: null,
      skipped: false,
      metrics: null,
      startedAt: null,
      completedAt: null,
    })),
    recommendations: [],
    ...overrides,
  };
}

function targetedSessionOn(axis: AxisType): SessionDto {
  return buildSession([axis], { mode: SessionMode.TARGETED, energyCost: 1 });
}

function withRecordedAxes(
  session: SessionDto,
  axes: readonly AxisType[],
): SessionDto {
  return {
    ...session,
    axisResults: session.axisResults.map((result) =>
      axes.includes(result.axis)
        ? { ...result, completedAt: AXIS_RECORDED_AT }
        : result,
    ),
  };
}

function fullSessionOn(axis: RailwayPlayableAxis): SessionDto {
  const currentAxisIndex = FULL_SESSION_AXIS_ORDER.indexOf(axis);
  return withRecordedAxes(
    buildSession(FULL_SESSION_AXIS_ORDER, { currentAxisIndex }),
    FULL_SESSION_AXIS_ORDER.slice(0, currentAxisIndex),
  );
}

function inStatus(session: SessionDto, status: SessionStatus): SessionDto {
  return {
    ...session,
    status,
    completedAt: status === SessionStatus.COMPLETED ? SESSION_CLOSED_AT : null,
    abandonedAt: status === SessionStatus.ABANDONED ? SESSION_CLOSED_AT : null,
  };
}

function completedTargeted(running: SessionDto): SessionDto {
  return inStatus(
    withRecordedAxes(
      { ...running, currentAxisIndex: running.axisResults.length },
      running.axisResults.map((result) => result.axis),
    ),
    SessionStatus.COMPLETED,
  );
}

function conflict(): HttpErrorResponse {
  return new HttpErrorResponse({
    status: HttpStatusCode.Conflict,
    statusText: 'Conflict',
  });
}

function globalDurationSec(axis: AxisType): number {
  const durationSec = globalTimerDurationSec(axis);
  if (durationSec === null) {
    throw new Error(`${axis} has no global timer`);
  }
  return durationSec;
}

describe('TrainingSessionFacade', () => {
  let api: {
    start: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    completeTargeted: ReturnType<typeof vi.fn>;
    targetedResult: ReturnType<typeof vi.fn>;
  };
  let facade: TrainingSessionFacade;
  let store: InstanceType<typeof TrainingSessionStore>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(INSTALLED_AT_MS);
    api = {
      start: vi.fn(),
      get: vi.fn(),
      completeTargeted: vi.fn(),
      targetedResult: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: SessionsApi, useValue: api },
        {
          provide: EnergyFacade,
          useValue: { load: () => of(null), state: () => null },
        },
        {
          provide: AuthFacade,
          useValue: { currentUser: () => ({ currentSector: Sector.RAILWAY }) },
        },
      ],
    });
    facade = TestBed.inject(TrainingSessionFacade);
    store = TestBed.inject(TrainingSessionStore);
  });

  afterEach(() => {
    facade.clear();
    vi.useRealTimers();
  });

  function install(session: SessionDto): void {
    api.get.mockReturnValueOnce(of(session));
    facade.load(session.id).subscribe();
    api.get.mockClear();
  }

  describe('completion answered with a 409', () => {
    it('resolves with the fetched session and installs it when the submitted axis is already recorded', () => {
      const running = targetedSessionOn(AxisType.LOGIC);
      install(running);
      const recorded = completedTargeted(running);
      api.completeTargeted.mockReturnValueOnce(throwError(conflict));
      api.get.mockReturnValueOnce(of(recorded));

      const outcome = observe(facade.completeTargeted([]));

      expect(outcome.error).toBeNull();
      expect(outcome.value).toBe(recorded);
      expect(api.get).toHaveBeenCalledTimes(1);
      expect(api.get).toHaveBeenCalledWith(SESSION_ID);
      expect(facade.session()).toBe(recorded);
      expect(facade.axis()).toBeNull();
      expect(vi.getTimerCount()).toBe(0);
    });

    it('moves a full session to its next axis when the lost response had already recorded the submitted one', () => {
      const running = fullSessionOn(AxisType.VISUAL_DISCRIMINATION);
      install(running);
      const advanced = withRecordedAxes({ ...running, currentAxisIndex: 1 }, [
        AxisType.VISUAL_DISCRIMINATION,
      ]);
      api.completeTargeted.mockReturnValueOnce(throwError(conflict));
      api.get.mockReturnValueOnce(of(advanced));

      const outcome = observe(
        facade.completeTargetedDiscrimination([], PLAYED_MS),
      );

      expect(outcome.error).toBeNull();
      expect(outcome.value).toBe(advanced);
      expect(facade.session()).toBe(advanced);
      expect(facade.axis()).toBe(AxisType.LOGIC);
      expect(vi.getTimerCount()).toBe(1);
    });

    it('rethrows the original 409 and keeps the installed session when the running session has not recorded the axis', () => {
      const running = targetedSessionOn(AxisType.MEMORY);
      install(running);
      const original = conflict();
      api.completeTargeted.mockReturnValueOnce(throwError(() => original));
      api.get.mockReturnValueOnce(of({ ...running }));

      const outcome = observe(facade.completeTargetedMemory([]));

      expect(outcome.value).toBeNull();
      expect(outcome.error).toBe(original);
      expect(api.get).toHaveBeenCalledTimes(1);
      expect(facade.session()).toBe(running);
      expect(facade.axis()).toBe(AxisType.MEMORY);
      expect(vi.getTimerCount()).toBe(1);
    });

    it.each(CLOSED_ELSEWHERE_STATUSES)(
      'reports a %s session that never recorded the axis as closed elsewhere and installs it',
      (status) => {
        const running = targetedSessionOn(AxisType.MEMORY);
        install(running);
        const closed = inStatus({ ...running }, status);
        api.completeTargeted.mockReturnValueOnce(throwError(conflict));
        api.get.mockReturnValueOnce(of(closed));

        const outcome = observe(facade.completeTargetedMemory([]));

        expect(outcome.value).toBeNull();
        expect(outcome.error).toBeInstanceOf(SessionNoLongerActiveError);
        expect(facade.session()).toBe(closed);
      },
    );

    it('replays the same session and axis when the user retries after a rethrown 409', () => {
      const running = fullSessionOn(AxisType.MOTOR_SKILLS);
      install(running);
      api.completeTargeted.mockReturnValueOnce(throwError(conflict));
      api.get.mockReturnValueOnce(of({ ...running }));
      const complete = (): Observable<SessionDto> =>
        facade.completeTargetedMotricity([], ControlModality.KEYBOARD);
      observe(complete());
      const advanced = withRecordedAxes(
        { ...running, currentAxisIndex: running.currentAxisIndex + 1 },
        [AxisType.MOTOR_SKILLS],
      );
      api.completeTargeted.mockReturnValueOnce(of(advanced));

      const outcome = observe(complete());

      expect(outcome.value).toBe(advanced);
      expect(api.completeTargeted).toHaveBeenCalledTimes(2);
      expect(api.completeTargeted).toHaveBeenLastCalledWith(
        SESSION_ID,
        AxisType.MOTOR_SKILLS,
        expect.objectContaining({ axis: AxisType.MOTOR_SKILLS }),
      );
      expect(facade.axis()).toBe(AxisType.REACTIVITY);
    });

    it.each(COMPLETION_CASES)(
      'rejects a fetched session where every axis but $axis is recorded',
      ({ axis, complete }) => {
        const running = fullSessionOn(axis);
        install(running);
        const original = conflict();
        api.completeTargeted.mockReturnValueOnce(throwError(() => original));
        api.get.mockReturnValueOnce(
          of(
            withRecordedAxes(
              running,
              FULL_SESSION_AXIS_ORDER.filter((other) => other !== axis),
            ),
          ),
        );

        const outcome = observe(complete(facade));

        expect(api.completeTargeted).toHaveBeenCalledWith(
          SESSION_ID,
          axis,
          expect.objectContaining({ axis }),
        );
        expect(outcome.value).toBeNull();
        expect(outcome.error).toBe(original);
        expect(facade.session()).toBe(running);
      },
    );

    it.each(COMPLETION_CASES)(
      'accepts a fetched session where only $axis is recorded',
      ({ axis, complete }) => {
        const running = buildSession(FULL_SESSION_AXIS_ORDER, {
          currentAxisIndex: FULL_SESSION_AXIS_ORDER.indexOf(axis),
        });
        install(running);
        const recorded = withRecordedAxes(running, [axis]);
        api.completeTargeted.mockReturnValueOnce(throwError(conflict));
        api.get.mockReturnValueOnce(of(recorded));

        const outcome = observe(complete(facade));

        expect(outcome.error).toBeNull();
        expect(outcome.value).toBe(recorded);
        expect(facade.session()).toBe(recorded);
      },
    );

    it('surfaces a failed recovery lookup without touching the session, then recovers on the next retry', () => {
      const running = targetedSessionOn(AxisType.REACTIVITY);
      install(running);
      const complete = (): Observable<SessionDto> =>
        facade.completeTargetedReactivity([], [], PLAYED_MS);
      api.completeTargeted.mockReturnValueOnce(throwError(conflict));
      api.get.mockReturnValueOnce(
        throwError(() => new HttpErrorResponse({ status: OFFLINE_STATUS })),
      );

      const failed = observe(complete());

      expect(failed.value).toBeNull();
      expect(failed.error).toBeInstanceOf(HttpErrorResponse);
      expect(facade.session()).toBe(running);

      const recorded = completedTargeted(running);
      api.completeTargeted.mockReturnValueOnce(throwError(conflict));
      api.get.mockReturnValueOnce(of(recorded));

      const recovered = observe(complete());

      expect(recovered.error).toBeNull();
      expect(recovered.value).toBe(recorded);
      expect(facade.session()).toBe(recorded);
    });
  });

  describe('completion failing with another error', () => {
    it.each(NON_CONFLICT_STATUSES)(
      'rethrows a %i response without fetching the session',
      (status) => {
        const running = targetedSessionOn(AxisType.LOGIC);
        install(running);
        const failure = new HttpErrorResponse({ status });
        api.completeTargeted.mockReturnValueOnce(throwError(() => failure));

        const outcome = observe(facade.completeTargeted([]));

        expect(outcome.value).toBeNull();
        expect(outcome.error).toBe(failure);
        expect(api.get).not.toHaveBeenCalled();
        expect(facade.session()).toBe(running);
      },
    );

    it('rethrows a non-HTTP failure without fetching the session', () => {
      install(targetedSessionOn(AxisType.LOGIC));
      const failure = new Error('serialization failed');
      api.completeTargeted.mockReturnValueOnce(throwError(() => failure));

      const outcome = observe(facade.completeTargeted([]));

      expect(outcome.error).toBe(failure);
      expect(api.get).not.toHaveBeenCalled();
    });
  });

  describe('completion without an active session', () => {
    it.each(COMPLETION_CASES)(
      'fails the $axis completion without calling the api',
      ({ complete }) => {
        const outcome = observe(complete(facade));

        expect(outcome.value).toBeNull();
        expect(outcome.error).toBeInstanceOf(Error);
        expect(api.completeTargeted).not.toHaveBeenCalled();
        expect(api.get).not.toHaveBeenCalled();
      },
    );
  });

  describe('rebaseClock', () => {
    function expireDuringBriefing(durationSec: number): void {
      vi.advanceTimersByTime(
        (durationSec + LONG_BRIEFING_EXTRA_SEC) * MS_PER_SEC,
      );
      expect(facade.remainingSec()).toBe(0);
      expect(facade.isExpired()).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
    }

    function expectCountdownRunsAgain(durationSec: number): void {
      expect(facade.remainingSec()).toBe(durationSec);
      expect(facade.isExpired()).toBe(false);
      vi.advanceTimersByTime(PLAYED_MS);
      expect(store.nowMs()).toBe(Date.now());
      expect(facade.remainingSec()).toBe(durationSec - PLAYED_SEC);
    }

    it.each(GLOBAL_TIMER_AXES)(
      'restarts the ticker that stopped at zero during a long %s briefing',
      (axis) => {
        const durationSec = globalDurationSec(axis);
        install(targetedSessionOn(axis));
        expect(facade.remainingSec()).toBe(durationSec);
        expireDuringBriefing(durationSec);

        facade.rebaseClock();

        expectCountdownRunsAgain(durationSec);
      },
    );

    it('restarts the countdown of the first full-session axis after a long briefing and lets it expire again', () => {
      const started = buildSession(FULL_SESSION_AXIS_ORDER);
      const [firstAxis] = FULL_SESSION_AXIS_ORDER;
      const durationSec = globalDurationSec(firstAxis);
      api.start.mockReturnValueOnce(of(started));
      facade.startFull().subscribe();
      expect(facade.axis()).toBe(firstAxis);
      expireDuringBriefing(durationSec);

      facade.rebaseClock();

      expectCountdownRunsAgain(durationSec);
      vi.advanceTimersByTime(durationSec * MS_PER_SEC);
      expect(facade.remainingSec()).toBe(0);
      expect(facade.isExpired()).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
    });

    it.each(FULL_SESSION_AXIS_ORDER)(
      'keeps a single ticker when the clock of a running %s axis is rebased twice',
      (axis) => {
        install(targetedSessionOn(axis));
        expect(vi.getTimerCount()).toBe(1);

        facade.rebaseClock();
        facade.rebaseClock();

        expect(vi.getTimerCount()).toBe(1);
      },
    );

    it.each(INACTIVE_STATUSES)(
      'does not start a ticker when the session is %s',
      (status) => {
        install(
          inStatus(targetedSessionOn(AxisType.VISUAL_DISCRIMINATION), status),
        );

        facade.rebaseClock();

        expect(vi.getTimerCount()).toBe(0);
        expect(facade.remainingSec()).toBeNull();
      },
    );

    it('does not start a ticker without a session, before any load or after a clear', () => {
      facade.rebaseClock();
      expect(vi.getTimerCount()).toBe(0);

      install(targetedSessionOn(AxisType.LOGIC));
      facade.clear();
      facade.rebaseClock();

      expect(vi.getTimerCount()).toBe(0);
      expect(facade.remainingSec()).toBeNull();
    });

    it('does not restart the ticker once the expired axis has been submitted and the session completed', () => {
      const running = targetedSessionOn(AxisType.REACTIVITY);
      install(running);
      expireDuringBriefing(globalDurationSec(AxisType.REACTIVITY));
      api.completeTargeted.mockReturnValueOnce(of(completedTargeted(running)));
      facade.completeTargetedReactivity([], [], PLAYED_MS).subscribe();

      facade.rebaseClock();

      expect(vi.getTimerCount()).toBe(0);
      expect(facade.remainingSec()).toBeNull();
    });
  });
});
