import {
  AxisType,
  MotorSkillsCourseRecap,
  MotorSkillsMetrics,
  RecommendationPriority,
  ScoreBand,
} from '@psychotech/shared';
import { describe, expect, it } from 'vitest';
import {
  AxisScore,
  SessionThresholds,
  buildRecommendations,
  evaluateSession,
  normalizeAxis,
  scoreBand,
  weightedGlobalScore,
} from './scoring.logic';

const RAILWAY_THRESHOLDS: SessionThresholds = {
  admissibilityThreshold: 70,
  vigilanceThreshold: 65,
  eliminatoryThreshold: 55,
};

describe('normalizeAxis logic', () => {
  it('combines points precision (/60) and coverage (/20)', () => {
    expect(
      normalizeAxis({ axis: AxisType.LOGIC, pointsEarned: 42, itemsProcessed: 16 }),
    ).toBe(71.5);
  });

  it('reaches the maximum when both precision and coverage are full', () => {
    expect(
      normalizeAxis({ axis: AxisType.LOGIC, pointsEarned: 60, itemsProcessed: 20 }),
    ).toBe(100);
  });

  it('clamps over-maximal point totals to 100', () => {
    expect(
      normalizeAxis({ axis: AxisType.LOGIC, pointsEarned: 120, itemsProcessed: 20 }),
    ).toBe(100);
  });
});

describe('normalizeAxis memory', () => {
  it('weights the inverse span more than the normal span', () => {
    expect(
      normalizeAxis({ axis: AxisType.MEMORY, maxLengthNormal: 9, maxLengthInverse: 2 }),
    ).toBe(40);
  });

  it('maps mid spans to fifty', () => {
    expect(
      normalizeAxis({ axis: AxisType.MEMORY, maxLengthNormal: 6, maxLengthInverse: 5 }),
    ).toBe(50);
  });

  it('clamps spans at the lower bounds to zero', () => {
    expect(
      normalizeAxis({ axis: AxisType.MEMORY, maxLengthNormal: 3, maxLengthInverse: 2 }),
    ).toBe(0);
  });
});

describe('normalizeAxis visual discrimination', () => {
  it('rewards perfect accuracy and speed', () => {
    expect(
      normalizeAxis({
        axis: AxisType.VISUAL_DISCRIMINATION,
        truePositives: 18,
        trueNegatives: 18,
        avgCorrectDecisionTimeMs: 300,
        falsePositives: 0,
        identicalPairs: 18,
      }),
    ).toBe(100);
  });

  it('subtracts the false positive penalty above the threshold', () => {
    expect(
      normalizeAxis({
        axis: AxisType.VISUAL_DISCRIMINATION,
        truePositives: 15,
        trueNegatives: 12,
        avgCorrectDecisionTimeMs: 900,
        falsePositives: 9,
        identicalPairs: 18,
      }),
    ).toBe(52.5);
  });

  it('applies no penalty below the false positive threshold', () => {
    expect(
      normalizeAxis({
        axis: AxisType.VISUAL_DISCRIMINATION,
        truePositives: 15,
        trueNegatives: 12,
        avgCorrectDecisionTimeMs: 900,
        falsePositives: 2,
        identicalPairs: 18,
      }),
    ).toBe(67.5);
  });
});

describe('normalizeAxis reactivity', () => {
  it('rewards fast, stable and error-free responses', () => {
    expect(
      normalizeAxis({
        axis: AxisType.REACTIVITY,
        meanReactionTimeMs: 250,
        reactionTimeSd: 30,
        anticipations: 0,
        omissions: 0,
        inhibitionErrors: 0,
        totalTrials: 60,
      }),
    ).toBe(100);
  });

  it('blends speed, stability and accuracy', () => {
    expect(
      normalizeAxis({
        axis: AxisType.REACTIVITY,
        meanReactionTimeMs: 525,
        reactionTimeSd: 115,
        anticipations: 1,
        omissions: 1,
        inhibitionErrors: 1,
        totalTrials: 60,
      }),
    ).toBe(59);
  });
});

describe('normalizeAxis motor skills', () => {
  const perfectCourse: MotorSkillsCourseRecap = {
    index: 0,
    minorErrors: 0,
    majorErrors: 0,
    progressionPct: 100,
    tReelMs: 20_000,
    avgLatencyMs: null,
    jitterMs: null,
  };

  function motorMetrics(
    courses: MotorSkillsCourseRecap[],
  ): MotorSkillsMetrics {
    return {
      axis: AxisType.MOTOR_SKILLS,
      minorErrors: courses.reduce((sum, course) => sum + course.minorErrors, 0),
      majorErrors: courses.reduce((sum, course) => sum + course.majorErrors, 0),
      totalTimeMs: courses.reduce((sum, course) => sum + course.tReelMs, 0),
      coursesCompleted: courses.filter(
        (course) => course.progressionPct >= 100,
      ).length,
      controlModality: null,
      courses,
      timeline: [],
      events: [],
    };
  }

  it('reaches the maximum for three perfect courses', () => {
    expect(
      normalizeAxis(
        motorMetrics([perfectCourse, perfectCourse, perfectCourse]),
      ),
    ).toBe(100);
  });

  it('weights the third course more heavily in the aggregate', () => {
    expect(
      normalizeAxis(
        motorMetrics([
          perfectCourse,
          {
            ...perfectCourse,
            index: 1,
            minorErrors: 4,
            majorErrors: 1,
            tReelMs: 55_000,
          },
          {
            ...perfectCourse,
            index: 2,
            progressionPct: 60,
            tReelMs: 90_000,
          },
        ]),
      ),
    ).toBe(75.4);
  });
});

