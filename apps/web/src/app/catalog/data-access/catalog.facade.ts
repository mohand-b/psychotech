import { isPlatformServer } from '@angular/common';
import { Injectable, PLATFORM_ID, Signal, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
  Sector,
  SectorReferentialDto,
  SectorSummaryDto,
} from '@psychotech/shared';
import { CatalogApi } from './catalog.api';

@Injectable({ providedIn: 'root' })
export class CatalogFacade {
  private readonly api = inject(CatalogApi);
  private readonly isServer = isPlatformServer(inject(PLATFORM_ID));

  private readonly referentialSector = signal<Sector | undefined>(undefined);

  private readonly sectorsResource = rxResource({
    params: () => (this.isServer ? undefined : true),
    stream: () => this.api.fetchSectors(),
    defaultValue: [],
  });

  private readonly referentialResource = rxResource<
    SectorReferentialDto | null,
    Sector | undefined
  >({
    params: () => this.referentialSector(),
    stream: ({ params: code }) => this.api.fetchSectorReferential(code),
    defaultValue: null,
  });

  readonly sectors: Signal<SectorSummaryDto[]> = this.sectorsResource.value;
  readonly sectorsError: Signal<unknown> = this.sectorsResource.error;

  readonly sectorReferential: Signal<SectorReferentialDto | null> =
    this.referentialResource.value;

  loadSectorReferential(code: Sector): void {
    this.referentialSector.set(code);
  }
}
