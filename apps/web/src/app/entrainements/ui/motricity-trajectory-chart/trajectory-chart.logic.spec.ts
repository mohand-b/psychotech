import { MotorSkillsCourseRecap, MotricityErrorEvent } from '@psychotech/shared';
import {
  TRAJECTORY_DISPLAY_CLAMP_PCT,
  clampDeviation,
  smoothTimelinePoints,
  trajectoryExitBands,
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
});
