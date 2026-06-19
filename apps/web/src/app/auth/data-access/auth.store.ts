import { computed } from '@angular/core';
import { UserProfileDto } from '@psychotech/shared';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';

interface AuthState {
  currentUser: UserProfileDto | null;
}

const initialState: AuthState = {
  currentUser: null,
};

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ currentUser }) => ({
    isAuthenticated: computed(() => currentUser() !== null),
  })),
  withMethods((store) => ({
    setCurrentUser(currentUser: UserProfileDto | null): void {
      patchState(store, { currentUser });
    },
  })),
);
