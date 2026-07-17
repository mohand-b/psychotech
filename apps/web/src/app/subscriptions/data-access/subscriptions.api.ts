import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  BillingConfigDto,
  ChangePlanPreviewDto,
  ChangeSubscriptionPlanDto,
  CreateSubscriptionDto,
  PaidTier,
  PaymentMethodOverviewDto,
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

  previewPlanChange(plan: PaidTier): Observable<ChangePlanPreviewDto> {
    const body: ChangeSubscriptionPlanDto = { plan };
    return this.http.post<ChangePlanPreviewDto>(
      `${this.baseUrl}/billing/subscription/change/preview`,
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

  cancelPlanChange(): Observable<SubscriptionDto> {
    return this.http.post<SubscriptionDto>(
      `${this.baseUrl}/billing/subscription/change/cancel`,
      {},
    );
  }

  cancelSubscription(): Observable<SubscriptionDto> {
    return this.http.post<SubscriptionDto>(
      `${this.baseUrl}/billing/subscription/cancel`,
      {},
    );
  }

  resumeSubscription(): Observable<SubscriptionDto> {
    return this.http.post<SubscriptionDto>(
      `${this.baseUrl}/billing/subscription/resume`,
      {},
    );
  }

  getPaymentMethodOverview(): Observable<PaymentMethodOverviewDto> {
    return this.http.get<PaymentMethodOverviewDto>(
      `${this.baseUrl}/billing/payment-method`,
    );
  }

  createPaymentMethodSetup(): Observable<SubscriptionPaymentDto> {
    return this.http.post<SubscriptionPaymentDto>(
      `${this.baseUrl}/billing/payment-method/intent`,
      {},
    );
  }

  getPromotionCode(code: string): Observable<PromotionCodeDto> {
    return this.http.get<PromotionCodeDto>(
      `${this.baseUrl}/billing/promotion-codes/${encodeURIComponent(code)}`,
    );
  }
}
