import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import {
  AXIS_TRAINING,
  AxisTimerModel,
  AxisTraining,
  AxisType,
  ControlModality,
  DiscriminationTrial,
  DiscriminationTrialAnswerDto,
  LOGIC_CONTENT_VERSION_V2,
  LogicItemAnswerDto,
  LogicItem,
  MemorySequence,
  MemorySequenceAnswerDto,
  MotricityCourse,
  MotricityCourseTrajectoryDto,
  RailwayPlayableAxis,
  ReactivityStimulus,
  ReactivityStimulusAnswerDto,
  ReactivityWaitPressDto,
  Sector,
  SessionDto,
  SessionMode,
  SessionStatus,
  StartSessionDto,
  TargetedAxisResultDto,
  TargetedSessionOptionsDto,
  TrainingOptionId,
  MotricityGenerationOptions,
  generateDiscriminationSession,
  generateLegacyLogicSession,
  generateLogicSession,
  generateMemorySession,
  generateMotricityCourses,
  generateReactivitySession,
  adaptLegacyLogicItems,
  resolveLogicRuleHint,
} from '@psychotech/shared';
import { Observable, catchError, of, switchMap, tap, throwError } from 'rxjs';
import { AuthFacade } from '../../auth/data-access/auth.facade';
import { TimerSeverity } from '../../shared/ui/focused-header/focused-header';
import { formatDuration } from '../../shared/ui/format-duration';
import { computeCountdown } from './session-countdown';
import { SessionsApi } from './sessions.api';
import { TrainingSessionStore } from './training-session.store';

interface GlobalTimerThresholds {
  warningSec: number;
  dangerSec: number;
}

const DEFAULT_GLOBAL_THRESHOLDS: GlobalTimerThresholds = {
  warningSec: 120,
  dangerSec: 60,
};

const GLOBAL_TIMER_THRESHOLDS: Partial<
  Record<AxisType, GlobalTimerThresholds>
> = {
  [AxisType.LOGIC]: DEFAULT_GLOBAL_THRESHOLDS,
  [AxisType.VISUAL_DISCRIMINATION]: { warningSec: 60, dangerSec: 30 },
  [AxisType.REACTIVITY]: { warningSec: 60, dangerSec: 30 },
};

export class SessionNoLongerActiveError extends Error {}

function isAxisAlreadyRecorded(session: SessionDto, axis: AxisType): boolean {
  return session.axisResults.some(
    (result) => result.axis === axis && result.completedAt !== null,
  );
}

@Injectable({ providedIn: 'root' })
export class TrainingSessionFacade {
  private readonly api = inject(SessionsApi);
  private readonly store = inject(TrainingSessionStore);
  private readonly authFacade = inject(AuthFacade);
  private tickerId: number | null = null;

  readonly session: Signal<SessionDto | null> = this.store.session;

  readonly axis: Signal<AxisType | null> = computed(() => {
    const session = this.store.session();
    if (!session) {
      return null;
    }
    const current = session.axisResults[session.currentAxisIndex];
    return current?.axis ?? null;
  });

  readonly enabledTrainingOptions: Signal<TrainingOptionId[]> = computed(
    () => this.store.session()?.options.enabledOptions ?? [],
  );

  readonly helpEnabled: Signal<boolean> = computed(() =>
    this.enabledTrainingOptions().includes(TrainingOptionId.LOGIC_HELP),
  );

  readonly timerDisabled: Signal<boolean> = computed(() =>
    this.enabledTrainingOptions().includes(TrainingOptionId.NO_TIMER),
  );

  protected findTrainingConfig(axis: AxisType): AxisTraining | undefined {
    return AXIS_TRAINING[axis as RailwayPlayableAxis];
  }

  getTrainingConfig<Axis extends RailwayPlayableAxis>(
    axis: Axis,
  ): Extract<AxisTraining, { axis: Axis }> {
    return this.findTrainingConfig(axis) as Extract<
      AxisTraining,
      { axis: Axis }
    >;
  }

  protected getMotricityGenerationOptions(): MotricityGenerationOptions {
    return {};
  }

