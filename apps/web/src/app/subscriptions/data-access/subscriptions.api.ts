import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  SubscriptionDto,
  SubscriptionTier,
  UpdateSubscriptionDto,
} from '@psychotech/shared';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/http/api-base-url.token';

@Injectable({ providedIn: 'root' })
export class SubscriptionsApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  updateTier(tier: SubscriptionTier): Observable<SubscriptionDto> {
    const body: UpdateSubscriptionDto = { tier };
    return this.http.patch<SubscriptionDto>(
      `${this.baseUrl}/me/subscription`,
      body,
    );
  }
}
