import { DestroyRef, Signal, computed, inject } from '@angular/core';
import { EarnedBadgeDto, Sector } from '@psychotech/shared';
import { BadgeAnnounceView } from '../../shared/ui/badge-announce/badge-announce';
import { BadgeCelebrationFacade } from './badge-celebration.facade';
import { badgeAnnounceViewFor } from './badge-display';

export interface ResultBadgesSource {
  badges: EarnedBadgeDto[];
  sector: Sector;
}

export interface ResultCelebration {
  announceView: Signal<BadgeAnnounceView | null>;
  sceneReady(): void;
  replay(): void;
}

export function resultCelebrationFor(
  sessionId: string,
  source: Signal<ResultBadgesSource | null>,
): ResultCelebration {
  const celebrationFacade = inject(BadgeCelebrationFacade);
  const destroyRef = inject(DestroyRef);
  const hold = `score-scene:${sessionId}`;

  celebrationFacade.holdScene(hold);
  destroyRef.onDestroy(() => celebrationFacade.releaseScene(hold));

  const announceView = computed(() => {
    const current = source();
    return current
      ? badgeAnnounceViewFor(current.badges, current.sector)
      : null;
  });

  return {
    announceView,
    sceneReady: () => celebrationFacade.releaseScene(hold),
    replay: () => celebrationFacade.replay(source()?.badges ?? []),
  };
}
