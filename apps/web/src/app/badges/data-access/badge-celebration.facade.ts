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
import { isOutsidePlayRoute } from '../../core/badges/play-routes';
import { BadgeAnnounceView } from '../../shared/ui/badge-announce/badge-announce';
import { BadgeCelebrationView } from '../../shared/ui/badge-celebration-modal/badge-celebration-modal';
import {
  buildBadgeAnnounceView,
  buildBadgeCelebrationView,
} from './badge-display';
import { BadgesApi } from './badges.api';

const PLAY_ROUTE_HOLD = 'play-route';

export interface ResultBadgesSource {
  badges: EarnedBadgeDto[];
  sector: Sector;
}

export interface ResultCelebration {
  announceView: Signal<BadgeAnnounceView | null>;
  releaseSceneHold(): void;
  replayCelebration(): void;
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
    return buildBadgeCelebrationView(badge, sector);
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

  reconcileUnacknowledgedBadges(): void {
    this.retryFailedAcknowledgements();
    this.api.fetchUnacknowledgedBadges().subscribe({
      next: (badges) =>
        this.store.enqueueBadges(
          badges.filter((badge) => !this.acknowledgedIds.has(badge.badgeId)),
        ),
      error: () => undefined,
    });
  }

  prepareResultCelebration(
    sessionId: string,
    source: Signal<ResultBadgesSource | null>,
  ): ResultCelebration {
    const destroyRef = inject(DestroyRef);
    const hold = `score-scene:${sessionId}`;
    this.store.placeSceneHold(hold);
    destroyRef.onDestroy(() => this.store.releaseSceneHold(hold));
    return {
      announceView: computed(() => {
        const current = source();
        return current
          ? buildBadgeAnnounceView(current.badges, current.sector)
          : null;
      }),
      releaseSceneHold: () => this.store.releaseSceneHold(hold),
      replayCelebration: () =>
        this.store.replayCelebration(source()?.badges ?? []),
    };
  }

  completeCurrentBadge(): EarnedBadgeDto[] {
    const completed = this.store.completeCurrentBadge();
    return completed ? this.acknowledgeBadges([completed]) : [];
  }

  dismissRemainingBadges(): EarnedBadgeDto[] {
    return this.acknowledgeBadges(this.store.dismissRemainingBadges());
  }

  private syncPlayRouteHold(url: string): void {
    if (isOutsidePlayRoute(url)) {
      this.store.releaseSceneHold(PLAY_ROUTE_HOLD);
    } else {
      this.store.placeSceneHold(PLAY_ROUTE_HOLD);
    }
  }

  private acknowledgeBadges(
    badges: readonly EarnedBadgeDto[],
  ): EarnedBadgeDto[] {
    const acknowledged: EarnedBadgeDto[] = [];
    for (const badge of badges) {
      if (!this.acknowledgedIds.has(badge.badgeId)) {
        this.acknowledgedIds.add(badge.badgeId);
        this.sendBadgeAcknowledgement(badge.badgeId);
        acknowledged.push(badge);
      }
    }
    return acknowledged;
  }

  private sendBadgeAcknowledgement(badgeId: BadgeId): void {
    this.api.acknowledgeBadge(badgeId).subscribe({
      next: () => this.failedAcks.delete(badgeId),
      error: () => this.failedAcks.add(badgeId),
    });
  }

  private retryFailedAcknowledgements(): void {
    for (const badgeId of this.failedAcks) {
      this.sendBadgeAcknowledgement(badgeId);
    }
  }
}
