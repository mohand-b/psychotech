import { Injectable, Signal, inject } from '@angular/core';
import {
  BillingConfigDto,
  BillingInvoiceDto,
  BillingOverviewDto,
  ChangePlanPreviewDto,
  PaidTier,
  PaymentMethodOverviewDto,
  PromotionCodeDto,
  SubscriptionPaymentDto,
  SubscriptionTier,
} from '@psychotech/shared';
import { Observable, map, of, switchMap, tap } from 'rxjs';
import { AuthFacade } from '../../auth/data-access/auth.facade';
import { BillingStore } from './billing.store';
import { SubscriptionsApi } from './subscriptions.api';

@Injectable({ providedIn: 'root' })
export class SubscriptionsFacade {
  private readonly api = inject(SubscriptionsApi);
  private readonly authFacade = inject(AuthFacade);
  private readonly billingStore = inject(BillingStore);

  readonly billingOverview: Signal<BillingOverviewDto | null> =
    this.billingStore.overview;
  readonly billingLoading: Signal<boolean> = this.billingStore.loading;

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

  cancelPlanChange(): Observable<void> {
    return this.api.cancelPlanChange().pipe(
      switchMap(() => this.refreshBilling()),
      map(() => undefined),
    );
  }

  cancelSubscription(): Observable<void> {
    return this.api.cancelSubscription().pipe(
      switchMap(() => this.refreshBilling()),
      map(() => undefined),
    );
  }

  resumeSubscription(): Observable<void> {
    return this.api.resumeSubscription().pipe(
      switchMap(() => this.refreshBilling()),
      map(() => undefined),
    );
  }

  loadBillingOverview(reconcile = false): Observable<BillingOverviewDto> {
    this.billingStore.setLoading(true);
    return this.api.getBillingOverview(reconcile).pipe(
      switchMap((overview) =>
        reconcile
          ? this.authFacade.loadCurrentUser().pipe(map(() => overview))
          : of(overview),
      ),
      tap({
        next: (overview) => this.billingStore.setOverview(overview),
        error: () => this.billingStore.setLoading(false),
      }),
    );
  }

  getPaymentMethodOverview(): Observable<PaymentMethodOverviewDto> {
    return this.api.getPaymentMethodOverview();
  }

  listInvoices(): Observable<BillingInvoiceDto[]> {
    return this.api.listInvoices();
  }

  createPaymentMethodSetup(): Observable<SubscriptionPaymentDto> {
    return this.api.createPaymentMethodSetup();
  }

  createEnergyRefill(): Observable<void> {
    return this.api.createEnergyRefill();
  }

  getPromotionCode(code: string): Observable<PromotionCodeDto> {
    return this.api.getPromotionCode(code);
  }

  refreshTier(): Observable<SubscriptionTier> {
    return this.authFacade.loadCurrentUser().pipe(
      map((user) => {
        if (!user) {
          throw new Error(
            'Cannot refresh the tier without an authenticated user',
          );
        }
        return user.tier;
      }),
    );
  }

  private refreshBilling(): Observable<BillingOverviewDto> {
    return this.refreshTier().pipe(switchMap(() => this.loadBillingOverview()));
  }
}
