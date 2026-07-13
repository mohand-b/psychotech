import { SubscriptionTier } from '@psychotech/shared';
import {
  patchState,
  signalStore,
  withMethods,
  withState,
} from '@ngrx/signals';

interface CoreStoreState {
  tierOverride: SubscriptionTier | null;
}

const initialState: CoreStoreState = {
  tierOverride: null,
};

export const CoreStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store) => ({
    setTierOverride(tierOverride: SubscriptionTier | null): void {
      patchState(store, { tierOverride });
    },
  })),
);
