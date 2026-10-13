import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ProgressionDto } from '@psychotech/shared';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/http/api-base-url.token';

@Injectable({ providedIn: 'root' })
export class ProgressionApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  fetchProgression(): Observable<ProgressionDto> {
    return this.http.get<ProgressionDto>(`${this.baseUrl}/me/progression`);
  }
}
