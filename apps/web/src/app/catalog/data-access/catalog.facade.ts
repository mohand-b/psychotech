import { Injectable, inject } from '@angular/core';
import { SectorSummaryDto } from '@psychotech/shared';
import { Observable } from 'rxjs';
import { CatalogApi } from './catalog.api';

@Injectable({ providedIn: 'root' })
export class CatalogFacade {
  private readonly api = inject(CatalogApi);

  getSectors(): Observable<SectorSummaryDto[]> {
    return this.api.sectors();
  }
}
