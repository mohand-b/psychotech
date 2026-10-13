import {
  ErrorHandler,
  Injectable,
  Signal,
  computed,
  effect,
  inject,
  untracked,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
  EnergyStateDto,
  GiftCodeRedemptionDto,
  PackPurchaseDto,
} from '@psychotech/shared';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { AuthFacade } from '../../auth/data-access/auth.facade';
import { BillingApi } from './billing.api';
import { EnergyApi } from './energy.api';
import { EnergyStore } from './energy.store';

@Injectable({ providedIn: 'root' })
export class EnergyFacade {
  private readonly api = inject(EnergyApi);
  private readonly billingApi = inject(BillingApi);
  private readonly store = inject(EnergyStore);
  private readonly authFacade = inject(AuthFacade);
  private readonly errorHandler = inject(ErrorHandler);

  private readonly currentUserId = computed(
    () => this.authFacade.currentUser()?.id ?? null,
  );

  readonly state: Signal<EnergyStateDto | null> = this.store.energy;

  constructor() {
    effect(() => {
      const userId = this.currentUserId();
      untracked(() => {
        if (userId === null) {
          this.store.setEnergy(null);
          return;
        }
        this.reloadEnergyBalance();
      });
    });
  }

  loadEnergyBalance(): Observable<EnergyStateDto> {
    return this.api
      .fetchEnergyBalance()
      .pipe(tap((energy) => this.store.setEnergy(energy)));
  }

  reloadEnergyBalance(): void {
    this.loadEnergyBalance().subscribe({ error: () => undefined });
  }

  loadEnergyBalanceSafely(): Observable<void> {
    return this.loadEnergyBalance().pipe(
      map(() => undefined),
      catchError((error: unknown) => {
        this.errorHandler.handleError(error);
        return of(undefined);
      }),
    );
  }

  fetchPurchases(): Signal<PackPurchaseDto[] | null> {
    return rxResource<PackPurchaseDto[] | null, void>({
      stream: () => this.billingApi.fetchPurchases(),
      defaultValue: null,
    }).value.asReadonly();
  }

  redeemGiftCode(code: string): Observable<GiftCodeRedemptionDto> {
    return this.api
      .redeemGiftCode(code)
      .pipe(tap(() => this.reloadEnergyBalance()));
  }

  clearEnergyBalance(): void {
    this.store.setEnergy(null);
  }
}
