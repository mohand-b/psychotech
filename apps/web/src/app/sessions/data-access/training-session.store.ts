import { SessionDto } from '@psychotech/shared';
import {
  patchState,
  signalStore,
  withMethods,
  withState,
} from '@ngrx/signals';

interface TrainingSessionState {
  session: SessionDto | null;
  nowMs: number;
}

const initialState: TrainingSessionState = {
  session: null,
  nowMs: 0,
};

export const TrainingSessionStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store) => ({
    setSession(session: SessionDto | null): void {
      patchState(store, { session, nowMs: Date.now() });
    },
    tick(nowMs: number): void {
      patchState(store, { nowMs });
    },
  })),
);
