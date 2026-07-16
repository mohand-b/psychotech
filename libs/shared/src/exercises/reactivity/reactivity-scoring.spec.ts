import { describe, expect, it } from 'vitest';
import { ReactivityStimulusAnswerDto } from '../../dtos/session';
import { generateReactivitySession } from './generate-reactivity-session';
import {
  REACTIVITY_COMMAND_BY_TYPE,
  ReactivityCommand,
  ReactivityStimulus,
  ReactivityStimulusType,
} from './reactivity-stimulus';
import {
  REACTIVITY_ACCURACY_WEIGHT,
  REACTIVITY_SPEED_BEST_MS,
  REACTIVITY_SPEED_WEIGHT,
  REACTIVITY_SPEED_WORST_MS,
  REACTIVITY_STABILITY_BEST_MS,
  REACTIVITY_STABILITY_WEIGHT,
  REACTIVITY_STABILITY_WORST_MS,
  scoreReactivitySession,
} from './reactivity-scoring';

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

  it('ignores the phase structure when the candidate is steady within each phase', () => {
    const times = [300, 300, 310, 450, 450, 460, 600, 600, 610];
    const appearAts = [
      3000, 20000, 40000, 70000, 90000, 110000, 130000, 150000, 170000,
    ];
    const types: ReactivityStimulusType[] = [
      'YELLOW',
      'YELLOW',
      'YELLOW',
      'BLUE',
      'YELLOW',
      'BLUE',
      'RED',
      'BLUE',
      'YELLOW',
    ];
    const commands: Record<ReactivityStimulusType, ReactivityCommand> = {
      YELLOW: 'LEFT',
      BLUE: 'RIGHT',
      RED: 'SPACE',
    };
    const bigSequence = appearAts.map((appearAtMs, position) =>
      stimulus(position, types[position], appearAtMs),
    );
    const scored = scoreReactivitySession(
      bigSequence,
      times.map((trMs, position) =>
        answer(position, commands[types[position]], trMs),
      ),
      [],
    );
    expect(scored.sdMs).toBeLessThan(10);
  });

  it('feeds the stability term with the returned intra-phase deviation, never a global one', () => {
    const times = [400, 420, 410, 700, 720, 710, 1000, 1020, 1010];
    const appearAts = [
      3000, 20000, 40000, 70000, 90000, 110000, 130000, 150000, 170000,
    ];
    const types: ReactivityStimulusType[] = [
      'YELLOW',
      'YELLOW',
      'YELLOW',
      'BLUE',
      'YELLOW',
      'BLUE',
      'RED',
      'BLUE',
      'YELLOW',
    ];
    const commands: Record<ReactivityStimulusType, ReactivityCommand> = {
      YELLOW: 'LEFT',
      BLUE: 'RIGHT',
      RED: 'SPACE',
    };
    const bigSequence = appearAts.map((appearAtMs, position) =>
      stimulus(position, types[position], appearAtMs),
    );
    const scored = scoreReactivitySession(
      bigSequence,
      times.map((trMs, position) =>
        answer(position, commands[types[position]], trMs),
      ),
      [],
    );
    const norm = (value: number, best: number, worst: number) =>
      100 * Math.min(1, Math.max(0, (worst - value) / (worst - best)));
    const mean = times.reduce((sum, value) => sum + value, 0) / times.length;
    const globalSd = Math.sqrt(
      times.reduce((sum, value) => sum + (value - mean) ** 2, 0) / times.length,
    );
    const scoreFrom = (sd: number) =>
      Math.round(
        REACTIVITY_SPEED_WEIGHT *
          norm(mean, REACTIVITY_SPEED_BEST_MS, REACTIVITY_SPEED_WORST_MS) +
          REACTIVITY_STABILITY_WEIGHT *
            norm(
              sd,
              REACTIVITY_STABILITY_BEST_MS,
              REACTIVITY_STABILITY_WORST_MS,
            ) +
          REACTIVITY_ACCURACY_WEIGHT * 100,
      );
    expect(scored.sdMs).toBeLessThan(15);
    expect(globalSd).toBeGreaterThan(REACTIVITY_STABILITY_WORST_MS);
    expect(scored.score).toBe(scoreFrom(scored.sdMs as number));
    expect(scored.score).not.toBe(scoreFrom(globalSd));
  });

  it('weights per-phase deviations by their valid counts and skips sparse phases', () => {
    const sequence = [
      stimulus(0, 'YELLOW', 3000),
      stimulus(1, 'YELLOW', 20000),
      stimulus(2, 'BLUE', 70000),
    ];
    const scored = scoreReactivitySession(
      sequence,
      [
        answer(0, 'LEFT', 400),
        answer(1, 'LEFT', 500),
        answer(2, 'RIGHT', 1200),
      ],
      [],
    );
    expect(scored.sdMs).toBe(50);
  });

  it('returns a null deviation when no phase has enough valid responses', () => {
    const sequence = [
      stimulus(0, 'YELLOW', 3000),
      stimulus(1, 'BLUE', 70000),
      stimulus(2, 'RED', 130000),
    ];
    const scored = scoreReactivitySession(
      sequence,
      [
        answer(0, 'LEFT', 300),
        answer(1, 'RIGHT', 300),
        answer(2, 'SPACE', 300),
      ],
      [],
    );
    expect(scored.sdMs).toBeNull();
    expect(scored.trMoyMs).toBe(300);
    expect(scored.score).toBe(Math.round(0.5 * 100 + 0.2 * 100));
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

  it('collapses the score of fast responses when most stimuli go unhandled', () => {
    const generated = generateReactivitySession('mostly-missed-seed');
    const answered = generated.slice(0, Math.floor(generated.length / 5));
    const scored = scoreReactivitySession(
      generated,
      answered.map(({ index, type }) =>
        answer(index, REACTIVITY_COMMAND_BY_TYPE[type], 300),
      ),
      [],
    );
    const errorRate = (scored.omissionCount / generated.length) * 100;
    expect(errorRate).toBeGreaterThan(75);
    expect(scored.score).toBeLessThanOrEqual(Math.round(100 - errorRate));
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

  it('scales the error rate to the dynamically generated stimulus count', () => {
    const generated = generateReactivitySession('isi-count-seed');
    const scored = scoreReactivitySession(generated, [], []);
    expect(scored.omissionCount).toBe(generated.length);
    expect(generated.length).toBeGreaterThanOrEqual(88);
    expect(scored.score).toBe(0);
  });
});
