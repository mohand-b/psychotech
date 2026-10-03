import { Signal, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { AxisType, TargetedAxisResultDto } from '@psychotech/shared';
import { BadgeCelebrationFacade } from '../../badges/data-access/badge-celebration.facade';
import { TrainingSessionFacade } from '../../sessions/data-access/training-session.facade';
import { buildTargetedAxisRoute } from '../../shared/util/session-links';
import { syncSectorReferential } from './sector-referential';

type TargetedResultOf<A extends AxisType> = Extract<
  TargetedAxisResultDto,
  { axis: A }
>;

function isResultOf<A extends AxisType>(
  result: TargetedAxisResultDto,
  axis: A,
): result is TargetedResultOf<A> {
  return result.axis === axis;
}

export function loadTargetedResultFromRoute<A extends AxisType>(
  axis: A,
): { sessionId: string; result: Signal<TargetedResultOf<A> | null> } {
  const router = inject(Router);
  const sessionId =
    inject(ActivatedRoute).snapshot.paramMap.get('sessionId') ?? '';
  const result = signal<TargetedResultOf<A> | null>(null);
  inject(TrainingSessionFacade)
    .loadTargetedResult(sessionId, axis)
    .pipe(takeUntilDestroyed())
    .subscribe({
      next: (loaded) => {
        if (isResultOf(loaded, axis)) {
          result.set(loaded);
        }
      },
      error: () => router.navigate(['/entrainements']),
    });
  return { sessionId, result: result.asReadonly() };
}

export function createTargetedResultPage<A extends AxisType>(axis: A) {
  const router = inject(Router);
  const { sessionId, result } = loadTargetedResultFromRoute(axis);
  const cameFromPlay =
    inject(TrainingSessionFacade).session()?.id === sessionId;
  return {
    axis,
    sessionId,
    result,
    backLabel: cameFromPlay ? 'Retour aux axes' : 'Retour aux sessions',
    celebration: inject(BadgeCelebrationFacade).prepareResultCelebration(
      sessionId,
      computed(() => {
        const current = result();
        return current
          ? { badges: current.earnedBadges ?? [], sector: current.sector }
          : null;
      }),
    ),
    referential: syncSectorReferential(
      computed(() => result()?.sector ?? null),
    ),
    navigateToAxisStart: () => router.navigate(buildTargetedAxisRoute(axis)),
    returnToAxesOrSessions: () =>
      cameFromPlay
        ? router.navigate(['/entrainements'], {
            queryParams: { panel: 'cible' },
          })
        : router.navigate(['/sessions']),
  };
}
