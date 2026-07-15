import {
  MotricityErrorEvent,
  MotricityTimelinePoint,
} from '@psychotech/shared';
import {
  TRAJECTORY_DISPLAY_CLAMP_PCT,
  TRAJECTORY_EXIT_CEILING_PCT,
  TrajectoryExitWindow,
  borderMarkers,
  buildDisplaySeries,
  bucketTimelinePoints,
  clampDeviation,
  courseContactTimes,
  courseExitWindows,
  curveAboveBorderRuns,
  insertBorderCrossings,
  interpolateDeviationAt,
  mergeContactTimes,
  mergeExitWindows,
  monotoneCubicPath,
  monotoneCubicSubPath,
  smoothTimelinePoints,
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
      {
        courseIndex: 0,
        tMs: 8_000,
        type: 'EXIT',
        segment: 'H',
        durationMs: 700,
      },
      {
        courseIndex: 0,
        tMs: 9_000,
        type: 'EXIT',
        segment: 'H',
        durationMs: 500,
      },
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

describe('insertBorderCrossings', () => {
  it('inserts a point at exactly one hundred at each crossing of the border', () => {
    const inserted = insertBorderCrossings([
      { tMs: 0, deviationPct: 60 },
      { tMs: 1_000, deviationPct: 108 },
      { tMs: 2_000, deviationPct: 52 },
    ]);
    expect(inserted).toHaveLength(5);
    expect(inserted[1].deviationPct).toBe(100);
    expect(inserted[1].tMs).toBeCloseTo(833.33, 1);
    expect(inserted[3].deviationPct).toBe(100);
    expect(inserted[3].tMs).toBeCloseTo(1_142.86, 1);
  });

  it('does not insert anything for a touch at exactly one hundred', () => {
    const touch = [
      { tMs: 0, deviationPct: 60 },
      { tMs: 1_000, deviationPct: 100 },
      { tMs: 2_000, deviationPct: 60 },
    ];
    expect(insertBorderCrossings(touch)).toEqual(touch);
  });
});

describe('curveAboveBorderRuns', () => {
  it('starts and ends every red run exactly at the border crossings', () => {
    const inserted = insertBorderCrossings([
      { tMs: 0, deviationPct: 40 },
      { tMs: 1_000, deviationPct: 102 },
      { tMs: 2_000, deviationPct: 108 },
      { tMs: 3_000, deviationPct: 55 },
    ]);
    const runs = curveAboveBorderRuns(
      inserted.map((point) => point.deviationPct),
    );
    expect(runs).toEqual([{ from: 1, to: 4 }]);
    expect(inserted[1].deviationPct).toBe(100);
    expect(inserted[4].deviationPct).toBe(100);
  });

  it('keeps every point below the border out of the red runs', () => {
    const values = [40, 100, 102, 108, 100, 55, 40];
    const runs = curveAboveBorderRuns(values);
    expect(runs).toEqual([{ from: 1, to: 4 }]);
    for (const run of runs) {
      for (let index = run.from; index <= run.to; index += 1) {
        expect(values[index]).toBeGreaterThanOrEqual(100);
      }
    }
  });

  it('keeps a peak at exactly one hundred black', () => {
    expect(curveAboveBorderRuns([40, 100, 40])).toEqual([]);
    expect(curveAboveBorderRuns([])).toEqual([]);
  });
});

describe('borderMarkers', () => {
  const totalMs = 90_000;
  const raw = flatSeries(90_000, 40);

  function renderedSeries(
    contacts: number[],
    windows: TrajectoryExitWindow[],
  ): MotricityTimelinePoint[] {
    return insertBorderCrossings(
      buildDisplaySeries(raw, contacts, windows, totalMs),
    );
  }

  it('marks pure contacts with a single touch each and no red run', () => {
    const series = renderedSeries([15_000, 40_000], []);
    const markers = borderMarkers(series);
    expect(markers).toEqual([
      { tMs: 15_000, kind: 'TOUCH' },
      { tMs: 40_000, kind: 'TOUCH' },
    ]);
    expect(
      curveAboveBorderRuns(series.map((point) => point.deviationPct)),
    ).toEqual([]);
  });

  it('marks a long exit with one marker per crossing, reconciled with the red run', () => {
    const series = renderedSeries([], [{ startMs: 20_000, endMs: 28_000 }]);
    const markers = borderMarkers(series);
    expect(markers).toHaveLength(2);
    expect(markers[0].kind).toBe('EXIT_START');
    expect(markers[1].kind).toBe('EXIT_END');
    const runs = curveAboveBorderRuns(
      series.map((point) => point.deviationPct),
    );
    expect(runs).toHaveLength(1);
    expect(series[runs[0].from].tMs).toBe(markers[0].tMs);
    expect(series[runs[0].to].tMs).toBe(markers[1].tMs);
  });

  it('marks two brief distant exits with two crossings each', () => {
    const series = renderedSeries(
      [],
      [
        { startMs: 10_000, endMs: 10_400 },
        { startMs: 60_000, endMs: 60_400 },
      ],
    );
    const markers = borderMarkers(series);
    expect(markers.map((marker) => marker.kind)).toEqual([
      'EXIT_START',
      'EXIT_END',
      'EXIT_START',
      'EXIT_END',
    ]);
    const runs = curveAboveBorderRuns(
      series.map((point) => point.deviationPct),
    );
    expect(runs).toHaveLength(2);
  });

  it('never yields a crossing without a marker nor a marker without a border meeting', () => {
    const series = renderedSeries(
      [15_000],
      [{ startMs: 30_000, endMs: 33_000 }],
    );
    const markers = borderMarkers(series);
    const meetings = series.filter((point) => point.deviationPct === 100);
    expect(markers).toHaveLength(meetings.length);
    const runs = curveAboveBorderRuns(
      series.map((point) => point.deviationPct),
    );
    const crossingMarkers = markers.filter(
      (marker) => marker.kind !== 'TOUCH',
    );
    expect(crossingMarkers).toHaveLength(runs.length * 2);
  });
});

describe('monotoneCubicSubPath', () => {
  it('renders a red run with the same geometry as the base curve', () => {
    const coords = [
      { x: 0, y: 80 },
      { x: 20, y: 50 },
      { x: 40, y: 10 },
      { x: 60, y: 30 },
      { x: 80, y: 70 },
    ];
    const base = monotoneCubicPath(coords);
    const sub = monotoneCubicSubPath(coords, 1, 3);
    const segments = base.split(' C ');
    expect(sub).toBe(`M 20.00 50.00 C ${segments[2]} C ${segments[3]}`);
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
