import { Injectable, Signal, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { BadgeId, EarnedBadgeDto } from '@psychotech/shared';
import { filter } from 'rxjs';
import {
  BadgeCelebrationPhase,
  BadgeStore,
} from '../../core/badges/badge.store';
import { isQuietForCelebration } from '../../core/badges/play-routes';
import { EnergyFacade } from '../../energy/data-access/energy.facade';
import { BadgesApi } from './badges.api';

const PLAY_ROUTE_HOLD = 'play-route';

@Injectable({ providedIn: 'root' })
export class BadgeCelebrationFacade {
  private readonly store = inject(BadgeStore);
  private readonly api = inject(BadgesApi);
  private readonly energyFacade = inject(EnergyFacade);
  private readonly router = inject(Router);

  private readonly acknowledgedIds = new Set<BadgeId>();

  readonly current: Signal<EarnedBadgeDto | null> = this.store.current;
  readonly phase: Signal<BadgeCelebrationPhase> = this.store.phase;
  readonly position: Signal<number> = this.store.position;
  readonly total: Signal<number> = this.store.total;
  readonly isLast: Signal<boolean> = this.store.isLast;
  readonly celebrating: Signal<boolean> = computed(
    () => this.store.phase() === 'celebrating',
  );

  constructor() {
    this.syncPlayRouteHold(this.router.url);
    this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd => event instanceof NavigationEnd,
        ),
        takeUntilDestroyed(),
      )
      .subscribe((event) => this.syncPlayRouteHold(event.urlAfterRedirects));
  }

  reconcileUnacknowledged(): void {
    this.api.unacknowledged().subscribe({
      next: (badges) =>
        this.store.enqueue(
          badges.filter((badge) => !this.acknowledgedIds.has(badge.badgeId)),
        ),
      error: () => undefined,
    });
  }

  holdScene(reason: string): void {
    this.store.placeHold(reason);
  }

  releaseScene(reason: string): void {
    this.store.releaseHold(reason);
  }

  replay(badges: EarnedBadgeDto[]): void {
    this.store.replay(badges);
  }

  completeCurrent(): void {
    const completed = this.store.completeCurrent();
    if (completed) {
      this.acknowledge(completed);
    }
  }

  dismissAll(): void {
    this.store.dismissAll().forEach((badge) => this.acknowledge(badge));
  }

  private syncPlayRouteHold(url: string): void {
    if (isQuietForCelebration(url)) {
      this.store.releaseHold(PLAY_ROUTE_HOLD);
    } else {
      this.store.placeHold(PLAY_ROUTE_HOLD);
    }
  }

  private acknowledge(badge: EarnedBadgeDto): void {
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
