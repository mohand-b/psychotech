import { Injectable, inject } from '@angular/core';
import {
  BillingConfigDto,
  ChangePlanPreviewDto,
  PaidTier,
  PaymentMethodOverviewDto,
  PromotionCodeDto,
  SubscriptionPaymentDto,
  SubscriptionTier,
} from '@psychotech/shared';
import { Observable, map, switchMap } from 'rxjs';
import { AuthFacade } from '../../auth/data-access/auth.facade';
import { SubscriptionsApi } from './subscriptions.api';

@Injectable({ providedIn: 'root' })
export class SubscriptionsFacade {
  private readonly api = inject(SubscriptionsApi);
  private readonly authFacade = inject(AuthFacade);

  getBillingConfig(): Observable<BillingConfigDto> {
    return this.api.getBillingConfig();
  }

  createSubscription(
    plan: PaidTier,
    promotionCode?: string,
  ): Observable<SubscriptionPaymentDto> {
    return this.api.createSubscription(plan, promotionCode);
  }

  previewPlanChange(plan: PaidTier): Observable<ChangePlanPreviewDto> {
    return this.api.previewPlanChange(plan);
  }

  changePlan(plan: PaidTier): Observable<SubscriptionTier> {
    return this.api
      .changeSubscriptionPlan(plan)
      .pipe(switchMap(() => this.refreshTier()));
  }

  cancelSubscription(): Observable<void> {
    return this.api.cancelSubscription().pipe(
      switchMap(() => this.refreshTier()),
      map(() => undefined),
    );
  }

  resumeSubscription(): Observable<void> {
    return this.api.resumeSubscription().pipe(
      switchMap(() => this.refreshTier()),
      map(() => undefined),
    );
  }

  getPaymentMethodOverview(): Observable<PaymentMethodOverviewDto> {
    return this.api.getPaymentMethodOverview();
  }

  createPaymentMethodSetup(): Observable<SubscriptionPaymentDto> {
    return this.api.createPaymentMethodSetup();
  }

  validatePromotionCode(code: string): Observable<PromotionCodeDto> {
    return this.api.getPromotionCode(code);
  }

  refreshTier(): Observable<SubscriptionTier> {
    return this.authFacade
      .loadCurrentUser()
      .pipe(map((user) => user?.tier ?? SubscriptionTier.FREE));
  }
}
