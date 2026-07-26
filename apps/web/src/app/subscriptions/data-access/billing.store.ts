import { BillingOverviewDto } from '@psychotech/shared';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';

interface BillingState {
  overview: BillingOverviewDto | null;
  loading: boolean;
}

const initialState: BillingState = {
  overview: null,
  loading: false,
};

export const BillingStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store) => ({
    setOverview(overview: BillingOverviewDto | null): void {
      patchState(store, { overview, loading: false });
    },
    setLoading(loading: boolean): void {
      patchState(store, { loading });
    },
  })),
);
