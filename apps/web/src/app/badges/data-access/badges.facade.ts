import { httpResource } from '@angular/common/http';
import { Injectable, Signal, inject } from '@angular/core';
import { BadgeFeedDto, BadgeStatusDto, GuideId } from '@psychotech/shared';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/http/api-base-url.token';
import { BadgesApi } from './badges.api';

const EMPTY_BADGE_FEED: BadgeFeedDto = { visible: false, entries: [] };

@Injectable({ providedIn: 'root' })
export class BadgesFacade {
  private readonly api = inject(BadgesApi);
  private readonly baseUrl = inject(API_BASE_URL);

  private tutorialNotified = false;

  fetchStatuses(): Signal<BadgeStatusDto[] | null> {
    return httpResource<BadgeStatusDto[] | null>(
      () => `${this.baseUrl}/me/badges`,
      { defaultValue: null },
    ).value.asReadonly();
  }

  fetchFeed(): Signal<BadgeFeedDto> {
    return httpResource<BadgeFeedDto>(() => `${this.baseUrl}/me/badges/feed`, {
      defaultValue: EMPTY_BADGE_FEED,
    }).value.asReadonly();
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
