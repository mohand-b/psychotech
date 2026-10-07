import { describe, expect, it } from 'vitest';
import {
  buildSparklinePoints,
  computeAxisProgressDelta,
  computeSparklineDomain,
} from './axis-row-metrics';

const GEOMETRY = { width: 140, top: 4, bottom: 24 };

describe('computeAxisProgressDelta', () => {
  it('compares the last session of the axis with its very first one', () => {
    expect(computeAxisProgressDelta(58, 72.4, 7)).toBe(14);
    expect(computeAxisProgressDelta(70, 61, 3)).toBe(-9);
  });

  it('needs two sessions on the axis and both scores', () => {
    expect(computeAxisProgressDelta(70, 70, 1)).toBeNull();
    expect(computeAxisProgressDelta(null, 70, 4)).toBeNull();
    expect(computeAxisProgressDelta(70, null, 4)).toBeNull();
  });
});

describe('computeSparklineDomain', () => {
  it('frames the sessions of the axis, not the whole score range', () => {
    const domain = computeSparklineDomain([70, 74]);

    expect(domain.min).toBeGreaterThan(60);
    expect(domain.max).toBeLessThan(80);
  });

  it('leaves a margin so the extremes never touch the edges', () => {
    const domain = computeSparklineDomain([70, 80]);

    expect(domain.min).toBeLessThan(70);
    expect(domain.max).toBeGreaterThan(80);
  });

  it('opens a readable window around a perfectly flat history', () => {
    const domain = computeSparklineDomain([64, 64, 64]);

    expect(domain.min).toBeLessThan(64);
    expect(domain.max).toBeGreaterThan(64);
  });
});

describe('buildSparklinePoints', () => {
  it('needs two sessions to draw a line', () => {
    expect(buildSparklinePoints([70], GEOMETRY)).toBeNull();
    expect(buildSparklinePoints([], GEOMETRY)).toBeNull();
  });

  it('spreads the sessions over the full width', () => {
    const points = buildSparklinePoints([70, 74], GEOMETRY)?.split(' ') ?? [];

    expect(points).toHaveLength(2);
    expect(points[0].startsWith('0,')).toBe(true);
    expect(points[1].startsWith('140,')).toBe(true);
  });

  it('turns a small real gap into a visible slope', () => {
    const heights = (buildSparklinePoints([70, 74], GEOMETRY) ?? '')
      .split(' ')
      .map((pair) => Number(pair.split(',')[1]));

    expect(heights[0] - heights[1]).toBeGreaterThan(10);
  });

  it('keeps a flat history flat and centred', () => {
    const heights = (buildSparklinePoints([64, 64, 64], GEOMETRY) ?? '')
      .split(' ')
      .map((pair) => Number(pair.split(',')[1]));

    expect(new Set(heights).size).toBe(1);
    expect(heights[0]).toBe((GEOMETRY.top + GEOMETRY.bottom) / 2);
  });

  it('gives the same shape to two axes that moved the same way', () => {
    const low = buildSparklinePoints([20, 24, 22], GEOMETRY);
    const high = buildSparklinePoints([80, 84, 82], GEOMETRY);

    expect(low).toBe(high);
  });
});
