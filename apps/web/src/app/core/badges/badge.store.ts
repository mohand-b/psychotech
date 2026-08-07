import { computed } from '@angular/core';
import { BadgeId, EarnedBadgeDto } from '@psychotech/shared';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';

export type BadgeCelebrationPhase =
  | 'idle'
  | 'awaitingScene'
  | 'celebrating'
  | 'done';

interface BadgeCelebrationState {
  queue: EarnedBadgeDto[];
  currentIndex: number;
  phase: BadgeCelebrationPhase;
  sceneHolds: string[];
  celebratedIds: BadgeId[];
}

const initialState: BadgeCelebrationState = {
  queue: [],
  currentIndex: 0,
  phase: 'idle',
  sceneHolds: [],
  celebratedIds: [],
};

function advanced(
  state: BadgeCelebrationState,
): Partial<BadgeCelebrationState> {
  if (
    state.phase === 'awaitingScene' &&
    state.sceneHolds.length === 0 &&
    state.queue.length > 0
  ) {
    return { phase: 'celebrating' };
  }
  return {};
}

export const BadgeStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    current: computed(() =>
      store.phase() === 'celebrating'
        ? (store.queue()[store.currentIndex()] ?? null)
        : null,
    ),
    position: computed(() => store.currentIndex() + 1),
    total: computed(() => store.queue().length),
    isLast: computed(
      () => store.currentIndex() === store.queue().length - 1,
    ),
  })),
  withMethods((store) => ({
    enqueue(badges: EarnedBadgeDto[]): void {
      const known = new Set([
        ...store.queue().map((badge) => badge.badgeId),
        ...store.celebratedIds(),
      ]);
      const fresh = badges.filter((badge) => !known.has(badge.badgeId));
      if (fresh.length === 0) {
        return;
      }
      const restarting = store.phase() === 'idle' || store.phase() === 'done';
      const state = {
        queue: restarting ? fresh : [...store.queue(), ...fresh],
        currentIndex: restarting ? 0 : store.currentIndex(),
        phase: restarting ? ('awaitingScene' as const) : store.phase(),
        sceneHolds: store.sceneHolds(),
        celebratedIds: store.celebratedIds(),
      };
      patchState(store, { ...state, ...advanced(state) });
    },
    replay(badges: EarnedBadgeDto[]): void {
      if (badges.length === 0 || store.phase() === 'celebrating') {
        return;
      }
      const state = {
        queue: [...badges],
        currentIndex: 0,
        phase: 'awaitingScene' as const,
        sceneHolds: store.sceneHolds(),
        celebratedIds: store.celebratedIds(),
      };
      patchState(store, { ...state, ...advanced(state) });
    },
    placeHold(reason: string): void {
      if (store.sceneHolds().includes(reason)) {
        return;
      }
      patchState(store, { sceneHolds: [...store.sceneHolds(), reason] });
    },
    releaseHold(reason: string): void {
      if (!store.sceneHolds().includes(reason)) {
        return;
      }
      const state = {
        queue: store.queue(),
        currentIndex: store.currentIndex(),
        phase: store.phase(),
        sceneHolds: store.sceneHolds().filter((held) => held !== reason),
        celebratedIds: store.celebratedIds(),
      };
      patchState(store, { ...state, ...advanced(state) });
    },
    completeCurrent(): EarnedBadgeDto | null {
      if (store.phase() !== 'celebrating') {
        return null;
      }
      const completed = store.queue()[store.currentIndex()] ?? null;
      if (!completed) {
        patchState(store, { phase: 'idle', queue: [], currentIndex: 0 });
        return null;
      }
      const celebratedIds = store.celebratedIds().includes(completed.badgeId)
        ? store.celebratedIds()
        : [...store.celebratedIds(), completed.badgeId];
      if (store.currentIndex() + 1 < store.queue().length) {
        patchState(store, {
          currentIndex: store.currentIndex() + 1,
          celebratedIds,
        });
      } else {
        patchState(store, {
          phase: 'done',
          queue: [],
          currentIndex: 0,
          celebratedIds,
        });
      }
      return completed;
    },
    dismissAll(): EarnedBadgeDto[] {
      if (store.phase() !== 'celebrating') {
        return [];
      }
      const remaining = store.queue().slice(store.currentIndex());
      const celebratedIds = [
        ...store.celebratedIds(),
        ...remaining
          .map((badge) => badge.badgeId)
          .filter((badgeId) => !store.celebratedIds().includes(badgeId)),
      ];
      patchState(store, {
        phase: 'done',
        queue: [],
        currentIndex: 0,
        celebratedIds,
      });
      return remaining;
    },
  })),
);
