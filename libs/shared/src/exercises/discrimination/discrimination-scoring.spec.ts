import { describe, expect, it } from 'vitest';
import { DiscriminationTrialAnswerDto } from '../../dtos/session';
import { DiscriminationAnswer } from '../../dtos/session';
import { DiscriminationTrial } from './discrimination-trial';
import { scoreDiscriminationSession } from './discrimination-scoring';

function trial(index: number, identical: boolean): DiscriminationTrial {
  return {
    index,
    a: [{ kind: 'CHAR', value: '7' }],
    b: [{ kind: 'CHAR', value: identical ? '7' : '1' }],
    identical,
    offsetA: { fx: 0, fy: 0 },
    offsetB: { fx: 0, fy: 0 },
  };
}

function answer(
  index: number,
  value: DiscriminationAnswer | null,
  timeMs: number,
): DiscriminationTrialAnswerDto {
  return { index, answer: value, timeMs };
}

function makeTrials(identicalCount: number, differentCount: number) {
  const trials: DiscriminationTrial[] = [];
  for (let index = 0; index < identicalCount; index += 1) {
    trials.push(trial(trials.length, true));
  }
  for (let index = 0; index < differentCount; index += 1) {
    trials.push(trial(trials.length, false));
  }
  return trials;
}

describe('scoreDiscriminationSession', () => {
  it('classifies each trial as signal detection outcome', () => {
    const trials = makeTrials(2, 2);
    const scored = scoreDiscriminationSession(trials, [
      answer(0, 'IDENTICAL', 800),
      answer(1, 'DIFFERENT', 800),
      answer(2, 'DIFFERENT', 800),
      answer(3, 'IDENTICAL', 800),
    ]);
    expect(scored.outcomes).toEqual([
      'TRUE_NEGATIVE',
      'FALSE_POSITIVE',
      'TRUE_POSITIVE',
      'FALSE_NEGATIVE',
    ]);
    expect(scored.correctCount).toBe(2);
    expect(scored.wrongIdenticalCount).toBe(1);
    expect(scored.wrongDifferentCount).toBe(1);
    expect(scored.unansweredCount).toBe(0);
  });

  it('counts an unanswered trial as a miss for the score but as unanswered for the ui', () => {
    const trials = makeTrials(1, 1);
    const scored = scoreDiscriminationSession(trials, [
      answer(0, 'IDENTICAL', 700),
      answer(1, null, 0),
    ]);
    expect(scored.outcomes).toEqual(['TRUE_NEGATIVE', 'FALSE_NEGATIVE']);
    expect(scored.wrongIdenticalCount).toBe(0);
    expect(scored.unansweredCount).toBe(1);
  });

  it('computes decision speed on correct answers only', () => {
    const trials = makeTrials(2, 2);
    const fastCorrect = scoreDiscriminationSession(trials, [
      answer(0, 'IDENTICAL', 300),
      answer(1, 'IDENTICAL', 300),
      answer(2, 'DIFFERENT', 300),
      answer(3, 'IDENTICAL', 20_000),
    ]);
    expect(fastCorrect.correctAnswerAvgMs).toBe(300);
    expect(fastCorrect.avgAnswerTimeMs).toBe(Math.round(20_900 / 4));
    expect(fastCorrect.score).toBe(Math.round(0.7 * 75 + 0.3 * 100));
  });

  it('triggers the false-alarm penalty only above the threshold', () => {
    const trials = makeTrials(10, 0);
    const twoFalseAlarms = scoreDiscriminationSession(
      trials,
      trials.map(({ index }) =>
        answer(index, index < 2 ? 'DIFFERENT' : 'IDENTICAL', 300),
      ),
    );
    expect(twoFalseAlarms.score).toBe(Math.round(0.7 * 80 + 0.3 * 100));

    const fourFalseAlarms = scoreDiscriminationSession(
      trials,
      trials.map(({ index }) =>
        answer(index, index < 4 ? 'DIFFERENT' : 'IDENTICAL', 300),
      ),
    );
    expect(fourFalseAlarms.score).toBe(
      Math.round(0.7 * 60 + 0.3 * 100 - (40 - 20) * 0.5),
    );
  });

  it('reaches 100 on a perfect fast session and 0 on a fully missed one', () => {
    const trials = makeTrials(18, 18);
    const perfect = scoreDiscriminationSession(
      trials,
      trials.map((entry) =>
        answer(entry.index, entry.identical ? 'IDENTICAL' : 'DIFFERENT', 300),
      ),
    );
    expect(perfect.score).toBe(100);

    const nothing = scoreDiscriminationSession(trials, []);
    expect(nothing.score).toBe(0);
    expect(nothing.unansweredCount).toBe(36);
    expect(nothing.avgAnswerTimeMs).toBeNull();
  });
});
