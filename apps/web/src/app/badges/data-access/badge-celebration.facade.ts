import {
  DestroyRef,
  Injectable,
  Signal,
  computed,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { BadgeId, EarnedBadgeDto, Sector } from '@psychotech/shared';
import { filter } from 'rxjs';
import { AuthFacade } from '../../auth/data-access/auth.facade';
import { BadgeStore } from '../../core/badges/badge.store';
import { isQuietForCelebration } from '../../core/badges/play-routes';
import { BadgeAnnounceView } from '../../shared/ui/badge-announce/badge-announce';
import { BadgeCelebrationView } from '../../shared/ui/badge-celebration-modal/badge-celebration-modal';
import { badgeAnnounceViewFor, badgeCelebrationViewFor } from './badge-display';
import { BadgesApi } from './badges.api';

const PLAY_ROUTE_HOLD = 'play-route';

export interface ResultBadgesSource {
  badges: EarnedBadgeDto[];
  sector: Sector;
}

export interface ResultCelebration {
  announceView: Signal<BadgeAnnounceView | null>;
  sceneReady(): void;
  replay(): void;
}

@Injectable({ providedIn: 'root' })
export class BadgeCelebrationFacade {
  private readonly store = inject(BadgeStore);
  private readonly api = inject(BadgesApi);
  private readonly authFacade = inject(AuthFacade);
  private readonly router = inject(Router);

  private readonly acknowledgedIds = new Set<BadgeId>();
  private readonly failedAcks = new Set<BadgeId>();

  readonly position: Signal<number> = this.store.position;
  readonly total: Signal<number> = this.store.total;
  readonly isLast: Signal<boolean> = this.store.isLast;
  readonly currentView: Signal<BadgeCelebrationView | null> = computed(() => {
    const badge = this.store.current();
    if (!badge) {
      return null;
    }
    const sector =
      this.authFacade.currentUser()?.currentSector ?? Sector.RAILWAY;
    return badgeCelebrationViewFor(badge, sector);
  });

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
    this.retryFailedAcks();
    this.api.unacknowledged().subscribe({
      next: (badges) =>
        this.store.enqueue(
          badges.filter((badge) => !this.acknowledgedIds.has(badge.badgeId)),
        ),
      error: () => undefined,
    });
  }

  celebrateResult(
    sessionId: string,
    source: Signal<ResultBadgesSource | null>,
  ): ResultCelebration {
    const destroyRef = inject(DestroyRef);
    const hold = `score-scene:${sessionId}`;
    this.store.placeHold(hold);
    destroyRef.onDestroy(() => this.store.releaseHold(hold));
    return {
      announceView: computed(() => {
        const current = source();
        return current
          ? badgeAnnounceViewFor(current.badges, current.sector)
          : null;
      }),
      sceneReady: () => this.store.releaseHold(hold),
      replay: () => this.store.replay(source()?.badges ?? []),
    };
  }

  completeCurrent(): EarnedBadgeDto[] {
    const completed = this.store.completeCurrent();
    return completed ? this.acknowledge([completed]) : [];
  }

  dismissAll(): EarnedBadgeDto[] {
    return this.acknowledge(this.store.dismissAll());
  }

  private syncPlayRouteHold(url: string): void {
    if (isQuietForCelebration(url)) {
      this.store.releaseHold(PLAY_ROUTE_HOLD);
    } else {
      this.store.placeHold(PLAY_ROUTE_HOLD);
    }
  }

  private acknowledge(badges: readonly EarnedBadgeDto[]): EarnedBadgeDto[] {
    const acknowledged: EarnedBadgeDto[] = [];
    for (const badge of badges) {
      if (!this.acknowledgedIds.has(badge.badgeId)) {
        this.acknowledgedIds.add(badge.badgeId);
        this.sendAcknowledge(badge.badgeId);
        acknowledged.push(badge);
      }
    }
    return acknowledged;
  }

  private sendAcknowledge(badgeId: BadgeId): void {
    this.api.acknowledge(badgeId).subscribe({
      next: () => this.failedAcks.delete(badgeId),
      error: () => this.failedAcks.add(badgeId),
    });
  }

  private retryFailedAcks(): void {
    for (const badgeId of this.failedAcks) {
      this.sendAcknowledge(badgeId);
    }
  }
}
