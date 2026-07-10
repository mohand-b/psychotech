import { TestBed } from '@angular/core/testing';
import { countdownFrom } from './session-countdown';
import { TrainingSessionStore } from './training-session.store';

describe('TrainingSessionStore.rebaseAnchor', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('re-anchors the clock so the countdown consumes no axis time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    const store = TestBed.inject(TrainingSessionStore);
    store.setSession(null);
    vi.setSystemTime(1_003_000);
    store.tick(Date.now());
    expect(
      countdownFrom(store.anchorMs(), store.nowMs(), 600).remainingSec,
    ).toBe(597);
    store.rebaseAnchor();
    expect(
      countdownFrom(store.anchorMs(), store.nowMs(), 600).remainingSec,
    ).toBe(600);
  });
});
