import { isPlatformServer } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Injectable, PLATFORM_ID, Signal, inject, signal } from '@angular/core';
import {
  Sector,
  SectorReferentialDto,
  SectorSummaryDto,
} from '@psychotech/shared';
import { API_BASE_URL } from '../../core/http/api-base-url.token';

@Injectable({ providedIn: 'root' })
export class CatalogFacade {
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly isServer = isPlatformServer(inject(PLATFORM_ID));

  private readonly referentialSector = signal<Sector | null>(null);

  private readonly sectorsResource = httpResource<SectorSummaryDto[]>(
    () => (this.isServer ? undefined : `${this.baseUrl}/catalog/sectors`),
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
