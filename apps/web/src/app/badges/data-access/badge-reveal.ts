import { inject } from '@angular/core';
import { TrainingSessionFacade } from '../../sessions/data-access/training-session.facade';
import { BadgeRevealView } from '../../shared/ui/badge-unlock/badge-unlock';
import { badgeRevealViewFor } from './badge-display';
import { BadgesFacade } from './badges.facade';

export function revealSessionBadges(sessionId: string): BadgeRevealView[] {
  const session = inject(TrainingSessionFacade).session();
  const badgesFacade = inject(BadgesFacade);
  if (!session || session.id !== sessionId) {
    return [];
  }
  const newBadges = session.newBadges ?? [];
  if (newBadges.length === 0) {
    return [];
  }
  badgesFacade.acknowledgeAll(newBadges);
  return newBadges
    .map((badge) =>
      badgeRevealViewFor(badge.badgeId, badge.energyReward, session.sector),
    )
    .filter((view): view is BadgeRevealView => view !== null);
}
