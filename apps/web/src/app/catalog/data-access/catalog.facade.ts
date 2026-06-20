import { Injectable, inject } from '@angular/core';
import {
  Sector,
  SectorReferentialDto,
  SectorSummaryDto,
} from '@psychotech/shared';
import { Observable } from 'rxjs';
import { CatalogApi } from './catalog.api';

@Injectable({ providedIn: 'root' })
export class CatalogFacade {
  private readonly api = inject(CatalogApi);

  getSectors(): Observable<SectorSummaryDto[]> {
    return this.api.sectors();
  }

  getSectorReferential(code: Sector): Observable<SectorReferentialDto> {
    return this.api.sector(code);
  }
}
