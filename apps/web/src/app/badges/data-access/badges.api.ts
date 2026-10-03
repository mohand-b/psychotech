import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BadgeId, EarnedBadgeDto, GuideId } from '@psychotech/shared';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/http/api-base-url.token';

@Injectable({ providedIn: 'root' })
export class BadgesApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  fetchUnacknowledgedBadges(): Observable<EarnedBadgeDto[]> {
    return this.http.get<EarnedBadgeDto[]>(
      `${this.baseUrl}/me/badges/unacknowledged`,
    );
  }

  acknowledgeBadge(badgeId: BadgeId): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/me/badges/${badgeId}/acknowledge`,
      null,
    );
  }

  notifyTutorialDiscovered(): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/me/badges/tutorial-discovered`,
      null,
    );
  }

  markGuideRead(guide: GuideId): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/me/badges/guides/${guide}/read`,
      null,
    );
  }
}
