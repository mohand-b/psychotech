import { MotricityErrorEvent } from '@psychotech/shared';
import {
  TRAJECTORY_DISPLAY_CLAMP_PCT,
  TRAJECTORY_EXIT_CEILING_PCT,
  buildDisplaySeries,
  bucketTimelinePoints,
  clampDeviation,
  courseContactTimes,
  courseExitWindows,
  curveExitRuns,
  interpolateDeviationAt,
  mergeContactTimes,
  mergeExitWindows,
  monotoneCubicPath,
  smoothTimelinePoints,
  trajectoryExitBands,
} from './trajectory-chart.logic';

function flatSeries(untilMs: number, deviationPct: number) {
  return Array.from({ length: untilMs / 200 + 1 }, (_, index) => ({
    tMs: index * 200,
    deviationPct,
  }));
}

describe('bucketTimelinePoints', () => {
  it('averages the five hertz points into five hundred millisecond buckets', () => {
    const points = [
      { tMs: 0, deviationPct: 10 },
      { tMs: 200, deviationPct: 20 },
      { tMs: 400, deviationPct: 30 },
      { tMs: 600, deviationPct: 40 },
    ];
    expect(bucketTimelinePoints(points)).toEqual([
      { tMs: 250, deviationPct: 20 },
      { tMs: 750, deviationPct: 40 },
    ]);
  });
});

describe('baseline smoothing', () => {
  it('flattens high frequency oscillations into a calm curve', () => {
    const noisy = Array.from({ length: 151 }, (_, index) => ({
      tMs: index * 200,
      deviationPct: index % 2 === 0 ? 10 : 60,
    }));
    const baseline = smoothTimelinePoints(bucketTimelinePoints(noisy));
    const values = baseline.slice(3, -3).map((point) => point.deviationPct);
    const spread = Math.max(...values) - Math.min(...values);
    expect(spread).toBeLessThan(4);
  });
});

describe('merging', () => {
  it('merges contacts closer than one and a half seconds into one point', () => {
    expect(mergeContactTimes([1_000, 1_800, 2_400, 10_000])).toEqual([
      1_733, 10_000,
    ]);
    expect(mergeContactTimes([])).toEqual([]);
  });

  it('merges overlapping or nearby exit windows into one', () => {
    expect(
      mergeExitWindows([
        { startMs: 1_000, endMs: 2_000 },
        { startMs: 2_500, endMs: 3_000 },
        { startMs: 10_000, endMs: 11_000 },
      ]),
    ).toEqual([
      { startMs: 1_000, endMs: 3_000 },
      { startMs: 10_000, endMs: 11_000 },
    ]);
  });

  it('extracts merged per-course contacts and windows from the events', () => {
    const events: MotricityErrorEvent[] = [
      { courseIndex: 0, tMs: 1_000, type: 'CONTACT', segment: 'H' },
      { courseIndex: 0, tMs: 2_000, type: 'CONTACT', segment: 'H' },
      { courseIndex: 1, tMs: 5_000, type: 'CONTACT', segment: 'V' },
      { courseIndex: 0, tMs: 8_000, type: 'EXIT', segment: 'H', durationMs: 700 },
      { courseIndex: 0, tMs: 9_000, type: 'EXIT', segment: 'H', durationMs: 500 },
    ];
    expect(courseContactTimes(events, 0)).toEqual([1_500]);
    expect(courseContactTimes(events, 1)).toEqual([5_000]);
    expect(courseExitWindows(events, 0)).toEqual([
      { startMs: 8_000, endMs: 9_500 },
    ]);
  });
});

