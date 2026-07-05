import { Injectable, Signal, computed, inject } from '@angular/core';
import {
  AXIS_TRAINING,
  AxisTimerModel,
  AxisTraining,
  AxisType,
  LogicItem,
  LogicItemAnswerDto,
  RailwayPlayableAxis,
  Sector,
  SessionDto,
  SessionMode,
  SessionStatus,
  generateLogicSession,
} from '@psychotech/shared';
import { Observable, catchError, map, of, switchMap, tap, throwError } from 'rxjs';
import { AuthFacade } from '../../auth/data-access/auth.facade';
import { EnergyFacade } from '../../energy/data-access/energy.facade';
import { formatDuration } from '../../shared/ui/format-duration';
import { SessionsApi } from './sessions.api';
import { TrainingSessionStore } from './training-session.store';

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

  readonly logicItems: Signal<LogicItem[]> = computed(() => {
    const session = this.store.session();
    return session && this.axis() === AxisType.LOGIC
      ? generateLogicSession(session.seed)
      : [];
  });

  readonly remainingSec: Signal<number | null> = computed(() => {
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
    const elapsedSec = (this.store.nowMs() - Date.parse(session.startedAt)) / 1000;
    return Math.max(0, Math.ceil(training.timer.durationSec - elapsedSec));
  });

  readonly remainingLabel: Signal<string | null> = computed(() => {
    const remaining = this.remainingSec();
    return remaining === null ? null : formatDuration(remaining);
  });

  readonly countdownSeverity: Signal<'normal' | 'warning' | 'danger'> = computed(() => {
    const remaining = this.remainingSec();
    if (remaining === null) {
      return 'normal';
    }
    if (remaining <= 60) {
      return 'danger';
    }
    return remaining <= 120 ? 'warning' : 'normal';
  });

  readonly isExpired: Signal<boolean> = computed(() => this.remainingSec() === 0);

  startTargeted(axis: AxisType): Observable<SessionDto> {
    const sector = this.authFacade.currentUser()?.currentSector ?? Sector.RAILWAY;
    return this.api.start({ mode: SessionMode.TARGETED, sector, axis }).pipe(
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

  clear(): void {
    this.stopTicker();
    this.store.setSession(null);
  }

  private install(session: SessionDto): void {
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
