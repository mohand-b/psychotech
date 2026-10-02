import { httpResource } from '@angular/common/http';
import {
  ErrorHandler,
  Injectable,
  Signal,
  computed,
  effect,
  inject,
  untracked,
} from '@angular/core';
import {
  EnergyStateDto,
  GiftCodeRedemptionDto,
  PackPurchaseDto,
} from '@psychotech/shared';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { AuthFacade } from '../../auth/data-access/auth.facade';
import { API_BASE_URL } from '../../core/http/api-base-url.token';
import { EnergyApi } from './energy.api';
import { EnergyStore } from './energy.store';

@Injectable({ providedIn: 'root' })
export class EnergyFacade {
  private readonly api = inject(EnergyApi);
  private readonly store = inject(EnergyStore);
  private readonly authFacade = inject(AuthFacade);
  private readonly errorHandler = inject(ErrorHandler);
  private readonly baseUrl = inject(API_BASE_URL);

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
        this.reload();
      });
    });
  }

  load(): Observable<EnergyStateDto> {
    return this.api.state().pipe(tap((energy) => this.store.setEnergy(energy)));
  }

  reload(): void {
    this.load().subscribe({ error: () => undefined });
  }

  refresh(): Observable<void> {
    return this.load().pipe(
      map(() => undefined),
      catchError((error: unknown) => {
        this.errorHandler.handleError(error);
        return of(undefined);
      }),
    );
  }

  fetchPurchases(): Signal<PackPurchaseDto[] | null> {
    return httpResource<PackPurchaseDto[] | null>(
      () => `${this.baseUrl}/billing/purchases`,
      { defaultValue: null },
    ).value.asReadonly();
  }

  redeemGiftCode(code: string): Observable<GiftCodeRedemptionDto> {
    return this.api.redeemGiftCode(code).pipe(tap(() => this.reload()));
  }

  clear(): void {
    this.store.setEnergy(null);
  }
}
