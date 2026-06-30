import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  Sector,
  SectorReferentialDto,
  SectorSummaryDto,
} from '@psychotech/shared';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/http/api-base-url.token';

@Injectable({ providedIn: 'root' })
export class CatalogApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  sectors(): Observable<SectorSummaryDto[]> {
    return this.http.get<SectorSummaryDto[]>(`${this.baseUrl}/catalog/sectors`);
  }

  sector(code: Sector): Observable<SectorReferentialDto> {
    return this.http.get<SectorReferentialDto>(
      `${this.baseUrl}/catalog/sectors/${code}`,
    );
  }
}
