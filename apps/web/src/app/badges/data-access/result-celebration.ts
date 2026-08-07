import { DestroyRef, inject } from '@angular/core';
import { Sector } from '@psychotech/shared';
import { TrainingSessionFacade } from '../../sessions/data-access/training-session.facade';
import { BadgeAnnounceView } from '../../shared/ui/badge-announce/badge-announce';
import { BadgeCelebrationFacade } from './badge-celebration.facade';
import { badgeAnnounceViewFor } from './badge-display';

export interface ResultCelebration {
  announceView: BadgeAnnounceView | null;
  sceneReady(): void;
  replay(): void;
}

export function resultCelebrationFor(sessionId: string): ResultCelebration {
  const celebrationFacade = inject(BadgeCelebrationFacade);
  const session = inject(TrainingSessionFacade).session();
  const destroyRef = inject(DestroyRef);
  const hold = `score-scene:${sessionId}`;

  celebrationFacade.holdScene(hold);
  destroyRef.onDestroy(() => celebrationFacade.releaseScene(hold));

  const earnedBadges =
    session && session.id === sessionId ? (session.newBadges ?? []) : [];
  const sector = session?.sector ?? Sector.RAILWAY;

  return {
    announceView: badgeAnnounceViewFor(earnedBadges, sector),
    sceneReady: () => celebrationFacade.releaseScene(hold),
    replay: () => celebrationFacade.replay(earnedBadges),
  };
}
