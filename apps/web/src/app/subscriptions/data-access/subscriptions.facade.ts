import { Injectable, inject } from '@angular/core';
import { SubscriptionDto, SubscriptionTier } from '@psychotech/shared';
import { Observable, map, switchMap } from 'rxjs';
import { EnergyFacade } from '../../energy/data-access/energy.facade';
import { SubscriptionsApi } from './subscriptions.api';

@Injectable({ providedIn: 'root' })
export class SubscriptionsFacade {
  private readonly api = inject(SubscriptionsApi);
  private readonly energyFacade = inject(EnergyFacade);

  choosePlan(tier: SubscriptionTier): Observable<SubscriptionDto> {
    return this.api
      .updateTier(tier)
      .pipe(
        switchMap((subscription) =>
          this.energyFacade.load().pipe(map(() => subscription)),
        ),
      );
  }
}
