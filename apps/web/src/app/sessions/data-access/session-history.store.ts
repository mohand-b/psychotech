import {
  CurrentSessionDto,
  SessionHistoryItemDto,
  SessionHistoryPageDto,
} from '@psychotech/shared';
import {
  patchState,
  signalStore,
  withMethods,
  withState,
} from '@ngrx/signals';
import { SessionHistoryFilter } from './session-history.filter';

interface SessionHistoryState {
  items: SessionHistoryItemDto[];
  nextCursor: string | null;
  filter: SessionHistoryFilter;
  loading: boolean;
  loadingMore: boolean;
  current: CurrentSessionDto | null;
}

const initialState: SessionHistoryState = {
  items: [],
  nextCursor: null,
  filter: 'ALL',
  loading: false,
  loadingMore: false,
  current: null,
};

export const SessionHistoryStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store) => ({
    startLoading(filter: SessionHistoryFilter): void {
      patchState(store, {
        filter,
        items: [],
        nextCursor: null,
        loading: true,
      });
    },
    setPage(page: SessionHistoryPageDto): void {
      patchState(store, {
        items: page.items,
        nextCursor: page.nextCursor,
        loading: false,
      });
    },
    startLoadingMore(): void {
      patchState(store, { loadingMore: true });
    },
    appendPage(page: SessionHistoryPageDto): void {
      patchState(store, {
        items: [...store.items(), ...page.items],
        nextCursor: page.nextCursor,
        loadingMore: false,
      });
    },
    setCurrent(current: CurrentSessionDto | null): void {
      patchState(store, { current });
    },
  })),
);
