import { describe, expect, it } from 'vitest';
import {
  CRANK_SPEED_GAIN_MAX,
  CRANK_SPEED_GAIN_MIN,
  crankSpeedGainTarget,
  smoothCrankSpeedGain,
} from './crank-speed-gain';

describe('crankSpeedGainTarget', () => {
  it('leaves a still crank at the neutral gain', () => {
    expect(crankSpeedGainTarget(0)).toBe(CRANK_SPEED_GAIN_MIN);
  });

  it('reaches the ceiling at full crank speed and never exceeds it', () => {
    expect(crankSpeedGainTarget(1)).toBe(CRANK_SPEED_GAIN_MAX);
    expect(crankSpeedGainTarget(4)).toBe(CRANK_SPEED_GAIN_MAX);
    expect(crankSpeedGainTarget(-4)).toBe(CRANK_SPEED_GAIN_MAX);
  });

  it('stays inside the bounds and grows monotonically', () => {
    let previous = CRANK_SPEED_GAIN_MIN;
    for (let step = 0; step <= 20; step += 1) {
      const gain = crankSpeedGainTarget(step / 20);
      expect(gain).toBeGreaterThanOrEqual(CRANK_SPEED_GAIN_MIN);
      expect(gain).toBeLessThanOrEqual(CRANK_SPEED_GAIN_MAX);
      expect(gain).toBeGreaterThanOrEqual(previous);
      previous = gain;
    }
  });

  it('barely moves near rest so slow cranking keeps pixel precision', () => {
    const range = CRANK_SPEED_GAIN_MAX - CRANK_SPEED_GAIN_MIN;
    expect(crankSpeedGainTarget(0.1) - CRANK_SPEED_GAIN_MIN).toBeLessThan(
      range * 0.05,
    );
  });
});

describe('smoothCrankSpeedGain', () => {
  it('never jumps straight to the target', () => {
    const first = smoothCrankSpeedGain(CRANK_SPEED_GAIN_MIN, 1);
    expect(first).toBeGreaterThan(CRANK_SPEED_GAIN_MIN);
    expect(first).toBeLessThan(CRANK_SPEED_GAIN_MAX);
  });

  it('converges to the ceiling when cranking stays fast', () => {
    let gain = CRANK_SPEED_GAIN_MIN;
    for (let frame = 0; frame < 120; frame += 1) {
      gain = smoothCrankSpeedGain(gain, 1);
    }
    expect(gain).toBeCloseTo(CRANK_SPEED_GAIN_MAX, 3);
  });

  it('falls back to neutral as soon as the crank slows down', () => {
    let gain = CRANK_SPEED_GAIN_MAX;
    for (let frame = 0; frame < 120; frame += 1) {
      gain = smoothCrankSpeedGain(gain, 0);
    }
    expect(gain).toBeCloseTo(CRANK_SPEED_GAIN_MIN, 3);
  });

  it('stays bounded whatever the input', () => {
    let gain = CRANK_SPEED_GAIN_MIN;
    for (const speed of [0, 3, -3, 0.2, 9, -0.5, 1, 0]) {
      gain = smoothCrankSpeedGain(gain, speed);
      expect(gain).toBeGreaterThanOrEqual(CRANK_SPEED_GAIN_MIN);
      expect(gain).toBeLessThanOrEqual(CRANK_SPEED_GAIN_MAX);
    }
  });

  it('gives a dropped frame the same gain as the frames it replaces', () => {
    const perFrameRad = 0.2;
    const frameSec = 1 / 60;
    const steady = perFrameRad / frameSec;
    const dropped = (perFrameRad * 3) / (frameSec * 3);
    expect(crankSpeedGainTarget(dropped / steady)).toBe(
      crankSpeedGainTarget(1),
    );
  });
});
