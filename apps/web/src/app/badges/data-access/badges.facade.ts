import { Injectable, Signal, inject, signal } from '@angular/core';
import { BadgeId, EarnedBadgeDto } from '@psychotech/shared';
import { EnergyFacade } from '../../energy/data-access/energy.facade';
import { BadgesApi } from './badges.api';

interface AcknowledgeableBadge {
  badgeId: BadgeId;
  gain: number | null;
}

@Injectable({ providedIn: 'root' })
export class BadgesFacade {
  private readonly api = inject(BadgesApi);
  private readonly energyFacade = inject(EnergyFacade);

  private readonly pendingSignal = signal<EarnedBadgeDto[]>([]);
  private readonly acknowledgedIds = new Set<BadgeId>();
  private tutorialNotified = false;

  readonly pending: Signal<EarnedBadgeDto[]> =
    this.pendingSignal.asReadonly();

  loadUnacknowledged(): void {
    this.api.unacknowledged().subscribe({
      next: (badges) =>
        this.pendingSignal.set(
          badges.filter((badge) => !this.acknowledgedIds.has(badge.badgeId)),
        ),
      error: () => undefined,
    });
  }

  acknowledgeCurrentCelebration(): void {
    const [current, ...rest] = this.pendingSignal();
    if (!current) {
      return;
    }
    this.acknowledge(current);
    this.pendingSignal.set(rest);
  }

  acknowledgeAll(badges: readonly AcknowledgeableBadge[]): void {
    badges.forEach((badge) => this.acknowledge(badge));
  }

  notifyTutorialDiscovered(): void {
    if (this.tutorialNotified) {
      return;
    }
    this.tutorialNotified = true;
    this.api.tutorialDiscovered().subscribe({ error: () => undefined });
  }

  private acknowledge(badge: AcknowledgeableBadge): void {
    if (this.acknowledgedIds.has(badge.badgeId)) {
      return;
    }
    this.acknowledgedIds.add(badge.badgeId);
    this.api.acknowledge(badge.badgeId).subscribe({ error: () => undefined });
    if ((badge.gain ?? 0) > 0) {
      this.energyFacade.load().subscribe({ error: () => undefined });
    }
  }
}
