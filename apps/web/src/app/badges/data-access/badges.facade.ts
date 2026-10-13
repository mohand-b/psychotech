import { Injectable, Signal, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { BadgeFeedDto, BadgeStatusDto, GuideId } from '@psychotech/shared';
import { Observable } from 'rxjs';
import { readResourceValueOr } from '../../shared/util/resource-value';
import { BadgesApi } from './badges.api';

const EMPTY_BADGE_FEED: BadgeFeedDto = { visible: false, entries: [] };

@Injectable({ providedIn: 'root' })
export class BadgesFacade {
  private readonly api = inject(BadgesApi);

  private tutorialNotified = false;

  fetchStatuses(): Signal<BadgeStatusDto[] | null> {
    return readResourceValueOr(
      rxResource<BadgeStatusDto[] | null, void>({
        stream: () => this.api.fetchBadgeStatuses(),
        defaultValue: null,
      }),
      null,
    );
  }

  fetchFeed(): Signal<BadgeFeedDto> {
    return readResourceValueOr(
      rxResource({
        stream: () => this.api.fetchBadgeFeed(),
        defaultValue: EMPTY_BADGE_FEED,
      }),
      EMPTY_BADGE_FEED,
    );
  }

  notifyTutorialDiscovered(): void {
    if (this.tutorialNotified) {
      return;
    }
    this.tutorialNotified = true;
    this.api.notifyTutorialDiscovered().subscribe({ error: () => undefined });
  }

  markGuideRead(guide: GuideId): Observable<void> {
    return this.api.markGuideRead(guide);
  }
}
