import { describe, expect, it } from 'vitest';
import { ReactivityStimulusAnswerDto } from '../../dtos/session';
import {
  ReactivityCommand,
  ReactivityStimulus,
  ReactivityStimulusType,
} from './reactivity-stimulus';
import { scoreReactivitySession } from './reactivity-scoring';

function stimulus(
  index: number,
  type: ReactivityStimulusType,
  appearAtMs: number,
): ReactivityStimulus {
  return { index, type, appearAtMs, position: { fx: 0, fy: 0 } };
}

function answer(
  index: number,
  commandPressed: ReactivityCommand | null,
  trMs: number | null,
): ReactivityStimulusAnswerDto {
  return { index, commandPressed, trMs };
}

describe('scoreReactivitySession', () => {
  const sequence = [
    stimulus(0, 'YELLOW', 3000),
    stimulus(1, 'YELLOW', 8000),
    stimulus(2, 'BLUE', 70000),
    stimulus(3, 'BLUE', 80000),
    stimulus(4, 'RED', 130000),
  ];

  it('classifies each stimulus', () => {
    const scored = scoreReactivitySession(
      sequence,
      [
        answer(0, 'LEFT', 400),
        answer(1, 'LEFT', 100),
        answer(2, 'LEFT', 500),
        answer(3, null, null),
        answer(4, 'SPACE', 600),
      ],
      [],
    );
    expect(scored.classifications).toEqual([
      'VALID',
      'ANTICIPATION',
      'WRONG_COMMAND',
      'OMISSION',
      'VALID',
    ]);
    expect(scored.wrongCommandCount).toBe(1);
    expect(scored.omissionCount).toBe(1);
    expect(scored.anticipationCount).toBe(1);
  });

  it('computes mean and standard deviation on valid responses only', () => {
    const scored = scoreReactivitySession(
      sequence,
      [
        answer(0, 'LEFT', 400),
        answer(1, 'LEFT', 600),
        answer(2, 'LEFT', 500),
        answer(3, 'RIGHT', 5),
        answer(4, null, null),
      ],
      [],
    );
    expect(scored.trMoyMs).toBe(500);
    expect(scored.sdMs).toBe(Math.round(Math.sqrt(10000)));
  });

  it('adds wait presses to the anticipation count', () => {
    const scored = scoreReactivitySession(
      sequence,
      sequence.map(({ index }) => answer(index, null, null)),
      [{ atMs: 5000 }, { atMs: 9000 }],
    );
    expect(scored.anticipationCount).toBe(2);
  });

  it('weights speed, stability and accuracy into a clamped rounded score', () => {
    const perfect = scoreReactivitySession(
      sequence,
      [
        answer(0, 'LEFT', 300),
        answer(1, 'LEFT', 300),
        answer(2, 'RIGHT', 300),
        answer(3, 'RIGHT', 300),
        answer(4, 'SPACE', 300),
      ],
      [],
    );
    expect(perfect.score).toBe(100);

    const nothing = scoreReactivitySession(
      sequence,
      sequence.map(({ index }) => answer(index, null, null)),
      [],
    );
    expect(nothing.score).toBe(0);
  });

  it('smooths the trend with a centered window of five valid points', () => {
    const times = [400, 500, 600, 500, 400, 300];
    const bigSequence = times.map((_, position) =>
      stimulus(position, 'YELLOW', 3000 + position * 4000),
    );
    const scored = scoreReactivitySession(
      bigSequence,
      times.map((trMs, position) => answer(position, 'LEFT', trMs)),
      [],
    );
    expect(scored.trend.map(({ trMs }) => Math.round(trMs))).toEqual([
      500,
      500,
      480,
      460,
      450,
      400,
    ]);
    expect(scored.trend.map(({ appearAtMs }) => appearAtMs)).toEqual(
      bigSequence.map(({ appearAtMs }) => appearAtMs),
    );
  });
});