  protected generateLogicItems(session: SessionDto): LogicItem[] {
    return generateLogicSession(
      session.seed,
      session.logicFamily,
      session.contentVersion,
    );
  }

  readonly logicItems: Signal<LogicItem[]> = computed(() => {
    const session = this.store.session();
    if (!session || this.axis() !== AxisType.LOGIC) {
      return [];
    }
    return session.contentVersion >= LOGIC_CONTENT_VERSION_V2
      ? this.generateLogicItems(session)
      : adaptLegacyLogicItems(
          generateLegacyLogicSession(
            session.seed,
            this.getTrainingConfig(AxisType.LOGIC),
          ),
          resolveLogicRuleHint,
        );
  });

  readonly memorySequences: Signal<MemorySequence[]> = computed(() => {
    const session = this.store.session();
    return session && this.axis() === AxisType.MEMORY
      ? generateMemorySession(
          session.seed,
          this.getTrainingConfig(AxisType.MEMORY),
        )
      : [];
  });

  readonly discriminationTrials: Signal<DiscriminationTrial[]> = computed(
    () => {
      const session = this.store.session();
      return session && this.axis() === AxisType.VISUAL_DISCRIMINATION
        ? generateDiscriminationSession(
            session.seed,
            this.getTrainingConfig(AxisType.VISUAL_DISCRIMINATION),
          )
        : [];
    },
  );

  readonly reactivityStimuli: Signal<ReactivityStimulus[]> = computed(() => {
    const session = this.store.session();
    return session && this.axis() === AxisType.REACTIVITY
      ? generateReactivitySession(
          session.seed,
          this.getTrainingConfig(AxisType.REACTIVITY),
        )
      : [];
  });

  readonly motricityCourses: Signal<MotricityCourse[]> = computed(() => {
    const session = this.store.session();
    return session && this.axis() === AxisType.MOTOR_SKILLS
      ? generateMotricityCourses(session.seed, {
          contentVersion: session.contentVersion,
          ...this.getMotricityGenerationOptions(),
        })
      : [];
  });

  readonly durationSec: Signal<number | null> = computed(() => {
    const axis = this.axis();
    if (!axis || this.timerDisabled()) {
      return null;
    }
    const training = this.findTrainingConfig(axis);
    return training && training.timer.model === AxisTimerModel.GLOBAL
      ? training.timer.durationSec
      : null;
  });

  private readonly effectiveCountdown = signal<{
    remainingSec: number;
    fraction: number;
  } | null>(null);

  setEffectiveCountdown(
    value: { remainingSec: number; fraction: number } | null,
  ): void {
    this.effectiveCountdown.set(value);
  }

  rebaseClock(): void {
    this.store.rebaseAnchor();
    if (this.store.session()?.status === SessionStatus.IN_PROGRESS) {
      this.startTicker();
    }
  }

  measureElapsedPlayMs(): number {
    return Math.max(0, Date.now() - this.store.anchorMs());
  }

  readonly remainingSec: Signal<number | null> = computed(() => {
    const override = this.effectiveCountdown();
    if (override) {
      return override.remainingSec;
    }
    const session = this.store.session();
    const axis = this.axis();
    if (
      !session ||
      !axis ||
      session.status !== SessionStatus.IN_PROGRESS ||
      this.timerDisabled()
    ) {
      return null;
    }
    const training = this.findTrainingConfig(axis);
    if (!training || training.timer.model !== AxisTimerModel.GLOBAL) {
      return null;
    }
    return computeCountdown(
      this.store.anchorMs(),
      this.store.nowMs(),
      training.timer.durationSec,
    ).remainingSec;
  });

  readonly remainingFraction: Signal<number | null> = computed(() => {
    const override = this.effectiveCountdown();
    if (override) {
      return override.fraction;
    }
    const session = this.store.session();
    const duration = this.durationSec();
    if (
      !session ||
      duration === null ||
      session.status !== SessionStatus.IN_PROGRESS
    ) {
      return null;
    }
    return computeCountdown(this.store.anchorMs(), this.store.nowMs(), duration)
      .fraction;
  });

