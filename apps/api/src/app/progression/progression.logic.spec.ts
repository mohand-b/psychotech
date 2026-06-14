import {
  AxisFeaturedMetric,
  AxisType,
  ScoreBand,
} from '@psychotech/shared';
import { describe, expect, it } from 'vitest';
import { PROGRESSION_AXIS_ORDER } from './progression.constants';
import {
  AxisTimelinePoint,
  buildEvolutionCurve,
  buildRadarScores,
  buildSparkline,
  computeDeltaOverWindow,
  extractFeaturedMetric,
} from './progression.logic';

function point(date: string, score: number, metrics: unknown = null): AxisTimelinePoint {
  return { date: new Date(date), score, band: ScoreBand.ACCEPTABLE, metrics };
}

const NOW = new Date('2026-06-14T00:00:00Z');
const WINDOW_DAYS = 30;

describe('computeDeltaOverWindow', () => {
  it('compares the latest score to the latest score before the window', () => {
    const timeline = [
      point('2026-04-01T10:00:00Z', 60),
      point('2026-05-01T10:00:00Z', 65),
      point('2026-06-10T10:00:00Z', 78),
    ];
    expect(computeDeltaOverWindow(timeline, NOW, WINDOW_DAYS)).toBe(13);
  });

  it('returns null when every score is within the window', () => {
    const timeline = [
      point('2026-06-01T10:00:00Z', 70),
      point('2026-06-10T10:00:00Z', 78),
    ];
    expect(computeDeltaOverWindow(timeline, NOW, WINDOW_DAYS)).toBeNull();
  });

  it('returns null for an empty timeline', () => {
    expect(computeDeltaOverWindow([], NOW, WINDOW_DAYS)).toBeNull();
  });
});

describe('buildEvolutionCurve', () => {
  it('maps chronological sessions to dated curve points', () => {
    const curve = buildEvolutionCurve([
      {
        sessionId: 's1',
        completedAt: new Date('2026-06-01T10:00:00Z'),
        globalScore: 72,
        band: ScoreBand.ACCEPTABLE,
      },
      {
        sessionId: 's2',
        completedAt: new Date('2026-06-10T10:00:00Z'),
        globalScore: 81,
        band: ScoreBand.EXCELLENT,
      },
    ]);
    expect(curve).toEqual([
      {
        sessionId: 's1',
        date: '2026-06-01T10:00:00.000Z',
        globalScore: 72,
        band: ScoreBand.ACCEPTABLE,
      },
      {
        sessionId: 's2',
        date: '2026-06-10T10:00:00.000Z',
        globalScore: 81,
        band: ScoreBand.EXCELLENT,
      },
    ]);
  });
});

describe('buildSparkline', () => {
  it('keeps the most recent points up to the limit, in chronological order', () => {
    const timeline = [
      point('2026-06-01T10:00:00Z', 70),
      point('2026-06-05T10:00:00Z', 75),
      point('2026-06-10T10:00:00Z', 80),
    ];
    expect(buildSparkline(timeline, 2)).toEqual([
      { date: '2026-06-05T10:00:00.000Z', score: 75 },
      { date: '2026-06-10T10:00:00.000Z', score: 80 },
    ]);
  });

  it('returns every point when the limit is larger than the timeline', () => {
    const timeline = [point('2026-06-10T10:00:00Z', 80)];
    expect(buildSparkline(timeline, 5)).toEqual([
      { date: '2026-06-10T10:00:00.000Z', score: 80 },
    ]);
  });
});

describe('extractFeaturedMetric', () => {
  it('exposes the greatest memorized sequence length for memory', () => {
    expect(
      extractFeaturedMetric(AxisType.MEMORY, { maxLengthNormal: 7, maxLengthInverse: 5 }),
    ).toEqual({ metric: AxisFeaturedMetric.MAX_MEMORIZED_LENGTH, value: 7 });
    expect(
      extractFeaturedMetric(AxisType.MEMORY, { maxLengthNormal: 4, maxLengthInverse: 6 }),
    ).toEqual({ metric: AxisFeaturedMetric.MAX_MEMORIZED_LENGTH, value: 6 });
  });

  it('exposes the mean reaction time for reactivity', () => {
    expect(
      extractFeaturedMetric(AxisType.REACTIVITY, { meanReactionTimeMs: 420 }),
    ).toEqual({ metric: AxisFeaturedMetric.MEAN_REACTION_TIME_MS, value: 420 });
  });

  it('returns null for other axes', () => {
    expect(
      extractFeaturedMetric(AxisType.LOGIC, { pointsEarned: 50, itemsProcessed: 18 }),
    ).toBeNull();
  });

  it('returns null for malformed metrics', () => {
    expect(extractFeaturedMetric(AxisType.MEMORY, null)).toBeNull();
    expect(extractFeaturedMetric(AxisType.MEMORY, {})).toBeNull();
    expect(extractFeaturedMetric(AxisType.REACTIVITY, 'not-an-object')).toBeNull();
  });
});

describe('buildRadarScores', () => {
  it('returns the five axes in order, with nulls for missing axes', () => {
    expect(
      buildRadarScores(
        [
          { axis: AxisType.LOGIC, score: 80 },
          { axis: AxisType.MEMORY, score: null },
        ],
        PROGRESSION_AXIS_ORDER,
      ),
    ).toEqual([
      { axis: AxisType.LOGIC, score: 80 },
      { axis: AxisType.MEMORY, score: null },
      { axis: AxisType.VISUAL_DISCRIMINATION, score: null },
      { axis: AxisType.REACTIVITY, score: null },
      { axis: AxisType.MOTOR_SKILLS, score: null },
    ]);
  });

  it('returns null scores for every axis when there is no session', () => {
    expect(buildRadarScores(null, PROGRESSION_AXIS_ORDER)).toEqual([
      { axis: AxisType.LOGIC, score: null },
      { axis: AxisType.MEMORY, score: null },
      { axis: AxisType.VISUAL_DISCRIMINATION, score: null },
      { axis: AxisType.REACTIVITY, score: null },
      { axis: AxisType.MOTOR_SKILLS, score: null },
    ]);
  });
});
