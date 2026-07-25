import {
  Injectable,
  Signal,
  computed,
  effect,
  inject,
  untracked,
} from '@angular/core';
import { EnergyStateDto } from '@psychotech/shared';
import { Observable, tap } from 'rxjs';
import { AuthFacade } from '../../auth/data-access/auth.facade';
import { EnergyApi } from './energy.api';
import { EnergyStore } from './energy.store';

@Injectable({ providedIn: 'root' })
export class EnergyFacade {
  private readonly api = inject(EnergyApi);
  private readonly store = inject(EnergyStore);
  private readonly authFacade = inject(AuthFacade);

  private readonly currentTier = computed(
    () => this.authFacade.currentUser()?.tier ?? null,
  );

  readonly state: Signal<EnergyStateDto | null> = this.store.energy;

  constructor() {
    effect(() => {
      const tier = this.currentTier();
      untracked(() => {
        if (tier === null) {
          this.store.setEnergy(null);
          return;
        }
        this.load().subscribe({ error: () => undefined });
      });
    });
  }

  load(): Observable<EnergyStateDto> {
    return this.api.state().pipe(tap((energy) => this.store.setEnergy(energy)));
  }

  clear(): void {
    this.store.setEnergy(null);
  }
}
