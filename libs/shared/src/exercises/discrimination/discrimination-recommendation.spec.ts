import { describe, expect, it } from 'vitest';
import { RecommendationPriority } from '../../enums';
import { getDiscriminationRecommendation } from './discrimination-recommendation';
import {
  DiscriminationOutcome,
  DiscriminationSessionScore,
} from './discrimination-scoring';

function scored(
  overrides: Partial<DiscriminationSessionScore>,
): DiscriminationSessionScore {
  return {
    score: 78,
    outcomes: Array.from({ length: 36 }, () => 'TRUE_POSITIVE' as DiscriminationOutcome),
    correctCount: 30,
    wrongIdenticalCount: 0,
    wrongDifferentCount: 0,
    unansweredCount: 0,
    avgAnswerTimeMs: 4100,
    correctAnswerAvgMs: 900,
    wrongAnswerAvgMs: null,
    ...overrides,
  };
}

describe('getDiscriminationRecommendation', () => {
  it('flags the pace first when too many trials were not reached', () => {
    const recommendation = getDiscriminationRecommendation(
      scored({ unansweredCount: 5, wrongIdenticalCount: 4 }),
    );
    expect(recommendation.id).toBe('DISCRIMINATION_PACE');
    expect(recommendation.label).toBe(
      "5 essais non atteints - gardez un rythme de décision constant jusqu'au bout",
    );
    expect(recommendation.priority).toBe(RecommendationPriority.HIGH);
  });

  it('points at missed differences when answered misses dominate false alarms', () => {
    const recommendation = getDiscriminationRecommendation(
      scored({ wrongIdenticalCount: 4, wrongDifferentCount: 3 }),
    );
    expect(recommendation.id).toBe('DISCRIMINATION_MISSED_DIFFERENCES');
    expect(recommendation.label).toBe(
      'Vous répondez "identiques" trop vite - 4 paires différentes vous ont échappé : balayez chaque paire jusqu\'au bout',
    );
    expect(recommendation.priority).toBe(RecommendationPriority.MEDIUM);
  });

  it('points at false alarms when they dominate misses', () => {
    const recommendation = getDiscriminationRecommendation(
      scored({ wrongIdenticalCount: 1, wrongDifferentCount: 4 }),
    );
    expect(recommendation.id).toBe('DISCRIMINATION_FALSE_ALARMS');
    expect(recommendation.priority).toBe(RecommendationPriority.MEDIUM);
  });

  it('detects errors correlated with rushed answers', () => {
    const recommendation = getDiscriminationRecommendation(
      scored({
        wrongIdenticalCount: 2,
        wrongDifferentCount: 2,
        correctAnswerAvgMs: 1200,
        wrongAnswerAvgMs: 500,
      }),
    );
    expect(recommendation.id).toBe('DISCRIMINATION_RUSH');
    expect(recommendation.priority).toBe(RecommendationPriority.MEDIUM);
  });

  it('encourages a reliable session otherwise', () => {
    const recommendation = getDiscriminationRecommendation(scored({}));
    expect(recommendation.id).toBe('DISCRIMINATION_KEEP_GOING');
    expect(recommendation.priority).toBe(RecommendationPriority.LOW);
  });
});
