import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  BillingConfigDto,
  EnergyPackId,
  PackCheckoutRequestDto,
  PackCheckoutSessionDto,
  PackCheckoutStatusDto,
} from '@psychotech/shared';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/http/api-base-url.token';

@Injectable({ providedIn: 'root' })
export class BillingApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  config(): Observable<BillingConfigDto> {
    return this.http.get<BillingConfigDto>(`${this.baseUrl}/billing/config`);
  }

  createPackCheckout(
    packId: EnergyPackId,
  ): Observable<PackCheckoutSessionDto> {
    const body: PackCheckoutRequestDto = { packId };
    return this.http.post<PackCheckoutSessionDto>(
      `${this.baseUrl}/billing/pack-checkout`,
      body,
    );
  }

  checkoutStatus(sessionId: string): Observable<PackCheckoutStatusDto> {
    return this.http.get<PackCheckoutStatusDto>(
      `${this.baseUrl}/billing/pack-checkout/${sessionId}`,
    );
  }
}
