import { Injectable, inject } from '@angular/core';
import {
  BillingRedirectDto,
  PaidTier,
  PromotionCodeDto,
  SubscriptionTier,
} from '@psychotech/shared';
import { Observable, map } from 'rxjs';
import { AuthFacade } from '../../auth/data-access/auth.facade';
import { SubscriptionsApi } from './subscriptions.api';

@Injectable({ providedIn: 'root' })
export class SubscriptionsFacade {
  private readonly api = inject(SubscriptionsApi);
  private readonly authFacade = inject(AuthFacade);

  startCheckout(
    plan: PaidTier,
    promotionCode?: string,
  ): Observable<BillingRedirectDto> {
    return this.api.createCheckoutSession(plan, promotionCode);
  }

  openPortal(): Observable<BillingRedirectDto> {
    return this.api.createPortalSession();
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
