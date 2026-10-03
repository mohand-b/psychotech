import { httpResource } from '@angular/common/http';
import { Injectable, Signal, inject } from '@angular/core';
import { BadgeFeedDto, BadgeStatusDto, GuideId } from '@psychotech/shared';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/http/api-base-url.token';
import { readResourceValueOr } from '../../shared/util/resource-value';
import { BadgesApi } from './badges.api';

const EMPTY_BADGE_FEED: BadgeFeedDto = { visible: false, entries: [] };

@Injectable({ providedIn: 'root' })
export class BadgesFacade {
  private readonly api = inject(BadgesApi);
  private readonly baseUrl = inject(API_BASE_URL);

  private tutorialNotified = false;

  fetchStatuses(): Signal<BadgeStatusDto[] | null> {
    return readResourceValueOr(
      httpResource<BadgeStatusDto[] | null>(() => `${this.baseUrl}/me/badges`, {
        defaultValue: null,
      }),
      null,
    );
  }

  fetchFeed(): Signal<BadgeFeedDto> {
    return readResourceValueOr(
      httpResource<BadgeFeedDto>(() => `${this.baseUrl}/me/badges/feed`, {
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
