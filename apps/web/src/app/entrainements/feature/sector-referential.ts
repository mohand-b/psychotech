import { Signal, effect, inject } from '@angular/core';
import { Sector, SectorReferentialDto } from '@psychotech/shared';
import { CatalogFacade } from '../../catalog/data-access/catalog.facade';

export function sectorReferentialFor(
  sector: Signal<Sector | null>,
): Signal<SectorReferentialDto | null> {
  const catalogFacade = inject(CatalogFacade);
  effect(() => {
    const code = sector();
    if (code) {
      catalogFacade.loadSectorReferential(code);
    }
  });
  return catalogFacade.sectorReferential;
}
