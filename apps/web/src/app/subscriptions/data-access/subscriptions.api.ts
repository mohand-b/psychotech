import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  BillingRedirectDto,
  CreateCheckoutSessionDto,
  PaidTier,
} from '@psychotech/shared';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/http/api-base-url.token';

@Injectable({ providedIn: 'root' })
export class SubscriptionsApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  createCheckoutSession(plan: PaidTier): Observable<BillingRedirectDto> {
    const body: CreateCheckoutSessionDto = { plan };
    return this.http.post<BillingRedirectDto>(
      `${this.baseUrl}/billing/checkout`,
      body,
    );
  }

  createPortalSession(): Observable<BillingRedirectDto> {
    return this.http.post<BillingRedirectDto>(
      `${this.baseUrl}/billing/portal`,
      {},
    );
  }
}
