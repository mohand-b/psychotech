import {
  DestroyRef,
  Injectable,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { AxisType, SessionDto, SessionMode } from '@psychotech/shared';
import { Observable, timeout } from 'rxjs';
import { SimulationSummaryFacade } from '../../sessions/data-access/simulation-summary.facade';
import {
  SessionNoLongerActiveError,
  TrainingSessionFacade,
} from '../../sessions/data-access/training-session.facade';
import { ResultWaitFailure } from '../ui/result-wait/result-wait';
import { afterAxisSubmitRoute } from '../ui/session-flow';
import { TUTORIAL_SESSION_ID } from './tutorial-session.facade';

export const RESULT_WAIT_MIN_DISPLAY_MS = 1200;
export const RESULT_WAIT_SLOW_HINT_MS = 5000;
export const RESULT_WAIT_DIRECT_REVEAL_MS = 1200;
export const RESULT_WAIT_COMPLETION_TIMEOUT_MS = 90_000;
export const RESULT_WAIT_PREFETCH_TIMEOUT_MS = 30_000;
const QUIT_ROUTE = ['/dashboard'];

type ResultWaitPhase =
  | 'idle'
  | 'completing'
  | 'completed'
  | 'prefetching'
  | 'failed-complete'
  | 'failed-prefetch'
  | 'failed-session-closed';

const FAILURE_BY_PHASE: Partial<Record<ResultWaitPhase, ResultWaitFailure>> = {
  'failed-complete': 'completion',
  'failed-prefetch': 'prefetch',
  'failed-session-closed': 'session-closed',
};

interface AxisCompletionRequest {
  axis: AxisType;
  complete: () => Observable<SessionDto>;
}

@Injectable()
export class ResultWaitOrchestrator {
  private readonly router = inject(Router);
  private readonly trainingFacade = inject(TrainingSessionFacade);
  private readonly summaryFacade = inject(SimulationSummaryFacade);

  private readonly phaseSignal = signal<ResultWaitPhase>('idle');
  private readonly revealedSignal = signal(false);
  private readonly slowSignal = signal(false);
  private readonly simulationSignal = signal(false);
  private readonly quitSignal = signal(false);

  readonly phase = this.phaseSignal.asReadonly();
  readonly slow = this.slowSignal.asReadonly();
  readonly simulation = this.simulationSignal.asReadonly();
  readonly active = computed(
    () => this.phaseSignal() !== 'idle' && this.revealedSignal(),
  );
  readonly failure = computed<ResultWaitFailure | null>(
    () => FAILURE_BY_PHASE[this.phaseSignal()] ?? null,
  );
  readonly failed = computed(() => this.failure() !== null);
  readonly unsent = computed(
    () =>
      !this.quitSignal() &&
      (this.phaseSignal() === 'completing' ||
        this.phaseSignal() === 'failed-complete'),
  );

  private request: AxisCompletionRequest | null = null;
  private completedSession: SessionDto | null = null;
  private awaitsResult = false;
  private minDisplayElapsed = false;
  private resultReady = false;
  private destroyed = false;
  private minTimerId: number | null = null;
  private slowTimerId: number | null = null;
  private revealTimerId: number | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.clearTimers();
    });
  }

  submit(request: AxisCompletionRequest): void {
    if (this.phaseSignal() !== 'idle') {
      return;
    }
    const session = this.trainingFacade.session();
    this.request = request;
    this.awaitsResult = session !== null && this.requiresWait(session);
    this.simulationSignal.set(
      this.awaitsResult && session?.mode === SessionMode.FULL,
    );
    this.startTimers();
    this.runCompletion();
  }

  retry(): void {
    if (this.phaseSignal() === 'failed-complete') {
      this.restartSlowTimer();
      this.runCompletion();
    } else if (this.phaseSignal() === 'failed-prefetch') {
      this.restartSlowTimer();
      this.runPrefetch();
    }
  }

  quit(): void {
    this.quitSignal.set(true);
    this.clearTimers();
    this.trainingFacade.clear();
    this.router.navigate(QUIT_ROUTE);
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
    request
      .complete()
      .pipe(timeout(RESULT_WAIT_COMPLETION_TIMEOUT_MS))
      .subscribe({
        next: (completed) => {
          this.completedSession = completed;
          this.phaseSignal.set('completed');
          if (this.awaitsResult) {
            this.runPrefetch();
          } else {
            this.navigate();
          }
        },
        error: (error: unknown) =>
          this.fail(
            error instanceof SessionNoLongerActiveError
              ? 'failed-session-closed'
              : 'failed-complete',
          ),
      });
  }

  private runPrefetch(): void {
    const request = this.request;
    const completed = this.completedSession;
    if (!request || !completed || this.destroyed) {
      return;
    }
    this.phaseSignal.set('prefetching');
    const prefetch: Observable<unknown> =
      completed.mode === SessionMode.FULL
        ? this.summaryFacade.loadSummary(completed.id)
        : this.trainingFacade.loadTargetedResult(completed.id, request.axis);
    prefetch.pipe(timeout(RESULT_WAIT_PREFETCH_TIMEOUT_MS)).subscribe({
      next: () => {
        this.resultReady = true;
        this.tryNavigate();
      },
      error: () => this.fail('failed-prefetch'),
    });
  }

  private fail(
    phase: 'failed-complete' | 'failed-prefetch' | 'failed-session-closed',
  ): void {
    this.revealedSignal.set(true);
    this.phaseSignal.set(phase);
  }

  private tryNavigate(): void {
    if (this.resultReady && this.minDisplayElapsed) {
      this.navigate();
    }
  }

  private navigate(): void {
    const request = this.request;
    const completed = this.completedSession;
    if (!request || !completed || this.destroyed) {
      return;
    }
    this.clearTimers();
    this.router.navigate(afterAxisSubmitRoute(completed, request.axis), {
      replaceUrl: true,
    });
  }

  private startTimers(): void {
    this.minDisplayElapsed = false;
    this.resultReady = false;
    this.revealedSignal.set(this.awaitsResult);
    if (this.awaitsResult) {
      this.minTimerId = window.setTimeout(() => {
        this.minTimerId = null;
        this.minDisplayElapsed = true;
        this.tryNavigate();
      }, RESULT_WAIT_MIN_DISPLAY_MS);
    } else {
      this.revealTimerId = window.setTimeout(() => {
        this.revealTimerId = null;
        this.revealedSignal.set(true);
      }, RESULT_WAIT_DIRECT_REVEAL_MS);
    }
    this.restartSlowTimer();
  }

  private restartSlowTimer(): void {
    if (this.slowTimerId !== null) {
      window.clearTimeout(this.slowTimerId);
    }
    this.slowSignal.set(false);
    this.slowTimerId = window.setTimeout(() => {
      this.slowTimerId = null;
      this.slowSignal.set(true);
    }, RESULT_WAIT_SLOW_HINT_MS);
  }

  private clearTimers(): void {
    for (const timerId of [
      this.minTimerId,
      this.slowTimerId,
      this.revealTimerId,
    ]) {
      if (timerId !== null) {
        window.clearTimeout(timerId);
      }
    }
    this.minTimerId = null;
    this.slowTimerId = null;
    this.revealTimerId = null;
  }
}
