import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { EnergyStateDto } from '@psychotech/shared';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/http/api-base-url.token';

@Injectable({ providedIn: 'root' })
export class EnergyApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  state(): Observable<EnergyStateDto> {
    return this.http.get<EnergyStateDto>(`${this.baseUrl}/me/energy`);
  }
}
