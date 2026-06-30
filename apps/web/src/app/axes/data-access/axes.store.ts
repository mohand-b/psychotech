import { AxisBestDto } from '@psychotech/shared';
import {
  patchState,
  signalStore,
  withMethods,
  withState,
} from '@ngrx/signals';

interface AxesStoreState {
  bestScores: AxisBestDto[] | null;
}

const initialState: AxesStoreState = {
  bestScores: null,
};

export const AxesStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store) => ({
    setBestScores(bestScores: AxisBestDto[] | null): void {
      patchState(store, { bestScores });
    },
  })),
);