  private readonly perExerciseRemaining = signal<number | null>(null);
  private readonly perExerciseFraction = signal<number | null>(null);

  readonly perExerciseBarFraction: Signal<number | null> =
    this.perExerciseFraction.asReadonly();

  private readonly hasPerExerciseTimer: Signal<boolean> = computed(() => {
    const session = this.store.session();
    const axis = this.axis();
    if (!session || !axis || session.status !== SessionStatus.IN_PROGRESS) {
      return false;
    }
    return (
      this.findTrainingConfig(axis)?.timer.model === AxisTimerModel.PER_EXERCISE
    );
  });

  setPerExerciseCountdown(
    remainingSec: number | null,
    fraction: number | null = null,
  ): void {
    this.perExerciseRemaining.set(remainingSec);
    this.perExerciseFraction.set(fraction);
  }

  readonly remainingLabel: Signal<string | null> = computed(() => {
    const remaining = this.remainingSec();
    if (remaining !== null) {
      return formatDuration(remaining);
    }
    if (!this.hasPerExerciseTimer()) {
      return null;
    }
    const local = this.perExerciseRemaining();
    return local === null ? '-' : formatDuration(local);
  });

  readonly countdownSeverity: Signal<TimerSeverity> = computed(() => {
    const remaining = this.remainingSec();
    if (remaining !== null) {
      const axis = this.axis();
      const thresholds =
        (axis && GLOBAL_TIMER_THRESHOLDS[axis]) ?? DEFAULT_GLOBAL_THRESHOLDS;
      if (remaining <= thresholds.dangerSec) {
        return 'danger';
      }
      return remaining <= thresholds.warningSec ? 'warning' : 'normal';
    }
    if (!this.hasPerExerciseTimer()) {
      return 'normal';
    }
    const local = this.perExerciseRemaining();
    if (local === null) {
      return 'inactive';
    }
    if (local <= 5) {
      return 'danger';
    }
    return local <= 10 ? 'warning' : 'normal';
  });

  readonly isExpired: Signal<boolean> = computed(
    () => this.remainingSec() !== null && this.remainingSec() === 0,
  );

  private readonly closeRequestCounter = signal(0);
  readonly closeRequests: Signal<number> =
    this.closeRequestCounter.asReadonly();

  requestSessionClose(): void {
    this.closeRequestCounter.update((count) => count + 1);
  }

  startTargetedSession(
    axis: AxisType,
    options: TargetedSessionOptionsDto = { enabledOptions: [] },
  ): Observable<SessionDto> {
    return this.startSession({
      mode: SessionMode.TARGETED,
      sector: this.resolveCurrentSector(),
      axis,
      options,
    });
  }

  startFullSession(): Observable<SessionDto> {
    return this.startSession({
      mode: SessionMode.FULL,
      sector: this.resolveCurrentSector(),
    });
  }

  private resolveCurrentSector(): Sector {
    return this.authFacade.currentUser()?.currentSector ?? Sector.RAILWAY;
  }

  private startSession(payload: StartSessionDto): Observable<SessionDto> {
    return this.api
      .startSession(payload)
      .pipe(tap((session) => this.installSession(session)));
  }

  loadSession(sessionId: string): Observable<SessionDto> {
    return this.api
      .fetchSession(sessionId)
      .pipe(tap((session) => this.installSession(session)));
  }

  private readonly targetedResultCache = signal<TargetedAxisResultDto | null>(
    null,
  );

  loadTargetedResult(
    sessionId: string,
    axis: AxisType,
  ): Observable<TargetedAxisResultDto> {
    const cached = this.targetedResultCache();
    if (cached?.sessionId === sessionId && cached.axis === axis) {
      return of(cached);
    }
    return this.api
      .fetchTargetedAxisResult(sessionId, axis)
      .pipe(tap((result) => this.targetedResultCache.set(result)));
  }

  completeLogicAxis(items: LogicItemAnswerDto[]): Observable<SessionDto> {
    const session = this.store.session();
    const axis = this.axis();
    if (!session || !axis) {
      return throwError(() => new Error('No active training session'));
    }
    return this.api.completeAxis(session.id, axis, { axis, items }).pipe(
      this.recoverAlreadySubmitted(session.id, axis),
      tap((completed) => this.installSession(completed)),
    );
  }

