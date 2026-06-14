import { describe, expect, it } from 'vitest';
import { BadgeEvaluationState } from './badge.catalog';
import { evaluateUnlockedBadges, isFlawlessVisualMetrics } from './badge.logic';

function buildState(
  overrides: Partial<BadgeEvaluationState> = {},
): BadgeEvaluationState {
  return {
    currentStreak: 0,
    completedSessions: 0,
    hasCompletedFullSession: false,
    bestGlobalScore: null,
    bestAxisScore: null,
    completedAxesCount: 0,
    flawlessVisualDiscrimination: false,
    ...overrides,
  };
}

const NONE = new Set<string>();

describe('evaluateUnlockedBadges streak rules', () => {
  it('unlocks only the reached streak tiers', () => {
    const unlocked = evaluateUnlockedBadges(buildState({ currentStreak: 30 }), NONE);
    expect(unlocked).toContain('STREAK_7');
    expect(unlocked).toContain('STREAK_14');
    expect(unlocked).toContain('STREAK_30');
    expect(unlocked).not.toContain('STREAK_60');
    expect(unlocked).not.toContain('STREAK_100');
  });
});

describe('evaluateUnlockedBadges performance rules', () => {
  it('unlocks the 70 tier but not the 80 tier at a global score of 75', () => {
    const unlocked = evaluateUnlockedBadges(buildState({ bestGlobalScore: 75 }), NONE);
    expect(unlocked).toContain('PERFORMANCE_SCORE_70');
    expect(unlocked).not.toContain('PERFORMANCE_SCORE_80');
  });

  it('unlocks both performance tiers at a global score of 85', () => {
    const unlocked = evaluateUnlockedBadges(buildState({ bestGlobalScore: 85 }), NONE);
    expect(unlocked).toContain('PERFORMANCE_SCORE_70');
    expect(unlocked).toContain('PERFORMANCE_SCORE_80');
  });

  it('unlocks the perfect axis badge at a score of 100', () => {
    expect(
      evaluateUnlockedBadges(buildState({ bestAxisScore: 100 }), NONE),
    ).toContain('PERFORMANCE_AXIS_PERFECT');
    expect(
      evaluateUnlockedBadges(buildState({ bestAxisScore: 99 }), NONE),
    ).not.toContain('PERFORMANCE_AXIS_PERFECT');
  });
});

describe('evaluateUnlockedBadges volume rules', () => {
  it('unlocks the first simulation badge after a full session', () => {
    expect(
      evaluateUnlockedBadges(buildState({ hasCompletedFullSession: true }), NONE),
    ).toContain('VOLUME_FIRST_SIMULATION');
  });

  it('unlocks volume tiers by session count', () => {
    const ten = evaluateUnlockedBadges(buildState({ completedSessions: 10 }), NONE);
    expect(ten).toContain('VOLUME_10_SESSIONS');
    expect(ten).not.toContain('VOLUME_50_SESSIONS');
    const fifty = evaluateUnlockedBadges(buildState({ completedSessions: 50 }), NONE);
    expect(fifty).toContain('VOLUME_10_SESSIONS');
    expect(fifty).toContain('VOLUME_50_SESSIONS');
  });
});

describe('evaluateUnlockedBadges mastery rules', () => {
  it('unlocks the all-axes badge once the five axes are completed', () => {
    expect(
      evaluateUnlockedBadges(buildState({ completedAxesCount: 5 }), NONE),
    ).toContain('MASTERY_ALL_AXES');
    expect(
      evaluateUnlockedBadges(buildState({ completedAxesCount: 4 }), NONE),
    ).not.toContain('MASTERY_ALL_AXES');
  });

  it('unlocks the flawless visual badge on a perfect visual run', () => {
    expect(
      evaluateUnlockedBadges(buildState({ flawlessVisualDiscrimination: true }), NONE),
    ).toContain('MASTERY_VISUAL_FLAWLESS');
  });
});

describe('evaluateUnlockedBadges idempotence', () => {
  it('never re-unlocks an already obtained badge', () => {
    const state = buildState({ currentStreak: 14 });
    const already = new Set(['STREAK_7']);
    const unlocked = evaluateUnlockedBadges(state, already);
    expect(unlocked).not.toContain('STREAK_7');
    expect(unlocked).toContain('STREAK_14');
  });

  it('returns nothing when no condition is met', () => {
    expect(evaluateUnlockedBadges(buildState(), NONE)).toEqual([]);
  });
});

describe('isFlawlessVisualMetrics', () => {
  it('is flawless when every visual trial is correct', () => {
    expect(isFlawlessVisualMetrics({ truePositives: 18, trueNegatives: 18 })).toBe(true);
    expect(isFlawlessVisualMetrics({ truePositives: 36, trueNegatives: 0 })).toBe(true);
  });

  it('is not flawless when any trial is missed', () => {
    expect(isFlawlessVisualMetrics({ truePositives: 17, trueNegatives: 18 })).toBe(false);
  });

  it('is not flawless for malformed metrics', () => {
    expect(isFlawlessVisualMetrics(null)).toBe(false);
    expect(isFlawlessVisualMetrics({})).toBe(false);
  });
});
