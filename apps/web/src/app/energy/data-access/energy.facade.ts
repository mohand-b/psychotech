import { Injectable, Signal, inject } from '@angular/core';
import { EnergyStateDto } from '@psychotech/shared';
import { Observable, tap } from 'rxjs';
import { EnergyApi } from './energy.api';
import { EnergyStore } from './energy.store';

@Injectable({ providedIn: 'root' })
export class EnergyFacade {
  private readonly api = inject(EnergyApi);
  private readonly store = inject(EnergyStore);

  readonly state: Signal<EnergyStateDto | null> = this.store.energy;

  load(): Observable<EnergyStateDto> {
    return this.api.state().pipe(tap((energy) => this.store.setEnergy(energy)));
  }

  clear(): void {
    this.store.setEnergy(null);
  }
}
