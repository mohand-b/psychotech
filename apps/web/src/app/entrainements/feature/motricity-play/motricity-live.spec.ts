import { MotricityCursorZone } from '@psychotech/shared';
import {
  MotricityLiveState,
  advanceMotricityLive,
  createMotricityLiveState,
  liveMajorErrors,
} from './motricity-live';

const FRAME_MS = 1000 / 60;

function play(
  state: MotricityLiveState,
  zone: MotricityCursorZone,
  durationMs: number,
): MotricityLiveState {
  let current = state;
  for (let elapsed = 0; elapsed < durationMs; elapsed += FRAME_MS) {
    current = advanceMotricityLive(current, zone, FRAME_MS);
  }
  return current;
}

describe('advanceMotricityLive', () => {
  it('keeps the clock frozen and counts nothing while the cursor stays in the garage', () => {
    const state = play(createMotricityLiveState(), 'GARAGE', 5000);
    expect(state.started).toBe(false);
    expect(state.activeMs).toBe(0);
    expect(state.minorErrors).toBe(0);
    expect(liveMajorErrors(state)).toBe(0);
  });

  it('starts the clock when the cursor leaves the garage', () => {
    let state = play(createMotricityLiveState(), 'GARAGE', 2000);
    state = play(state, 'INSIDE', 1000);
    expect(state.started).toBe(true);
    expect(state.activeMs).toBeGreaterThan(900);
    expect(state.activeMs).toBeLessThan(1100);
  });

  it('counts one minor error per continuous contact episode', () => {
    let state = play(createMotricityLiveState(), 'INSIDE', 500);
    state = play(state, 'TOUCHING', 800);
    state = play(state, 'INSIDE', 500);
    state = play(state, 'TOUCHING', 300);
    state = play(state, 'INSIDE', 200);
    expect(state.minorErrors).toBe(2);
    expect(liveMajorErrors(state)).toBe(0);
  });

  it('accumulates major errors at one past the first second then one per extra full second', () => {
    let state = play(createMotricityLiveState(), 'INSIDE', 500);
    state = play(state, 'OUTSIDE', 900);
    expect(liveMajorErrors(state)).toBe(0);
    state = play(state, 'OUTSIDE', 200);
    expect(liveMajorErrors(state)).toBe(1);
    state = play(state, 'OUTSIDE', 1000);
    expect(liveMajorErrors(state)).toBe(2);
    state = play(state, 'OUTSIDE', 1000);
    expect(liveMajorErrors(state)).toBe(3);
    state = play(state, 'INSIDE', 200);
    expect(state.closedMajorErrors).toBe(3);
    expect(state.minorErrors).toBe(1);
  });
});
