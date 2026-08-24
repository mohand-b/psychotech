import { AxisSparklinePointDto } from '@psychotech/shared';
import { describe, expect, it } from 'vitest';
import {
  axisScoresWithinWindow,
  sparklineDomain,
  sparklinePoints,
} from './axis-row-metrics';

const GEOMETRY = { width: 140, top: 4, bottom: 24 };
const NOW = new Date('2026-06-30T12:00:00Z');

function point(daysAgo: number, score: number): AxisSparklinePointDto {
  const date = new Date(NOW.getTime() - daysAgo * 86_400_000);
  return { date: date.toISOString(), score };
}

describe('axisScoresWithinWindow', () => {
  it('keeps the sessions of the last thirty days in chronological order', () => {
    const sparkline = [point(40, 10), point(29, 20), point(2, 30)];

    expect(axisScoresWithinWindow(sparkline, NOW)).toEqual([20, 30]);
  });

  it('drops everything when the axis was last played before the window', () => {
    expect(axisScoresWithinWindow([point(31, 80)], NOW)).toEqual([]);
  });
});

describe('sparklineDomain', () => {
  it('frames the sessions of the axis, not the whole score range', () => {
    const domain = sparklineDomain([70, 74]);

    expect(domain.min).toBeGreaterThan(60);
    expect(domain.max).toBeLessThan(80);
  });

  it('leaves a margin so the extremes never touch the edges', () => {
    const domain = sparklineDomain([70, 80]);

    expect(domain.min).toBeLessThan(70);
    expect(domain.max).toBeGreaterThan(80);
  });

  it('opens a readable window around a perfectly flat history', () => {
    const domain = sparklineDomain([64, 64, 64]);

    expect(domain.min).toBeLessThan(64);
    expect(domain.max).toBeGreaterThan(64);
  });
});

describe('sparklinePoints', () => {
  it('needs two sessions to draw a line', () => {
    expect(sparklinePoints([70], GEOMETRY)).toBeNull();
    expect(sparklinePoints([], GEOMETRY)).toBeNull();
  });

  it('spreads the sessions over the full width', () => {
    const points = sparklinePoints([70, 74], GEOMETRY)?.split(' ') ?? [];

    expect(points).toHaveLength(2);
    expect(points[0].startsWith('0,')).toBe(true);
    expect(points[1].startsWith('140,')).toBe(true);
  });

  // Le défaut corrigé : sur une échelle 0-100, quatre points d'écart tenaient
  // dans moins d'un pixel et la courbe paraissait plate.
  it('turns a small real gap into a visible slope', () => {
    const heights = (sparklinePoints([70, 74], GEOMETRY) ?? '')
      .split(' ')
      .map((pair) => Number(pair.split(',')[1]));

    expect(heights[0] - heights[1]).toBeGreaterThan(10);
  });

  it('keeps a flat history flat and centred', () => {
    const heights = (sparklinePoints([64, 64, 64], GEOMETRY) ?? '')
      .split(' ')
      .map((pair) => Number(pair.split(',')[1]));

    expect(new Set(heights).size).toBe(1);
    expect(heights[0]).toBe((GEOMETRY.top + GEOMETRY.bottom) / 2);
  });

  it('gives the same shape to two axes that moved the same way', () => {
    const low = sparklinePoints([20, 24, 22], GEOMETRY);
    const high = sparklinePoints([80, 84, 82], GEOMETRY);

    expect(low).toBe(high);
  });
});
