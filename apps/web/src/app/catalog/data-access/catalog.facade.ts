import { Injectable, inject } from '@angular/core';
import { SectorSummaryDto } from '@psychotech/shared';
import { Observable, map } from 'rxjs';
import { CatalogApi } from './catalog.api';

@Injectable({ providedIn: 'root' })
export class CatalogFacade {
  private readonly api = inject(CatalogApi);

  getActiveSectors(): Observable<SectorSummaryDto[]> {
    return this.api
      .sectors()
      .pipe(map((sectors) => sectors.filter((sector) => sector.isActive)));
  }
}
