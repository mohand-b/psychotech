import {
  AxisType,
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

describe('normalizeAxis', () => {
  it('scores logic from its precision', () => {
    expect(
      normalizeAxis({
        axis: AxisType.LOGIC,
        precision: 85,
        itemsAnswered: 40,
        itemsSkipped: 0,
        avgTimePerItemMs: 1200,
        accuracyByType: { numeric: 90, letters: 80, symbols: 85, mixed: 85 },
      }),
    ).toBe(85);
  });

  it('scores memory from the average memorized sequence length', () => {
    expect(
      normalizeAxis({
        axis: AxisType.MEMORY,
        maxLengthNormal: 9,
        maxLengthInverse: 9,
        errorProfile: { position: 0, content: 0 },
        dropOffStep: 9,
      }),
    ).toBe(100);
    expect(
      normalizeAxis({
        axis: AxisType.MEMORY,
        maxLengthNormal: 4,
        maxLengthInverse: 5,
        errorProfile: { position: 1, content: 1 },
        dropOffStep: 4,
      }),
    ).toBe(50);
  });

  it('penalizes visual discrimination false alarms', () => {
    expect(
      normalizeAxis({
        axis: AxisType.VISUAL_DISCRIMINATION,
        precision: 90,
        avgDecisionTimeMs: 800,
        falseAlarmRate: 0.1,
        accuracyByLength: { short: 95, medium: 90, long: 85 },
      }),
    ).toBe(81);
  });

  it('scores reactivity from reaction time and penalizes errors', () => {
    expect(
      normalizeAxis({
        axis: AxisType.REACTIVITY,
        meanReactionTimeMs: 250,
        reactionTimeSd: 30,
        anticipations: 0,
        omissions: 0,
        inhibitionErrors: 0,
        fatigueDriftMsPerMin: 1,
      }),
    ).toBe(100);
    expect(
      normalizeAxis({
        axis: AxisType.REACTIVITY,
        meanReactionTimeMs: 425,
        reactionTimeSd: 40,
        anticipations: 1,
        omissions: 1,
        inhibitionErrors: 0,
        fatigueDriftMsPerMin: 2,
      }),
    ).toBe(46);
  });

  it('scores motor skills from course averages minus penalties', () => {
    expect(
      normalizeAxis({
        axis: AxisType.MOTOR_SKILLS,
        scoresByCourse: [80, 80, 80],
        avgPrecisionPx: 3,
        exits: 0,
        handIndependence: 0,
      }),
    ).toBe(80);
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
