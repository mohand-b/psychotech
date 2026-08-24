import { AxisSparklinePointDto } from '@psychotech/shared';
import { describe, expect, it } from 'vitest';
import {
  axisScoresWithinWindow,
  axisTrend,
  sparklineY,
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

describe('axisTrend', () => {
  it('stays silent below four sessions, whatever the scores say', () => {
    expect(axisTrend([10, 90, 10])).toBeNull();
  });

  it('rises when the recent average gains at least three points', () => {
    expect(axisTrend([50, 50, 50, 53, 54, 55])).toBe('up');
  });

  it('falls when the recent average loses at least three points', () => {
    expect(axisTrend([60, 60, 60, 57, 56, 55])).toBe('down');
  });

  it('stays flat inside the three point corridor', () => {
    expect(axisTrend([60, 60, 60, 61, 62, 62])).toBe('flat');
  });

  it('absorbs a single collapse instead of reading it as the new level', () => {
    // Une contre-performance isolée à 20 sur un niveau installé à 70 : la
    // moyenne recule, mais l'axe n'est pas rétrogradé sur le seul dernier point.
    expect(axisTrend([70, 70, 70, 72, 71, 20])).toBe('down');
    // Deux points de mieux ne sont pas une progression.
    expect(axisTrend([70, 70, 70, 71, 72, 73])).toBe('flat');
    expect(axisTrend([70, 70, 70, 73, 74, 75])).toBe('up');
  });

  it('compares against the sessions available when fewer than six exist', () => {
    expect(axisTrend([40, 50, 50, 50])).toBe('up');
  });
});

describe('sparklineY', () => {
  it('pins the scale to zero and one hundred, never to the data range', () => {
    expect(sparklineY(0, GEOMETRY)).toBe(GEOMETRY.bottom);
    expect(sparklineY(100, GEOMETRY)).toBe(GEOMETRY.top);
    expect(sparklineY(50, GEOMETRY)).toBe(14);
  });

  it('places a given score at the same height whatever the other scores', () => {
    expect(sparklineY(70, GEOMETRY)).toBe(sparklineY(70, GEOMETRY));
    expect(sparklineY(70, GEOMETRY)).toBe(10);
  });

  it('clamps a score outside the scale', () => {
    expect(sparklineY(140, GEOMETRY)).toBe(GEOMETRY.top);
    expect(sparklineY(-20, GEOMETRY)).toBe(GEOMETRY.bottom);
  });
});

describe('sparklinePoints', () => {
  it('needs two sessions to draw a line', () => {
    expect(sparklinePoints([70], GEOMETRY)).toBeNull();
    expect(sparklinePoints([], GEOMETRY)).toBeNull();
  });

  it('spreads the sessions over the full width', () => {
    expect(sparklinePoints([0, 100], GEOMETRY)).toBe('0,24 140,4');
  });

  it('gives two axes of equal score the same polyline', () => {
    expect(sparklinePoints([40, 80], GEOMETRY)).toBe(
      sparklinePoints([40, 80], GEOMETRY),
    );
  });
});
