import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import {
  AXIS_TRAINING,
  AxisTimerModel,
  AxisTraining,
  AxisType,
  DiscriminationTrial,
  DiscriminationTrialAnswerDto,
  LogicItem,
  LogicItemAnswerDto,
  MemorySequence,
  MemorySequenceAnswerDto,
  RailwayPlayableAxis,
  ReactivityStimulus,
  ReactivityStimulusAnswerDto,
  ReactivityWaitPressDto,
  Sector,
  SessionDto,
  SessionMode,
  SessionStatus,
  TargetedAxisResultDto,
  TargetedSessionOptionsDto,
  generateDiscriminationSession,
  generateLogicSession,
  generateMemorySession,
  generateReactivitySession,
} from '@psychotech/shared';
import { Observable, catchError, map, of, switchMap, tap, throwError } from 'rxjs';
import { AuthFacade } from '../../auth/data-access/auth.facade';
import { EnergyFacade } from '../../energy/data-access/energy.facade';
import { TimerSeverity } from '../../shared/ui/focused-header/focused-header';
import { formatDuration } from '../../shared/ui/format-duration';
import { countdownFrom } from './session-countdown';
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

const GLOBAL_TIMER_THRESHOLDS: Partial<Record<AxisType, GlobalTimerThresholds>> = {
  [AxisType.LOGIC]: DEFAULT_GLOBAL_THRESHOLDS,
  [AxisType.VISUAL_DISCRIMINATION]: { warningSec: 60, dangerSec: 30 },
  [AxisType.REACTIVITY]: { warningSec: 60, dangerSec: 30 },
};

@Injectable({ providedIn: 'root' })
export class TrainingSessionFacade {
  private readonly api = inject(SessionsApi);
  private readonly store = inject(TrainingSessionStore);
  private readonly energyFacade = inject(EnergyFacade);
  private readonly authFacade = inject(AuthFacade);
  private tickerId: number | null = null;

  readonly session: Signal<SessionDto | null> = this.store.session;

  readonly axis: Signal<AxisType | null> = computed(
    () => this.store.session()?.axisResults[0]?.axis ?? null,
  );

  readonly helpEnabled: Signal<boolean> = computed(
    () => this.store.session()?.options.helpEnabled ?? false,
  );

  readonly logicItems: Signal<LogicItem[]> = computed(() => {
    const session = this.store.session();
    return session && this.axis() === AxisType.LOGIC
      ? generateLogicSession(session.seed)
      : [];
  });

  readonly memorySequences: Signal<MemorySequence[]> = computed(() => {
    const session = this.store.session();
    return session && this.axis() === AxisType.MEMORY
      ? generateMemorySession(session.seed)
      : [];
  });

  readonly discriminationTrials: Signal<DiscriminationTrial[]> = computed(() => {
    const session = this.store.session();
    return session && this.axis() === AxisType.VISUAL_DISCRIMINATION
      ? generateDiscriminationSession(session.seed)
      : [];
  });

  readonly reactivityStimuli: Signal<ReactivityStimulus[]> = computed(() => {
    const session = this.store.session();
    return session && this.axis() === AxisType.REACTIVITY
      ? generateReactivitySession(session.seed)
      : [];
  });

  readonly durationSec: Signal<number | null> = computed(() => {
    const axis = this.axis();
    if (!axis) {
      return null;
    }
    const training: AxisTraining | undefined =
      AXIS_TRAINING[axis as RailwayPlayableAxis];
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

  readonly remainingSec: Signal<number | null> = computed(() => {
    const override = this.effectiveCountdown();
    if (override) {
      return override.remainingSec;
    }
    const session = this.store.session();
    const axis = this.axis();
    if (!session || !axis || session.status !== SessionStatus.IN_PROGRESS) {
      return null;
    }
    const training: AxisTraining | undefined =
      AXIS_TRAINING[axis as RailwayPlayableAxis];
    if (!training || training.timer.model !== AxisTimerModel.GLOBAL) {
      return null;
    }
    return countdownFrom(
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
    if (!session || duration === null || session.status !== SessionStatus.IN_PROGRESS) {
      return null;
    }
    return countdownFrom(this.store.anchorMs(), this.store.nowMs(), duration)
      .fraction;
  });

  private readonly perExerciseRemaining = signal<number | null>(null);

  private readonly hasPerExerciseTimer: Signal<boolean> = computed(() => {
    const session = this.store.session();
    const axis = this.axis();
    if (!session || !axis || session.status !== SessionStatus.IN_PROGRESS) {
      return false;
    }
    const training: AxisTraining | undefined =
      AXIS_TRAINING[axis as RailwayPlayableAxis];
    return training?.timer.model === AxisTimerModel.PER_EXERCISE;
  });

  setPerExerciseCountdown(remainingSec: number | null): void {
    this.perExerciseRemaining.set(remainingSec);
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

  readonly isExpired: Signal<boolean> = computed(() => this.remainingSec() === 0);

  private readonly closeRequestCounter = signal(0);
  readonly closeRequests: Signal<number> = this.closeRequestCounter.asReadonly();

  requestClose(): void {
    this.closeRequestCounter.update((count) => count + 1);
  }

  startTargeted(
    axis: AxisType,
    options: TargetedSessionOptionsDto = { helpEnabled: false },
  ): Observable<SessionDto> {
    const sector = this.authFacade.currentUser()?.currentSector ?? Sector.RAILWAY;
    return this.api.start({ mode: SessionMode.TARGETED, sector, axis, options }).pipe(
      tap((session) => this.install(session)),
      switchMap((session) =>
        this.energyFacade.load().pipe(
          map(() => session),
          catchError(() => of(session)),
        ),
      ),
    );
  }

  load(sessionId: string): Observable<SessionDto> {
    return this.api.get(sessionId).pipe(tap((session) => this.install(session)));
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
      .targetedResult(sessionId, axis)
      .pipe(tap((result) => this.targetedResultCache.set(result)));
  }

  completeTargeted(items: LogicItemAnswerDto[]): Observable<SessionDto> {
    const session = this.store.session();
    const axis = this.axis();
    if (!session || !axis) {
      return throwError(() => new Error('No active training session'));
    }
    return this.api
      .completeTargeted(session.id, axis, { axis, items })
      .pipe(tap((completed) => this.install(completed)));
  }

  completeTargetedMemory(
    sequences: MemorySequenceAnswerDto[],
  ): Observable<SessionDto> {
    const session = this.store.session();
    const axis = this.axis();
    if (!session || !axis) {
      return throwError(() => new Error('No active training session'));
    }
    return this.api
      .completeTargeted(session.id, axis, { axis, sequences })
      .pipe(tap((completed) => this.install(completed)));
  }

  completeTargetedDiscrimination(
    trials: DiscriminationTrialAnswerDto[],
  ): Observable<SessionDto> {
    const session = this.store.session();
    const axis = this.axis();
    if (!session || !axis) {
      return throwError(() => new Error('No active training session'));
    }
    return this.api
      .completeTargeted(session.id, axis, { axis, trials })
      .pipe(tap((completed) => this.install(completed)));
  }

  completeTargetedReactivity(
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
      .completeTargeted(session.id, axis, {
        axis,
        stimuli,
        waitPresses,
        playedMs,
      })
      .pipe(tap((completed) => this.install(completed)));
  }

  clear(): void {
    this.stopTicker();
    this.store.setSession(null);
  }

  private install(session: SessionDto): void {
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
      this.store.tick(Date.now());
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
