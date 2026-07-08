import { describe, expect, it } from 'vitest';
import { RecommendationPriority } from '../../enums';
import { getMemoryRecommendation } from './memory-recommendation';
import { MemorySessionScore } from './memory-scoring';

function scored(overrides: Partial<MemorySessionScore>): MemorySessionScore {
  return {
    score: 70,
    results: [],
    perfectCount: 3,
    perfectNormalCount: 2,
    perfectInverseCount: 1,
    restitutedPct: 80,
    placedPct: 70,
    timedOutCount: 0,
    positionReliability: [100, 90, 80, 80, 70, 70],
    normalAvg: 0.8,
    inverseAvg: 0.8,
    misplacedCount: 0,
    absentCount: 0,
    ...overrides,
  };
}

describe('getMemoryRecommendation', () => {
  it('flags a marked normal/inverse gap first, with a high priority', () => {
    const recommendation = getMemoryRecommendation(
      scored({ normalAvg: 0.9, inverseAvg: 0.5, misplacedCount: 5 }),
    );
    expect(recommendation.id).toBe('MEMORY_INVERSE_GAP');
    expect(recommendation.priority).toBe(RecommendationPriority.HIGH);
  });

  it('points at fragile ordering and cites the weakest positions under 60%', () => {
    const recommendation = getMemoryRecommendation(
      scored({
        misplacedCount: 6,
        absentCount: 2,
        positionReliability: [100, 90, 55, 40, 80, 90],
      }),
    );
    expect(recommendation.id).toBe('MEMORY_ORDER_FRAGILE');
    expect(recommendation.label).toBe(
      'Éléments retenus mais ordre fragile — les positions 3 et 4 vous échappent',
    );
    expect(recommendation.priority).toBe(RecommendationPriority.MEDIUM);
  });

  it('falls back to the generic fragile-order wording when no position is weak', () => {
    const recommendation = getMemoryRecommendation(
      scored({ misplacedCount: 4, absentCount: 1 }),
    );
    expect(recommendation.label).toBe(
      'Éléments retenus mais ordre fragile — le milieu des séquences vous échappe',
    );
  });

  it('mentions pace when restitutions timed out', () => {
    const recommendation = getMemoryRecommendation(
      scored({ timedOutCount: 2 }),
    );
    expect(recommendation.id).toBe('MEMORY_PACE');
    expect(recommendation.label).toBe(
      '2 restitutions hors délai — entraînez un rythme de saisie plus régulier',
    );
  });

  it('encourages an even performance otherwise', () => {
    const recommendation = getMemoryRecommendation(scored({}));
    expect(recommendation.id).toBe('MEMORY_KEEP_GOING');
    expect(recommendation.priority).toBe(RecommendationPriority.LOW);
  });
});
