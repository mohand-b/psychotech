import { AxisType, RecommendationPriority, ScoreBand } from '@psychotech/shared';
import { describe, expect, it } from 'vitest';
import {
  AxisScore,
  SessionThresholds,
  buildRecommendations,
  evaluateSession,
  weightedGlobalScore,
} from './scoring.logic';

const RAILWAY_THRESHOLDS: SessionThresholds = {
  admissibilityThreshold: 70,
  vigilanceThreshold: 65,
  eliminatoryThreshold: 55,
};

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
      { axis: AxisType.MOTOR_SKILLS, score: 63, coefficient: 1, isCritical: false },
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
    expect(recommendations[2].priority).toBe(RecommendationPriority.MEDIUM);
    expect(recommendations[2].code).toBe('AXIS_BELOW_VIGILANCE');
  });

  it('produces no recommendation for axes at or above the vigilance threshold', () => {
    const scores: AxisScore[] = [
      { axis: AxisType.LOGIC, score: 88, coefficient: 1, isCritical: false },
      { axis: AxisType.MOTOR_SKILLS, score: 68, coefficient: 1, isCritical: false },
    ];
    expect(buildRecommendations(scores, RAILWAY_THRESHOLDS)).toEqual([]);
  });
});