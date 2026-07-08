import { describe, expect, it } from 'vitest';
import { RecommendationPriority } from '../../enums';
import { getReactivityRecommendation } from './reactivity-recommendation';
import {
  ReactivitySessionScore,
  ReactivityStimulusPoint,
  ReactivityTrendPoint,
} from './reactivity-scoring';

function point(
  appearAtMs: number,
  classification: ReactivityStimulusPoint['classification'],
  trMs: number | null = 400,
): ReactivityStimulusPoint {
  return { appearAtMs, trMs, classification };
}

function flatTrend(count: number, trMs: number): ReactivityTrendPoint[] {
  return Array.from({ length: count }, (_, position) => ({
    appearAtMs: 3000 + position * 4000,
    trMs,
  }));
}

function scored(
  overrides: Partial<ReactivitySessionScore>,
): ReactivitySessionScore {
  return {
    score: 74,
    classifications: [],
    trMoyMs: 342,
    sdMs: 74,
    wrongCommandCount: 0,
    anticipationCount: 0,
    omissionCount: 0,
    points: [point(3000, 'VALID'), point(70000, 'VALID')],
    trend: flatTrend(10, 400),
    ...overrides,
  };
}

describe('getReactivityRecommendation', () => {
  it('flags wrong commands concentrated in the red phase first', () => {
    const recommendation = getReactivityRecommendation(
      scored({
        wrongCommandCount: 3,
        anticipationCount: 2,
        points: [
          point(10000, 'WRONG_COMMAND'),
          point(125000, 'WRONG_COMMAND'),
          point(150000, 'WRONG_COMMAND'),
        ],
      }),
    );
    expect(recommendation.id).toBe('REACTIVITY_RED_COMMAND');
    expect(recommendation.label).toBe(
      "Les mauvaises commandes se concentrent après l'arrivée du signal rouge - consolidez la commande Espace",
    );
    expect(recommendation.priority).toBe(RecommendationPriority.HIGH);
  });

  it('points at endurance when the smoothed trend rises', () => {
    const rising = [
      ...flatTrend(5, 350),
      ...flatTrend(5, 450).map((entry, position) => ({
        ...entry,
        appearAtMs: 100000 + position * 4000,
      })),
    ];
    const recommendation = getReactivityRecommendation(
      scored({ trend: rising }),
    );
    expect(recommendation.id).toBe('REACTIVITY_ENDURANCE');
  });

  it('mentions anticipations when some presses came too early', () => {
    const recommendation = getReactivityRecommendation(
      scored({ anticipationCount: 2 }),
    );
    expect(recommendation.id).toBe('REACTIVITY_ANTICIPATION');
    expect(recommendation.label).toBe(
      "2 appuis trop tôt - attendez l'apparition du signal avant de réagir",
    );
  });

  it('targets stability when the deviation is high relative to the mean', () => {
    const recommendation = getReactivityRecommendation(
      scored({ trMoyMs: 400, sdMs: 160 }),
    );
    expect(recommendation.id).toBe('REACTIVITY_STABILITY');
  });

  it('encourages a solid session otherwise', () => {
    const recommendation = getReactivityRecommendation(scored({}));
    expect(recommendation.id).toBe('REACTIVITY_KEEP_GOING');
    expect(recommendation.priority).toBe(RecommendationPriority.LOW);
  });
});
