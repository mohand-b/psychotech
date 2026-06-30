import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { AxisBestDto } from '@psychotech/shared';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/http/api-base-url.token';

@Injectable({ providedIn: 'root' })
export class AxesApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  bestScores(): Observable<AxisBestDto[]> {
    return this.http.get<AxisBestDto[]>(`${this.baseUrl}/me/axes/best`);
  }
}