describe('buildDisplaySeries', () => {
  const raw = flatSeries(30_000, 40);

  it('raises a smooth bell to one hundred at each contact and returns to the baseline', () => {
    const series = buildDisplaySeries(raw, [15_000], [], 30_000);
    const peak = series.find((point) => point.tMs === 15_000);
    expect(peak?.deviationPct).toBe(100);
    const beyond = series.filter(
      (point) => Math.abs(point.tMs - 15_000) > 1_600,
    );
    expect(Math.max(...beyond.map((point) => point.deviationPct))).toBeLessThan(
      45,
    );
    expect(Math.max(...series.map((point) => point.deviationPct))).toBe(100);
  });

  it('rounds a red dome above the border across an exit window', () => {
    const series = buildDisplaySeries(
      raw,
      [],
      [{ startMs: 10_000, endMs: 16_000 }],
      30_000,
    );
    const mid = series.find((point) => point.tMs === 13_000);
    expect(mid?.deviationPct).toBeCloseTo(TRAJECTORY_EXIT_CEILING_PCT, 0);
    const insideEdge = series.find((point) => point.tMs === 10_000);
    expect(insideEdge?.deviationPct).toBeGreaterThan(100);
    expect(insideEdge?.deviationPct).toBeLessThan(TRAJECTORY_EXIT_CEILING_PCT);
    const far = series.find((point) => point.tMs === 7_250);
    expect(far?.deviationPct).toBeLessThan(45);
    expect(
      Math.max(...series.map((point) => point.deviationPct)),
    ).toBeLessThanOrEqual(TRAJECTORY_DISPLAY_CLAMP_PCT);
  });

  it('keeps a calm baseline without any event', () => {
    const series = buildDisplaySeries(raw, [], [], 30_000);
    expect(series.every((point) => Math.abs(point.deviationPct - 40) < 1)).toBe(
      true,
    );
  });
});

describe('monotoneCubicPath', () => {
  it('draws a flat series as a flat path without oscillation', () => {
    const path = monotoneCubicPath([
      { x: 0, y: 50 },
      { x: 25, y: 50 },
      { x: 50, y: 50 },
      { x: 100, y: 50 },
    ]);
    const ys = [...path.matchAll(/[\d.]+ ([\d.]+)/g)].map((match) =>
      Number(match[1]),
    );
    expect(ys.every((y) => y === 50)).toBe(true);
  });

  it('never overshoots a monotone ramp', () => {
    const path = monotoneCubicPath([
      { x: 0, y: 100 },
      { x: 10, y: 90 },
      { x: 20, y: 20 },
      { x: 30, y: 10 },
    ]);
    const ys = [...path.matchAll(/[\d.]+ ([\d.]+)/g)].map((match) =>
      Number(match[1]),
    );
    expect(Math.max(...ys)).toBeLessThanOrEqual(100);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(10);
    expect(path.startsWith('M ')).toBe(true);
  });
});

describe('clampDeviation', () => {
  it('caps the displayed deviation at one hundred and ten percent', () => {
    expect(clampDeviation(240)).toBe(TRAJECTORY_DISPLAY_CLAMP_PCT);
    expect(clampDeviation(85)).toBe(85);
  });
});

describe('trajectoryExitBands', () => {
  it('maps merged windows to bands with a minimum visible width', () => {
    const bands = trajectoryExitBands(
      [
        { startMs: 50_000, endMs: 52_400 },
        { startMs: 100_000, endMs: 100_050 },
      ],
      120_000,
    );
    expect(bands[0].leftPct).toBeCloseTo((50_000 / 120_000) * 100, 5);
    expect(bands[0].widthPct).toBeCloseTo((2_400 / 120_000) * 100, 5);
    expect(bands[1].widthPct).toBeGreaterThanOrEqual(0.4);
  });
});

describe('curveExitRuns', () => {
  const times = [0, 200, 400, 600, 800, 1000, 1200];

  it('marks the consecutive curve pairs overlapping an exit window as a single run', () => {
    const runs = curveExitRuns(times, [{ startMs: 350, endMs: 850 }]);
    expect(runs).toEqual([{ from: 1, to: 5 }]);
  });

  it('returns one run per disjoint window and none without windows', () => {
    expect(
      curveExitRuns(times, [
        { startMs: 0, endMs: 150 },
        { startMs: 1_050, endMs: 1_200 },
      ]),
    ).toEqual([
      { from: 0, to: 1 },
      { from: 5, to: 6 },
    ]);
    expect(curveExitRuns(times, [])).toEqual([]);
  });
});

describe('interpolateDeviationAt', () => {
  const points = [
    { tMs: 0, deviationPct: 10 },
    { tMs: 200, deviationPct: 30 },
    { tMs: 400, deviationPct: 20 },
  ];

  it('interpolates linearly between the surrounding points', () => {
    expect(interpolateDeviationAt(points, 100)).toBeCloseTo(20, 5);
    expect(interpolateDeviationAt(points, 300)).toBeCloseTo(25, 5);
  });

  it('clamps outside the series to the nearest end', () => {
    expect(interpolateDeviationAt(points, -50)).toBe(10);
    expect(interpolateDeviationAt(points, 900)).toBe(20);
    expect(interpolateDeviationAt([], 100)).toBe(0);
  });
});
