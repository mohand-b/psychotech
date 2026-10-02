import { Signal, effect, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AxisType,
  SessionDto,
  SessionMode,
  SessionStatus,
} from '@psychotech/shared';
import { TrainingSessionFacade } from '../../sessions/data-access/training-session.facade';
import { ResultWaitOrchestrator } from '../data-access/result-wait.orchestrator';
import {
  inactiveSessionRoute,
  simulationCurrentAxis,
} from '../ui/session-flow';
import { PlayLeaveControl } from './play-leave.guard';
import { simulationSessionRoute } from '../../shared/util/session-links';

export function loadPlayableSession(
  sessionId: string,
  axis: AxisType,
  onPlayable: () => void,
): void {
  const facade = inject(TrainingSessionFacade);
  const router = inject(Router);
  const open = (session: SessionDto): void => {
    if (session.status !== SessionStatus.IN_PROGRESS) {
      router.navigate(inactiveSessionRoute(session, axis), {
        replaceUrl: true,
      });
      return;
    }
    if (
      session.mode === SessionMode.FULL &&
      simulationCurrentAxis(session) !== axis
    ) {
      router.navigate(simulationSessionRoute(session.id), {
        replaceUrl: true,
      });
      return;
    }
    onPlayable();
  };
  const active = facade.session();
  if (active?.id === sessionId) {
    open(active);
    return;
  }
  facade
    .load(sessionId)
    .pipe(takeUntilDestroyed())
    .subscribe({
      next: open,
      error: () => router.navigate(['/entrainements']),
    });
}

export function confirmExitOnCloseRequest(
  canConfirm: () => boolean,
  confirm: () => void,
): void {
  const closeRequests = inject(TrainingSessionFacade).closeRequests;
  let handledRequests = closeRequests();
  effect(() => {
    const requests = closeRequests();
    if (requests !== handledRequests) {
      handledRequests = requests;
      if (canConfirm()) {
        confirm();
      }
    }
  });
}

export function playLeaveControl(
  loaded: Signal<boolean>,
  submitted: () => boolean,
  askConfirmation: () => void,
): PlayLeaveControl {
  const route = inject(ActivatedRoute);
  const resultWait = inject(ResultWaitOrchestrator);
  return new PlayLeaveControl(
    () => ({
      live: loaded() && route.snapshot.data['tutorial'] !== true,
      submitted: submitted(),
      unsent: resultWait.unsent(),
    }),
    askConfirmation,
  );
}
