import { describe, expect, it } from 'vitest';
import {
  MotorSkillsCourseRecap,
  MotorSkillsMetrics,
  MotricityErrorEvent,
  MotricitySegmentKind,
} from '../../domain/axis-metrics';
import { AxisType, RecommendationPriority } from '../../enums';
import { analyzeMotricity } from './motricity-findings';

function event(
  tMs: number,
  type: MotricityErrorEvent['type'],
  segment: MotricitySegmentKind = 'H',
  courseIndex = 0,
  durationMs?: number,
): MotricityErrorEvent {
  return { courseIndex, tMs, type, segment, ...(durationMs !== undefined ? { durationMs } : {}) };
}

function course(
  index: number,
  tReelMs: number,
  progressionPct = 100,
): MotorSkillsCourseRecap {
  return {
    index,
    minorErrors: 0,
    majorErrors: 0,
    progressionPct,
    tReelMs,
    avgLatencyMs: null,
    jitterMs: null,
  };
}

function metrics(overrides: Partial<MotorSkillsMetrics>): MotorSkillsMetrics {
  return {
    axis: AxisType.MOTOR_SKILLS,
    minorErrors: 4,
    majorErrors: 1,
    totalTimeMs: 180_000,
    coursesCompleted: 3,
    controlModality: null,
    courses: [course(0, 60_000), course(1, 60_000), course(2, 60_000)],
    timeline: [],
    events: [],
    ...overrides,
  };
}

function ids(input: MotorSkillsMetrics): string[] {
  return analyzeMotricity(input).map(({ id }) => id);
}

describe('analyzeMotricity', () => {
  it('flags exits concentrated in diagonal segments', () => {
    const events = [
      event(5_000, 'EXIT', 'DIAG', 0, 500),
      event(20_000, 'EXIT', 'DIAG', 1, 700),
      event(40_000, 'EXIT', 'H', 2, 400),
    ];
    const findings = analyzeMotricity(metrics({ events }));
    const diag = findings.find(({ id }) => id === 'MOTRICITY_DIAGONAL_EXITS');
    expect(diag).toBeDefined();
    expect(diag?.finding).toContain('2 de vos 3 sorties');
  });

  it('stays silent on diagonals when exits stay on straight segments', () => {
    const events = [
      event(5_000, 'EXIT', 'H', 0, 500),
      event(20_000, 'EXIT', 'V', 1, 700),
    ];
    expect(ids(metrics({ events }))).not.toContain('MOTRICITY_DIAGONAL_EXITS');
  });

  it('flags a horizontal versus vertical asymmetry of errors', () => {
    const events = [
      event(5_000, 'CONTACT', 'H'),
      event(20_000, 'CONTACT', 'H', 1),
      event(40_000, 'CONTACT', 'H', 2),
      event(50_000, 'EXIT', 'H', 2, 500),
      event(55_000, 'CONTACT', 'V', 2),
    ];
    const findings = analyzeMotricity(metrics({ events }));
    const asymmetry = findings.find(
      ({ id }) => id === 'MOTRICITY_HAND_ASYMMETRY',
    );
    expect(asymmetry).toBeDefined();
    expect(asymmetry?.finding).toContain(
      '4 erreurs sur les segments horizontaux contre 1',
    );
  });

  it('stays silent on asymmetry when both directions balance', () => {
    const events = [
      event(5_000, 'CONTACT', 'H'),
      event(20_000, 'CONTACT', 'V', 1),
      event(40_000, 'CONTACT', 'H', 2),
      event(55_000, 'CONTACT', 'V', 2),
    ];
    expect(ids(metrics({ events }))).not.toContain('MOTRICITY_HAND_ASYMMETRY');
  });

  it('flags a cascade of errors right after an exit', () => {
    const events = [
      event(10_000, 'EXIT', 'H', 0, 1_000),
      event(12_000, 'CONTACT', 'H', 0),
      event(14_500, 'CONTACT', 'DIAG', 0),
      event(50_000, 'CONTACT', 'V', 1),
    ];
    const findings = analyzeMotricity(metrics({ events }));
    const cascade = findings.find(
      ({ id }) => id === 'MOTRICITY_POST_EXIT_CASCADE',
    );
    expect(cascade).toBeDefined();
    expect(cascade?.severity).toBe(RecommendationPriority.HIGH);
    expect(cascade?.finding).toContain("2 erreurs s'enchaînent");
  });

  it('stays silent on the cascade when play resumes calmly after exits', () => {
    const events = [
      event(10_000, 'EXIT', 'H', 0, 1_000),
      event(30_000, 'CONTACT', 'H', 0),
      event(55_000, 'CONTACT', 'V', 1),
    ];
    expect(ids(metrics({ events }))).not.toContain(
      'MOTRICITY_POST_EXIT_CASCADE',
    );
  });

  it('flags errors over-represented in the narrowed final third', () => {
    const events = [
      event(45_000, 'CONTACT', 'H', 0),
      event(50_000, 'CONTACT', 'H', 0),
      event(55_000, 'EXIT', 'DIAG', 1, 600),
      event(10_000, 'CONTACT', 'V', 2),
    ];
    const findings = analyzeMotricity(metrics({ events }));
    const narrow = findings.find(
      ({ id }) => id === 'MOTRICITY_NARROW_FINAL_THIRD',
    );
    expect(narrow).toBeDefined();
    expect(narrow?.finding).toContain('3 de vos 4 erreurs');
  });

  it('stays silent on the final third when errors spread over the course', () => {
    const events = [
      event(5_000, 'CONTACT', 'H', 0),
      event(25_000, 'CONTACT', 'H', 0),
      event(50_000, 'CONTACT', 'H', 1),
      event(15_000, 'CONTACT', 'V', 2),
    ];
    expect(ids(metrics({ events }))).not.toContain(
      'MOTRICITY_NARROW_FINAL_THIRD',
    );
  });

  it('flags a clean but slow profile', () => {
    const findings = analyzeMotricity(
      metrics({
        minorErrors: 1,
        majorErrors: 0,
        totalTimeMs: 240_000,
        courses: [course(0, 80_000), course(1, 80_000), course(2, 80_000)],
      }),
    );
    const clean = findings.find(({ id }) => id === 'MOTRICITY_CLEAN_BUT_SLOW');
    expect(clean).toBeDefined();
    expect(clean?.severity).toBe(RecommendationPriority.HIGH);
    expect(clean?.finding).toContain('80 s par parcours');
  });

  it('flags a fast but dirty profile', () => {
    const findings = analyzeMotricity(
      metrics({
        minorErrors: 6,
        majorErrors: 2,
        totalTimeMs: 135_000,
        courses: [course(0, 45_000), course(1, 45_000), course(2, 45_000)],
      }),
    );
    const dirty = findings.find(({ id }) => id === 'MOTRICITY_FAST_BUT_DIRTY');
    expect(dirty).toBeDefined();
    expect(dirty?.finding).toContain('45 s en moyenne');
  });

  it('stays silent on the pace profile for a balanced run', () => {
    expect(
      ids(
        metrics({
          minorErrors: 3,
          majorErrors: 1,
          totalTimeMs: 195_000,
          courses: [course(0, 65_000), course(1, 65_000), course(2, 65_000)],
        }),
      ),
    ).toEqual(
      expect.not.arrayContaining([
        'MOTRICITY_CLEAN_BUT_SLOW',
        'MOTRICITY_FAST_BUT_DIRTY',
      ]),
    );
  });
});