describe('scoreBand', () => {
  it('maps scores to bands at the documented thresholds', () => {
    expect(scoreBand(80)).toBe(ScoreBand.EXCELLENT);
    expect(scoreBand(79.9)).toBe(ScoreBand.ACCEPTABLE);
    expect(scoreBand(70)).toBe(ScoreBand.ACCEPTABLE);
    expect(scoreBand(69.9)).toBe(ScoreBand.FRAGILE);
    expect(scoreBand(60)).toBe(ScoreBand.FRAGILE);
    expect(scoreBand(59.9)).toBe(ScoreBand.INSUFFICIENT);
  });
});

describe('weightedGlobalScore', () => {
  it('averages axis scores weighted by the sector coefficients', () => {
    const scores: AxisScore[] = [
      { axis: AxisType.LOGIC, score: 80, coefficient: 1, isCritical: false },
      { axis: AxisType.REACTIVITY, score: 90, coefficient: 1.4, isCritical: true },
    ];
    expect(weightedGlobalScore(scores)).toBe(85.8);
  });

  it('returns zero with no coefficients', () => {
    expect(weightedGlobalScore([])).toBe(0);
  });
});

describe('evaluateSession', () => {
  it('is admissible when the global score clears the threshold without a critical failure', () => {
    const scores: AxisScore[] = [
      { axis: AxisType.LOGIC, score: 80, coefficient: 1, isCritical: false },
      { axis: AxisType.REACTIVITY, score: 78, coefficient: 1.4, isCritical: true },
    ];
    const evaluation = evaluateSession(scores, RAILWAY_THRESHOLDS);
    expect(evaluation.isEliminated).toBe(false);
    expect(evaluation.isAdmissible).toBe(true);
    expect(evaluation.globalBand).toBe(ScoreBand.ACCEPTABLE);
  });

  it('eliminates and rejects when a critical axis is under the eliminatory threshold whatever the global', () => {
    const scores: AxisScore[] = [
      { axis: AxisType.LOGIC, score: 95, coefficient: 1, isCritical: false },
      { axis: AxisType.REACTIVITY, score: 50, coefficient: 1.4, isCritical: true },
    ];
    const evaluation = evaluateSession(scores, RAILWAY_THRESHOLDS);
    expect(evaluation.isEliminated).toBe(true);
    expect(evaluation.isAdmissible).toBe(false);
  });

  it('is not admissible when the global score is under the threshold', () => {
    const scores: AxisScore[] = [
      { axis: AxisType.LOGIC, score: 66, coefficient: 1, isCritical: false },
      { axis: AxisType.MEMORY, score: 64, coefficient: 1.2, isCritical: true },
    ];
    const evaluation = evaluateSession(scores, RAILWAY_THRESHOLDS);
    expect(evaluation.isEliminated).toBe(false);
    expect(evaluation.isAdmissible).toBe(false);
  });
});

describe('buildRecommendations', () => {
  it('prioritizes critical axes under thresholds, then the weakest axes', () => {
    const scores: AxisScore[] = [
      { axis: AxisType.LOGIC, score: 95, coefficient: 1, isCritical: false },
      { axis: AxisType.MEMORY, score: 62, coefficient: 1.2, isCritical: true },
      { axis: AxisType.VISUAL_DISCRIMINATION, score: 50, coefficient: 1.2, isCritical: true },
      { axis: AxisType.MOTOR_SKILLS, score: 68, coefficient: 1, isCritical: false },
    ];
    const recommendations = buildRecommendations(scores, RAILWAY_THRESHOLDS);
    expect(recommendations.map((entry) => entry.axis)).toEqual([
      AxisType.VISUAL_DISCRIMINATION,
      AxisType.MEMORY,
      AxisType.MOTOR_SKILLS,
    ]);
    expect(recommendations[0].priority).toBe(RecommendationPriority.HIGH);
    expect(recommendations[0].code).toBe('CRITICAL_AXIS_ELIMINATORY');
    expect(recommendations[1].code).toBe('CRITICAL_AXIS_VIGILANCE');
    expect(recommendations[2].priority).toBe(RecommendationPriority.LOW);
    expect(recommendations[2].code).toBe('AXIS_BELOW_ADMISSIBILITY');
  });

  it('produces no recommendation for axes above the admissibility threshold', () => {
    const scores: AxisScore[] = [
      { axis: AxisType.LOGIC, score: 88, coefficient: 1, isCritical: false },
    ];
    expect(buildRecommendations(scores, RAILWAY_THRESHOLDS)).toEqual([]);
  });
});
