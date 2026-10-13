import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Sector, TrainingsOverviewDto } from '@psychotech/shared';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/http/api-base-url.token';

@Injectable({ providedIn: 'root' })
export class TrainingsApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  fetchTrainingsOverview(sector: Sector): Observable<TrainingsOverviewDto> {
    return this.http.get<TrainingsOverviewDto>(
      `${this.baseUrl}/me/trainings/overview`,
      { params: { sector } },
    );
  }
}
