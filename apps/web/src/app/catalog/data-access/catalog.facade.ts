import { httpResource } from '@angular/common/http';
import { Injectable, Signal, inject, signal } from '@angular/core';
import {
  Sector,
  SectorReferentialDto,
  SectorSummaryDto,
} from '@psychotech/shared';
import { API_BASE_URL } from '../../core/http/api-base-url.token';

@Injectable({ providedIn: 'root' })
export class CatalogFacade {
  private readonly baseUrl = inject(API_BASE_URL);

  private readonly referentialSector = signal<Sector | null>(null);

  private readonly sectorsResource = httpResource<SectorSummaryDto[]>(
    () => `${this.baseUrl}/catalog/sectors`,
    { defaultValue: [] },
  );

  private readonly referentialResource =
    httpResource<SectorReferentialDto | null>(
      () => {
        const code = this.referentialSector();
        return code ? `${this.baseUrl}/catalog/sectors/${code}` : undefined;
      },
      { defaultValue: null },
    );

  readonly sectors: Signal<SectorSummaryDto[]> = this.sectorsResource.value;
  readonly sectorsError: Signal<unknown> = this.sectorsResource.error;

  readonly sectorReferential: Signal<SectorReferentialDto | null> =
    this.referentialResource.value;

  loadSectorReferential(code: Sector): void {
    this.referentialSector.set(code);
  }
}
