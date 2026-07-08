import { describe, expect, it } from 'vitest';
import { LogicItemAnswerDto } from '../../dtos/session';
import { RecommendationPriority } from '../../enums';
import { LogicDifficulty, LogicItem } from './logic-item';
import { getLogicRecommendation } from './logic-recommendation';
import { scoreLogicSession } from './logic-scoring';

function makeItems(count: number): LogicItem[] {
  return Array.from({ length: count }, (_, index) => ({
    index,
    ruleId: 'arithmetic-constant-step',
    difficulty: 1 as LogicDifficulty,
    sequence: ['1', '2', '3', '4', '5'],
    choices: ['6', '7', '8', '9'],
    answerIndex: 0,
    points: 1,
  }));
}

function answer(
  index: number,
  answerIndex: number | null,
  timeMs: number,
  visited = true,
): LogicItemAnswerDto {
  return { index, answerIndex, timeMs, helpUsed: false, visited };
}

function recommendationFor(items: LogicItem[], responses: LogicItemAnswerDto[]) {
  return getLogicRecommendation(scoreLogicSession(items, responses), responses);
}

describe('getLogicRecommendation', () => {
  const items = makeItems(30);

  it('flags unreached items first, with a high priority', () => {
    const responses = items
      .slice(0, 27)
      .map((item) => answer(item.index, 0, 1000));
    const recommendation = recommendationFor(items, responses);
    expect(recommendation.id).toBe('LOGIC_PACE_UNREACHED');
    expect(recommendation.label).toBe(
      '3 items non atteints - surveillez votre rythme',
    );
    expect(recommendation.priority).toBe(RecommendationPriority.HIGH);
  });

  it('uses the singular form for one unreached item', () => {
    const responses = items
      .slice(0, 29)
      .map((item) => answer(item.index, 0, 1000));
    expect(recommendationFor(items, responses).label).toBe(
      '1 item non atteint - surveillez votre rythme',
    );
  });

  it('detects a late slowdown when errors concentrate at the end while times grow', () => {
    const responses = items.map((item) =>
      item.index < 20
        ? answer(item.index, 0, 1000)
        : answer(item.index, item.index < 24 ? 0 : 1, 3000),
    );
    const recommendation = recommendationFor(items, responses);
    expect(recommendation.id).toBe('LOGIC_LATE_SLOWDOWN');
    expect(recommendation.priority).toBe(RecommendationPriority.MEDIUM);
  });

  it('recommends working on accuracy when errors are spread out', () => {
    const responses = items.map((item) =>
      item.index % 3 === 0
        ? answer(item.index, 1, 1000)
        : answer(item.index, 0, 1000),
    );
    const recommendation = recommendationFor(items, responses);
    expect(recommendation.id).toBe('LOGIC_ACCURACY');
    expect(recommendation.priority).toBe(RecommendationPriority.MEDIUM);
  });

  it('falls back to a neutral encouragement on a clean session', () => {
    const responses = items.map((item) => answer(item.index, 0, 1000));
    const recommendation = recommendationFor(items, responses);
    expect(recommendation.id).toBe('LOGIC_KEEP_GOING');
    expect(recommendation.priority).toBe(RecommendationPriority.LOW);
  });
});
