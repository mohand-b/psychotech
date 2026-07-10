import { MotorSkillsCourseRecap, MotricityErrorEvent } from '@psychotech/shared';
import {
  TRAJECTORY_DISPLAY_CLAMP_PCT,
  buildDisplaySeries,
  clampDeviation,
  curveExitRuns,
  interpolateDeviationAt,
  smoothTimelinePoints,
  trajectoryExitBands,
  trajectoryExitWindows,
} from './trajectory-chart.logic';

describe('smoothTimelinePoints', () => {
  it('averages each point over a centered two second window', () => {
    const points = Array.from({ length: 21 }, (_, index) => ({
      tMs: index * 200,
      deviationPct: index === 10 ? 100 : 0,
    }));
    const smoothed = smoothTimelinePoints(points);
    const center = smoothed[10];
    expect(center.deviationPct).toBeCloseTo(100 / 11, 5);
    expect(smoothed[0].deviationPct).toBe(0);
    expect(smoothed[10 - 6].deviationPct).toBe(0);
    expect(smoothed[10 - 5].deviationPct).toBeGreaterThan(0);
  });

  it('keeps a flat series untouched', () => {
    const points = Array.from({ length: 5 }, (_, index) => ({
      tMs: index * 200,
      deviationPct: 40,
    }));
    expect(smoothTimelinePoints(points).map((p) => p.deviationPct)).toEqual([
      40, 40, 40, 40, 40,
    ]);
  });
});

describe('clampDeviation', () => {
  it('caps the displayed deviation at one hundred and ten percent', () => {
    expect(clampDeviation(240)).toBe(TRAJECTORY_DISPLAY_CLAMP_PCT);
    expect(clampDeviation(85)).toBe(85);
  });
});

describe('trajectoryExitBands', () => {
  const courses: MotorSkillsCourseRecap[] = [0, 1, 2].map((index) => ({
    index,
    minorErrors: 0,
    majorErrors: 0,
    progressionPct: 100,
    tReelMs: 40_000,
    avgLatencyMs: null,
    jitterMs: null,
  }));

  it('maps every exit event to a band positioned on the concatenated time axis', () => {
    const events: MotricityErrorEvent[] = [
      { courseIndex: 1, tMs: 10_000, type: 'EXIT', segment: 'H', durationMs: 2_400 },
      { courseIndex: 0, tMs: 4_000, type: 'CONTACT', segment: 'DIAG' },
    ];
    const bands = trajectoryExitBands(events, courses, 120_000);
    expect(bands).toHaveLength(1);
    expect(bands[0].leftPct).toBeCloseTo(((40_000 + 10_000) / 120_000) * 100, 5);
    expect(bands[0].widthPct).toBeCloseTo((2_400 / 120_000) * 100, 5);
  });

  it('gives a minimum visible width to very short exits', () => {
    const events: MotricityErrorEvent[] = [
      { courseIndex: 0, tMs: 1_000, type: 'EXIT', segment: 'V', durationMs: 50 },
    ];
    const bands = trajectoryExitBands(events, courses, 120_000);
    expect(bands[0].widthPct).toBeGreaterThanOrEqual(0.4);
  });

  it('exposes absolute exit windows on the concatenated time axis', () => {
    const events: MotricityErrorEvent[] = [
      { courseIndex: 2, tMs: 5_000, type: 'EXIT', segment: 'H', durationMs: 1_500 },
    ];
    expect(trajectoryExitWindows(events, courses)).toEqual([
      { startMs: 85_000, endMs: 86_500 },
    ]);
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

describe('buildDisplaySeries', () => {
  const flatRaw = Array.from({ length: 51 }, (_, index) => ({
    tMs: index * 200,
    deviationPct: 40,
  }));

  it('anchors the curve at one hundred on each contact with a soft ease', () => {
    const series = buildDisplaySeries(flatRaw, [5_000], []);
    const peak = series.find((point) => point.tMs === 5_000);
    expect(peak?.deviationPct).toBe(100);
    const halfway = series.find((point) => point.tMs === 5_200);
    expect(halfway?.deviationPct).toBeCloseTo(40 + (1 - 200 / 300) * 60, 0);
    const outside = series.find((point) => point.tMs === 5_400);
    expect(outside?.deviationPct).toBe(40);
    expect(Math.max(...series.map((point) => point.deviationPct))).toBe(100);
  });

  it('follows the raw decimated values inside an exit window, clamped and eased at the bounds', () => {
    const raw = flatRaw.map((point) =>
      point.tMs >= 6_000 && point.tMs <= 7_000
        ? { ...point, deviationPct: point.tMs === 6_400 ? 130 : 105 }
        : point,
    );
    const series = buildDisplaySeries(raw, [], [{ startMs: 6_000, endMs: 7_000 }]);
    const inside = series.find((point) => point.tMs === 6_200);
    expect(inside?.deviationPct).toBe(105);
    const spike = series.find((point) => point.tMs === 6_400);
    expect(spike?.deviationPct).toBe(TRAJECTORY_DISPLAY_CLAMP_PCT);
    const farBefore = series.find((point) => point.tMs === 5_000);
    expect(farBefore?.deviationPct).toBeLessThan(60);
  });

  it('returns the smoothed series untouched without any event', () => {
    const series = buildDisplaySeries(flatRaw, [], []);
    expect(series).toHaveLength(flatRaw.length);
    expect(series.every((point) => point.deviationPct === 40)).toBe(true);
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
