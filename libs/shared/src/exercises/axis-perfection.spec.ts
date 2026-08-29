import { describe, expect, it } from 'vitest';
import { AXIS_TRAINING } from '../domain';
import { AxisType, LogicFamily, MemoryPhase } from '../enums';
import {
  MemorySequenceAnswerDto,
  MotricitySampleDto,
} from '../dtos/session';
import {
  discriminationPerfectionAchieved,
  logicPerfectionAchieved,
  memoryPerfectionAchieved,
  motricityExitFreeAchieved,
  motricityPerfectionAchieved,
  reactivityPerfectionAchieved,
} from './axis-perfection';
import {
  LogicNumericStructure,
  generateLogicSession,
  scoreLogicSession,
} from './logic';
import {
  expectedMemoryAnswer,
  generateMemorySession,
  scoreMemorySession,
} from './memory';
import {
  generateDiscriminationSession,
  scoreDiscriminationSession,
} from './discrimination';
import {
  REACTIVITY_COMMAND_BY_TYPE,
  generateReactivitySession,
  scoreReactivitySession,
} from './reactivity';
import {
  MOTRICITY_CURSOR_SPEED_UNITS_PER_SEC,
  MOTRICITY_SAMPLE_INTERVAL_MS,
  generateMotricityCourses,
  scoreMotricitySession,
} from './motricity';

const SEED = 'perfection-seed-2026';
const LOGIC_CONTENT_VERSION = 6;

describe('logicPerfectionAchieved', () => {
  const items = generateLogicSession(SEED, null, LOGIC_CONTENT_VERSION);
  const correctAnswers = items.map((item) => {
    if (item.family === LogicFamily.DOMINO) {
      return {
        index: item.index,
        answerIndex: null,
        dominoTop: item.domino.answer.top,
        dominoBottom: item.domino.answer.bottom,
        timeMs: 5000,
        helpUsed: false,
        visited: true,
      };
    }
    if (
      item.family === LogicFamily.NUMERIC &&
      item.structure === LogicNumericStructure.TRIANGLE
    ) {
      return {
        index: item.index,
        answerIndex: null,
        numericValue: item.answer,
        timeMs: 5000,
        helpUsed: false,
        visited: true,
      };
    }
    return {
      index: item.index,
      answerIndex: item.answerIndex,
      timeMs: 5000,
      helpUsed: false,
      visited: true,
    };
  });

  it('holds on a session with every answer right and no timeout', () => {
    const scored = scoreLogicSession(items, correctAnswers);
    expect(scored.score).toBe(100);
    expect(logicPerfectionAchieved(scored)).toBe(true);
  });

  it('falls on a single wrong answer', () => {
    let flawedOnce = false;
    const flawed = items.map((item, position) => {
      const answer = correctAnswers[position];
      if (!flawedOnce && item.family === LogicFamily.DOMINO) {
        flawedOnce = true;
        return {
          ...answer,
          dominoTop: ((item.domino.answer.top + 1) % 7) as
            | 0
            | 1
            | 2
            | 3
            | 4
            | 5
            | 6,
        };
      }
      return answer;
    });
    expect(flawedOnce).toBe(true);
    expect(logicPerfectionAchieved(scoreLogicSession(items, flawed))).toBe(
      false,
    );
  });

  it('falls on a single unanswered item left by the timer', () => {
    const timedOut = correctAnswers.slice(0, correctAnswers.length - 1);
    expect(logicPerfectionAchieved(scoreLogicSession(items, timedOut))).toBe(
      false,
    );
  });
});

describe('memoryPerfectionAchieved', () => {
  const spanEightTraining = {
    ...AXIS_TRAINING[AxisType.MEMORY],
    exerciseCount: 2,
    sequences: [
      { phase: MemoryPhase.NORMAL, length: 8 },
      { phase: MemoryPhase.INVERSE, length: 5 },
    ],
  };
  const sequences = generateMemorySession(SEED, spanEightTraining);
  const perfectAnswers: MemorySequenceAnswerDto[] = sequences.map(
    (sequence) => ({
      index: sequence.index,
      input: expectedMemoryAnswer(sequence),
      timeMs: 6000,
      timedOut: false,
    }),
  );

  it('holds once a sequence of eight elements is restituted', () => {
    const scored = scoreMemorySession(sequences, perfectAnswers);
    expect(memoryPerfectionAchieved(sequences, scored)).toBe(true);
  });

  it('falls when the eight-element sequence has a single misplaced digit', () => {
    const flawedAnswers = perfectAnswers.map((answer, position) =>
      sequences[position].length === 8
        ? {
            ...answer,
            input: [...answer.input.slice(1), answer.input[0]],
          }
        : answer,
    );
    const scored = scoreMemorySession(sequences, flawedAnswers);
    expect(memoryPerfectionAchieved(sequences, scored)).toBe(false);
  });

  it('never holds on the standard plan whose longest sequence is under eight', () => {
    const standardSequences = generateMemorySession(SEED);
    const answers: MemorySequenceAnswerDto[] = standardSequences.map(
      (sequence) => ({
        index: sequence.index,
        input: expectedMemoryAnswer(sequence),
        timeMs: 6000,
        timedOut: false,
      }),
    );
    const scored = scoreMemorySession(standardSequences, answers);
    expect(scored.score).toBe(100);
    expect(memoryPerfectionAchieved(standardSequences, scored)).toBe(false);
  });
});

