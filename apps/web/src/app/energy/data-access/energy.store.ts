import { EnergyStateDto } from '@psychotech/shared';
import {
  patchState,
  signalStore,
  withMethods,
  withState,
} from '@ngrx/signals';

interface EnergyStoreState {
  energy: EnergyStateDto | null;
}

const initialState: EnergyStoreState = {
  energy: null,
};

export const EnergyStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store) => ({
    setEnergy(energy: EnergyStateDto | null): void {
      patchState(store, { energy });
    },
  })),
);