  private recoverAlreadySubmitted(
    sessionId: string,
    axis: AxisType,
  ): (source: Observable<SessionDto>) => Observable<SessionDto> {
    return (source) =>
      source.pipe(
        catchError((error: unknown) =>
          error instanceof HttpErrorResponse &&
          error.status === HttpStatusCode.Conflict
            ? this.api
                .fetchSession(sessionId)
                .pipe(
                  switchMap((session) =>
                    this.settleCompletionConflict(session, axis, error),
                  ),
                )
            : throwError(() => error),
        ),
      );
  }

  private settleCompletionConflict(
    session: SessionDto,
    axis: AxisType,
    conflict: HttpErrorResponse,
  ): Observable<SessionDto> {
    if (isAxisAlreadyRecorded(session, axis)) {
      return of(session);
    }
    if (session.status === SessionStatus.IN_PROGRESS) {
      return throwError(() => conflict);
    }
    this.installSession(session);
    return throwError(() => new SessionNoLongerActiveError());
  }

  completeMemoryAxis(
    sequences: MemorySequenceAnswerDto[],
  ): Observable<SessionDto> {
    const session = this.store.session();
    const axis = this.axis();
    if (!session || !axis) {
      return throwError(() => new Error('No active training session'));
    }
    return this.api.completeAxis(session.id, axis, { axis, sequences }).pipe(
      this.recoverAlreadySubmitted(session.id, axis),
      tap((completed) => this.installSession(completed)),
    );
  }

  completeDiscriminationAxis(
    trials: DiscriminationTrialAnswerDto[],
    playedMs: number,
  ): Observable<SessionDto> {
    const session = this.store.session();
    const axis = this.axis();
    if (!session || !axis) {
      return throwError(() => new Error('No active training session'));
    }
    return this.api
      .completeAxis(session.id, axis, { axis, trials, playedMs })
      .pipe(
        this.recoverAlreadySubmitted(session.id, axis),
        tap((completed) => this.installSession(completed)),
      );
  }

  completeMotricityAxis(
    courses: MotricityCourseTrajectoryDto[],
    controlModality: ControlModality,
  ): Observable<SessionDto> {
    const session = this.store.session();
    const axis = this.axis();
    if (!session || !axis) {
      return throwError(() => new Error('No active training session'));
    }
    return this.api
      .completeAxis(session.id, axis, { axis, courses, controlModality })
      .pipe(
        this.recoverAlreadySubmitted(session.id, axis),
        tap((completed) => this.installSession(completed)),
      );
  }

  completeReactivityAxis(
    stimuli: ReactivityStimulusAnswerDto[],
    waitPresses: ReactivityWaitPressDto[],
    playedMs: number,
  ): Observable<SessionDto> {
    const session = this.store.session();
    const axis = this.axis();
    if (!session || !axis) {
      return throwError(() => new Error('No active training session'));
    }
    return this.api
      .completeAxis(session.id, axis, {
        axis,
        stimuli,
        waitPresses,
        playedMs,
      })
      .pipe(
        this.recoverAlreadySubmitted(session.id, axis),
        tap((completed) => this.installSession(completed)),
      );
  }

  clearSession(): void {
    this.stopTicker();
    this.store.setSession(null);
  }

  protected installSession(session: SessionDto): void {
    this.effectiveCountdown.set(null);
    this.store.setSession(session);
    if (session.status === SessionStatus.IN_PROGRESS) {
      this.startTicker();
    } else {
      this.stopTicker();
    }
  }

  private startTicker(): void {
    if (this.tickerId !== null) {
      return;
    }
    this.tickerId = window.setInterval(() => {
      this.store.setNowMs(Date.now());
      if (this.remainingSec() === 0) {
        this.stopTicker();
      }
    }, 500);
  }

  private stopTicker(): void {
    if (this.tickerId !== null) {
      window.clearInterval(this.tickerId);
      this.tickerId = null;
    }
  }
}