describe('discriminationPerfectionAchieved', () => {
  const trials = generateDiscriminationSession(SEED);
  const perfectAnswers = trials.map((trial) => ({
    index: trial.index,
    answer: trial.identical ? ('IDENTICAL' as const) : ('DIFFERENT' as const),
    timeMs: 2500,
  }));

  it('holds with zero false alarm and zero missed target', () => {
    const scored = scoreDiscriminationSession(trials, perfectAnswers);
    expect(discriminationPerfectionAchieved(scored)).toBe(true);
  });

  it('falls on a single false alarm', () => {
    const flawed = perfectAnswers.map((answer, position) =>
      position === trials.findIndex((trial) => trial.identical)
        ? { ...answer, answer: 'DIFFERENT' as const }
        : answer,
    );
    expect(
      discriminationPerfectionAchieved(
        scoreDiscriminationSession(trials, flawed),
      ),
    ).toBe(false);
  });

  it('falls on a single unanswered trial', () => {
    const flawed = perfectAnswers.slice(0, perfectAnswers.length - 1);
    expect(
      discriminationPerfectionAchieved(
        scoreDiscriminationSession(trials, flawed),
      ),
    ).toBe(false);
  });
});

describe('reactivityPerfectionAchieved', () => {
  const stimuli = generateReactivitySession(SEED);
  const perfectAnswers = stimuli.map((stimulus, position) => ({
    index: stimulus.index,
    commandPressed: REACTIVITY_COMMAND_BY_TYPE[stimulus.type],
    trMs: 480 + (position % 5) * 40,
  }));

  it('holds with zero anticipation, zero omission, zero wrong command', () => {
    const scored = scoreReactivitySession(stimuli, perfectAnswers, []);
    expect(reactivityPerfectionAchieved(scored)).toBe(true);
  });

  it('falls on a single omission', () => {
    const flawed = perfectAnswers.map((answer, position) =>
      position === 4 ? { ...answer, commandPressed: null, trMs: null } : answer,
    );
    expect(
      reactivityPerfectionAchieved(
        scoreReactivitySession(stimuli, flawed, []),
      ),
    ).toBe(false);
  });

  it('falls on a single anticipation, including a press during a wait', () => {
    const anticipated = perfectAnswers.map((answer, position) =>
      position === 4 ? { ...answer, trMs: 100 } : answer,
    );
    expect(
      reactivityPerfectionAchieved(
        scoreReactivitySession(stimuli, anticipated, []),
      ),
    ).toBe(false);
    expect(
      reactivityPerfectionAchieved(
        scoreReactivitySession(stimuli, perfectAnswers, [{ atMs: 32000 }]),
      ),
    ).toBe(false);
  });
});

describe('motricityPerfectionAchieved', () => {
  const courses = generateMotricityCourses(SEED);
  const centerlineTrajectories = (offsetYFrom: number, offsetYTo: number) =>
    courses.map((course) => {
      const samples: MotricitySampleDto[] = [
        { t: 0, x: course.startPosition.x, y: course.startPosition.y },
      ];
      let elapsed = 0;
      const points = [
        course.startPosition,
        ...course.segments.map((segment) => segment.end),
      ];
      const step =
        (MOTRICITY_CURSOR_SPEED_UNITS_PER_SEC * MOTRICITY_SAMPLE_INTERVAL_MS) /
        1000;
      let travelled = 0;
      for (let p = 1; p < points.length; p += 1) {
        const from = points[p - 1];
        const to = points[p];
        const length = Math.hypot(to.x - from.x, to.y - from.y);
        for (let d = step; d <= length; d += step) {
          elapsed += MOTRICITY_SAMPLE_INTERVAL_MS;
          travelled += step;
          const ratio = travelled / course.totalLength;
          const outside =
            course.index === 0 && ratio > offsetYFrom && ratio < offsetYTo;
          samples.push({
            t: Math.round(elapsed),
            x: from.x + ((to.x - from.x) * d) / length,
            y:
              from.y + ((to.y - from.y) * d) / length + (outside ? 400 : 0),
          });
        }
      }
      return { index: course.index, samples };
    });

  it('holds gold and silver on completed courses without any contact', () => {
    const scored = scoreMotricitySession(
      centerlineTrajectories(2, 2),
      SEED,
    );
    expect(scored.score).toBe(89);
    expect(motricityPerfectionAchieved(scored.courses)).toBe(true);
    expect(motricityExitFreeAchieved(scored.courses)).toBe(true);
  });

  it('falls on a single corridor exit even when every course is completed', () => {
    const scored = scoreMotricitySession(
      centerlineTrajectories(0.3, 0.45),
      SEED,
    );
    expect(
      scored.courses.some((course) => course.majorErrors > 0),
    ).toBe(true);
    expect(motricityPerfectionAchieved(scored.courses)).toBe(false);
    expect(motricityExitFreeAchieved(scored.courses)).toBe(false);
  });

  it('keeps silver but never gold on a run with contacts and no exit', () => {
    const courses = [
      { progressionPct: 100, minorErrors: 2, majorErrors: 0 },
      { progressionPct: 100, minorErrors: 0, majorErrors: 0 },
    ];
    expect(motricityExitFreeAchieved(courses)).toBe(true);
    expect(motricityPerfectionAchieved(courses)).toBe(false);
  });

  it('falls when a course is not completed', () => {
    const courses = [
      { progressionPct: 100, minorErrors: 0, majorErrors: 0 },
      { progressionPct: 96, minorErrors: 0, majorErrors: 0 },
    ];
    expect(motricityExitFreeAchieved(courses)).toBe(false);
    expect(motricityPerfectionAchieved(courses)).toBe(false);
  });
});
