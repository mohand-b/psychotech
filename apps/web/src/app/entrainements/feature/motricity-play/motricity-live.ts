import {
  MotricityCursorZone,
  majorErrorsForExitDuration,
} from '@psychotech/shared';

export interface MotricityLiveState {
  started: boolean;
  activeMs: number;
  minorErrors: number;
  closedMajorErrors: number;
  outsideSinceMs: number | null;
  inErrorEpisode: boolean;
}

export function createMotricityLiveState(): MotricityLiveState {
  return {
    started: false,
    activeMs: 0,
    minorErrors: 0,
    closedMajorErrors: 0,
    outsideSinceMs: null,
    inErrorEpisode: false,
  };
}

function isSafeZone(zone: MotricityCursorZone): boolean {
  return zone === 'GARAGE' || zone === 'END' || zone === 'INSIDE';
}

export function advanceMotricityLive(
  state: MotricityLiveState,
  zone: MotricityCursorZone,
  deltaMs: number,
): MotricityLiveState {
  if (!state.started) {
    if (zone === 'GARAGE') {
      return state;
    }
    return { ...createMotricityLiveState(), started: true };
  }
  const next: MotricityLiveState = {
    ...state,
    activeMs: state.activeMs + deltaMs,
  };
  if (isSafeZone(zone)) {
    if (next.outsideSinceMs !== null) {
      next.closedMajorErrors += majorErrorsForExitDuration(
        next.activeMs - next.outsideSinceMs,
      );
      next.outsideSinceMs = null;
    }
    next.inErrorEpisode = false;
    return next;
  }
  if (!next.inErrorEpisode) {
    next.inErrorEpisode = true;
    next.minorErrors += 1;
  }
  if (zone === 'OUTSIDE') {
    if (next.outsideSinceMs === null) {
      next.outsideSinceMs = next.activeMs;
    }
  } else if (next.outsideSinceMs !== null) {
    next.closedMajorErrors += majorErrorsForExitDuration(
      next.activeMs - next.outsideSinceMs,
    );
    next.outsideSinceMs = null;
  }
  return next;
}

export function liveMajorErrors(state: MotricityLiveState): number {
  if (state.outsideSinceMs === null) {
    return state.closedMajorErrors;
  }
  return (
    state.closedMajorErrors +
    majorErrorsForExitDuration(state.activeMs - state.outsideSinceMs)
  );
}
