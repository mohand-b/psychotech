import { describe, expect, it } from 'vitest';
import { LogicItemAnswerDto } from '../../dtos/session';
import { ScoreBand } from '../../enums';
import { generateLogicSession } from './generate-logic-session';
import { LogicDifficulty, LogicItem } from './logic-item';
import { avisFromScore, scoreLogicSession } from './logic-scoring';

function makeItem(index: number, difficulty: LogicDifficulty): LogicItem {
  return {
    index,
    ruleId: 'arithmetic-constant-step',
    difficulty,
    sequence: ['1', '2', '3', '4', '5'],
    choices: ['6', '7', '8', '9'],
    answerIndex: 0,
    points: difficulty,
  };
}

function answer(
  index: number,
  answerIndex: number | null,
  timeMs: number,
  visited = true,
): LogicItemAnswerDto {
  return { index, answerIndex, timeMs, helpUsed: false, visited };
}

describe('scoreLogicSession', () => {
  const items = [makeItem(0, 1), makeItem(1, 2), makeItem(2, 3), makeItem(3, 4)];

  it('classifies each item as correct, wrong, skipped or unreached', () => {
    const scored = scoreLogicSession(items, [
      answer(0, 0, 2000),
      answer(1, 2, 1000),
      answer(2, null, 4000),
    ]);
    expect(scored.statuses).toEqual(['CORRECT', 'WRONG', 'SKIPPED', 'UNREACHED']);
    expect(scored.correctCount).toBe(1);
    expect(scored.wrongCount).toBe(1);
    expect(scored.skippedCount).toBe(1);
    expect(scored.unreachedCount).toBe(1);
  });

  it('treats an unvisited null answer as unreached, not skipped', () => {
    const scored = scoreLogicSession(items, [
      answer(0, 0, 2000),
      answer(1, null, 0, false),
    ]);
    expect(scored.statuses).toEqual(['CORRECT', 'UNREACHED', 'UNREACHED', 'UNREACHED']);
  });

  it('counts a given answer as reached even without the visited flag', () => {
    const scored = scoreLogicSession(items, [
      answer(0, 0, 2000, false),
      answer(1, 1, 1000, false),
    ]);
    expect(scored.statuses).toEqual(['CORRECT', 'WRONG', 'UNREACHED', 'UNREACHED']);
    expect(scored.avgAnswerTimeMs).toBe(1500);
  });

  it('weights precision by item points and coverage by reached items', () => {
    const scored = scoreLogicSession(items, [
      answer(0, 0, 2000),
      answer(1, 2, 1000),
      answer(2, null, 4000),
    ]);
    expect(scored.precision).toBeCloseTo(10, 5);
    expect(scored.coverage).toBeCloseTo(75, 5);
    expect(scored.score).toBe(20);
  });

  it('averages answer time over given answers only', () => {
    const scored = scoreLogicSession(items, [
      answer(0, 0, 2000),
      answer(1, 2, 1000),
      answer(2, null, 4000),
    ]);
    expect(scored.avgAnswerTimeMs).toBe(1500);
  });

  it('returns a null average time when no answer was given', () => {
    const scored = scoreLogicSession(items, [answer(0, null, 3000)]);
    expect(scored.avgAnswerTimeMs).toBeNull();
  });

  it('scores 100 when everything is correct and 0 when nothing was reached', () => {
    const allCorrect = items.map((item) => answer(item.index, item.answerIndex, 1000));
    expect(scoreLogicSession(items, allCorrect).score).toBe(100);
    const empty = scoreLogicSession(items, []);
    expect(empty.score).toBe(0);
    expect(empty.precision).toBe(0);
    expect(empty.coverage).toBe(0);
  });

  it('applies the 120-point referential on a generated session', () => {
    const generated = generateLogicSession('scoring-seed');
    expect(generated.reduce((sum, item) => sum + item.points, 0)).toBe(120);
    const responses = generated.map((item) =>
      item.difficulty === 1
        ? answer(item.index, item.answerIndex, 1000)
        : answer(item.index, null, 1000),
    );
    const scored = scoreLogicSession(generated, responses);
    expect(scored.precision).toBeCloseTo((8 / 120) * 100, 5);
    expect(scored.coverage).toBe(100);
    expect(scored.score).toBe(21);
  });
});

describe('avisFromScore', () => {
  it('maps scores to the shared bands at the 80/70/60 thresholds', () => {
    expect(avisFromScore(100)).toBe(ScoreBand.EXCELLENT);
    expect(avisFromScore(80)).toBe(ScoreBand.EXCELLENT);
    expect(avisFromScore(79)).toBe(ScoreBand.ACCEPTABLE);
    expect(avisFromScore(70)).toBe(ScoreBand.ACCEPTABLE);
    expect(avisFromScore(69)).toBe(ScoreBand.FRAGILE);
    expect(avisFromScore(60)).toBe(ScoreBand.FRAGILE);
    expect(avisFromScore(59)).toBe(ScoreBand.INSUFFICIENT);
    expect(avisFromScore(0)).toBe(ScoreBand.INSUFFICIENT);
  });
});
