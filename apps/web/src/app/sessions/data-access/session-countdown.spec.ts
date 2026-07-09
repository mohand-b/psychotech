import { countdownFrom } from './session-countdown';

describe('countdownFrom', () => {
  it('grants the full timer at the anchor instant, whatever happened before', () => {
    const anchorMs = 1_800_000_000_000;
    expect(countdownFrom(anchorMs, anchorMs, 180)).toEqual({
      remainingSec: 180,
      fraction: 1,
    });
  });

  it('re-anchoring after a long absence restores the full timer', () => {
    const resumedAtMs = 1_800_000_500_000;
    const countdown = countdownFrom(resumedAtMs, resumedAtMs + 1000, 600);
    expect(countdown.remainingSec).toBe(599);
    expect(countdown.fraction).toBeCloseTo(1 - 1 / 600);
  });

  it('only counts time elapsed since the anchor and clamps at zero', () => {
    const anchorMs = 0;
    expect(countdownFrom(anchorMs, 30_000, 180).remainingSec).toBe(150);
    expect(countdownFrom(anchorMs, 500_000, 180)).toEqual({
      remainingSec: 0,
      fraction: 0,
    });
  });
});
