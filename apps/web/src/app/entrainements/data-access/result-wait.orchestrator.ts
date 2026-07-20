import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AxisType, SessionDto, SessionMode } from '@psychotech/shared';
import { Observable } from 'rxjs';
import { SimulationSummaryFacade } from '../../sessions/data-access/simulation-summary.facade';
import { TrainingSessionFacade } from '../../sessions/data-access/training-session.facade';
import { afterAxisSubmitRoute } from '../ui/session-flow';
import { TUTORIAL_SESSION_ID } from './tutorial-session.facade';

export const RESULT_WAIT_MIN_DISPLAY_MS = 1200;
export const RESULT_WAIT_SLOW_HINT_MS = 5000;

export type ResultWaitPhase =
  | 'idle'
  | 'completing'
  | 'prefetching'
  | 'failed-complete'
  | 'failed-prefetch';

export interface AxisCompletionRequest {
  axis: AxisType;
  complete: () => Observable<SessionDto>;
  onSilentFailure: () => void;
}

@Injectable()
export class ResultWaitOrchestrator {
  private readonly router = inject(Router);
  private readonly trainingFacade = inject(TrainingSessionFacade);
  private readonly summaryFacade = inject(SimulationSummaryFacade);

  private readonly phaseSignal = signal<ResultWaitPhase>('idle');
  private readonly slowSignal = signal(false);
  private readonly simulationSignal = signal(false);

  readonly phase = this.phaseSignal.asReadonly();
  readonly slow = this.slowSignal.asReadonly();
  readonly simulation = this.simulationSignal.asReadonly();
  readonly active = computed(() => this.phaseSignal() !== 'idle');
  readonly failed = computed(
    () =>
      this.phaseSignal() === 'failed-complete' ||
      this.phaseSignal() === 'failed-prefetch',
  );

  private request: AxisCompletionRequest | null = null;
  private completedSession: SessionDto | null = null;
  private minDisplayElapsed = false;
  private resultReady = false;
  private minTimerId: number | null = null;
  private slowTimerId: number | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.clearTimers());
  }

  submit(request: AxisCompletionRequest): void {
    if (this.phaseSignal() !== 'idle') {
      return;
    }
    const session = this.trainingFacade.session();
    if (!session || !this.requiresWait(session)) {
      request.complete().subscribe({
        next: (completed) =>
          this.router.navigate(afterAxisSubmitRoute(completed, request.axis)),
        error: () => request.onSilentFailure(),
      });
      return;
    }
    this.request = request;
    this.simulationSignal.set(session.mode === SessionMode.FULL);
    this.startTimers();
    this.runCompletion();
  }

  retry(): void {
    if (this.phaseSignal() === 'failed-complete') {
      this.runCompletion();
    } else if (this.phaseSignal() === 'failed-prefetch') {
      this.runPrefetch();
    }
  }

  private requiresWait(session: SessionDto): boolean {
    if (session.id === TUTORIAL_SESSION_ID) {
      return false;
    }
    if (session.mode !== SessionMode.FULL) {
      return true;
    }
    return session.currentAxisIndex === session.axisResults.length - 1;
  }

  private runCompletion(): void {
    const request = this.request;
    if (!request) {
      return;
    }
    this.phaseSignal.set('completing');
    request.complete().subscribe({
      next: (completed) => {
        this.completedSession = completed;
        this.runPrefetch();
      },
      error: () => this.phaseSignal.set('failed-complete'),
    });
  }

  private runPrefetch(): void {
    const request = this.request;
    const completed = this.completedSession;
    if (!request || !completed) {
      return;
    }
    this.phaseSignal.set('prefetching');
    const prefetch: Observable<unknown> =
      completed.mode === SessionMode.FULL
        ? this.summaryFacade.loadSummary(completed.id)
        : this.trainingFacade.loadTargetedResult(completed.id, request.axis);
    prefetch.subscribe({
      next: () => {
        this.resultReady = true;
        this.tryNavigate();
      },
      error: () => this.phaseSignal.set('failed-prefetch'),
    });
  }

  private tryNavigate(): void {
    const request = this.request;
    const completed = this.completedSession;
    if (
      !request ||
      !completed ||
      !this.resultReady ||
      !this.minDisplayElapsed
    ) {
      return;
    }
    this.clearTimers();
    this.router.navigate(afterAxisSubmitRoute(completed, request.axis));
  }

  private startTimers(): void {
    this.minDisplayElapsed = false;
    this.resultReady = false;
    this.slowSignal.set(false);
    this.minTimerId = window.setTimeout(() => {
      this.minTimerId = null;
      this.minDisplayElapsed = true;
      this.tryNavigate();
    }, RESULT_WAIT_MIN_DISPLAY_MS);
    this.slowTimerId = window.setTimeout(() => {
      this.slowTimerId = null;
      this.slowSignal.set(true);
    }, RESULT_WAIT_SLOW_HINT_MS);
  }

  private clearTimers(): void {
    if (this.minTimerId !== null) {
      window.clearTimeout(this.minTimerId);
      this.minTimerId = null;
    }
    if (this.slowTimerId !== null) {
      window.clearTimeout(this.slowTimerId);
      this.slowTimerId = null;
    }
  }
}
