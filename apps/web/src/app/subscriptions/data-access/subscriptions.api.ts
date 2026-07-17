import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  BillingConfigDto,
  BillingRedirectDto,
  ChangeSubscriptionPlanDto,
  CreateSubscriptionDto,
  PaidTier,
  PromotionCodeDto,
  SubscriptionDto,
  SubscriptionPaymentDto,
} from '@psychotech/shared';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/http/api-base-url.token';

@Injectable({ providedIn: 'root' })
export class SubscriptionsApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  getBillingConfig(): Observable<BillingConfigDto> {
    return this.http.get<BillingConfigDto>(`${this.baseUrl}/billing/config`);
  }

  createSubscription(
    plan: PaidTier,
    promotionCode?: string,
  ): Observable<SubscriptionPaymentDto> {
    const body: CreateSubscriptionDto = { plan, promotionCode };
    return this.http.post<SubscriptionPaymentDto>(
      `${this.baseUrl}/billing/subscription`,
      body,
    );
  }

  changeSubscriptionPlan(plan: PaidTier): Observable<SubscriptionDto> {
    const body: ChangeSubscriptionPlanDto = { plan };
    return this.http.post<SubscriptionDto>(
      `${this.baseUrl}/billing/subscription/change`,
      body,
    );
  }

  createPortalSession(): Observable<BillingRedirectDto> {
    return this.http.post<BillingRedirectDto>(
      `${this.baseUrl}/billing/portal`,
      {},
    );
  }

  getPromotionCode(code: string): Observable<PromotionCodeDto> {
    return this.http.get<PromotionCodeDto>(
      `${this.baseUrl}/billing/promotion-codes/${encodeURIComponent(code)}`,
    );
  }
}
