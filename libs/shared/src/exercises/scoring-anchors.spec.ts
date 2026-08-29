import { describe, expect, it } from 'vitest';
import { AXIS_TRAINING } from '../domain';
import { AxisType, LogicFamily, MemoryPhase } from '../enums';
import {
  DiscriminationTrialAnswerDto,
  LogicItemAnswerDto,
  MemorySequenceAnswerDto,
  MotricityCourseTrajectoryDto,
  MotricitySampleDto,
  ReactivityStimulusAnswerDto,
} from '../dtos/session';
import { SeededRng, createSeededRng } from './rng';
import { generateDiscriminationSession } from './discrimination/generate-discrimination-session';
import { scoreDiscriminationSession } from './discrimination/discrimination-scoring';
import { DominoFace } from './domino';
import { generateLogicSession } from './logic/generate-logic-session';
import { LogicItem, LogicNumericStructure } from './logic/logic-item';
import { scoreLogicSession } from './logic/logic-session-scoring';
import { generateMemorySession } from './memory/generate-memory-session';
import { scoreMemorySession } from './memory/memory-scoring';
import { expectedMemoryAnswer } from './memory/memory-sequence';
import { generateMotricityCourses } from './motricity/generate-motricity-courses';
import { MotricityCourse } from './motricity/motricity-course';
import { scoreMotricitySession } from './motricity/motricity-scoring';
import {
  FRAME_MS,
  centerlinePositionAtPct,
  outsidePointNear,
} from './motricity/motricity-trajectory-fixtures';
import { generateReactivitySession } from './reactivity/generate-reactivity-session';
import { scoreReactivitySession } from './reactivity/reactivity-scoring';
import { REACTIVITY_COMMAND_BY_TYPE } from './reactivity/reactivity-stimulus';

interface AnchorBand {
  min: number;
  max: number;
}

const ANCHOR_BANDS: Record<string, AnchorBand> = {
  excellent: { min: 90, max: 100 },
  bon: { min: 78, max: 88 },
  moyen: { min: 62, max: 72 },
  faible: { min: 40, max: 55 },
};

const ANCHOR_SEED_COUNT = 30;

interface DiscriminationProfile {
  band: keyof typeof ANCHOR_BANDS;
  decisionMs: number;
  accuracy: number;
}

const DISCRIMINATION_PROFILES: DiscriminationProfile[] = [
  { band: 'excellent', decisionMs: 1800, accuracy: 0.97 },
  { band: 'bon', decisionMs: 2700, accuracy: 0.9 },
  { band: 'moyen', decisionMs: 3900, accuracy: 0.82 },
  { band: 'faible', decisionMs: 5500, accuracy: 0.7 },
];

// Bandes propres au Visuel. Deux d'entre elles s'écartent des bandes communes
// depuis la règle du 10/08/2026 : les essais jamais atteints pèsent désormais
// sur la précision, si bien qu'un profil qui n'épuise pas les 36 essais décroche
// mécaniquement. « faible » ne traite que 21 essais sur 36, « bon » les traite
// tous et gagne au contraire au changement de barème de vitesse.
const DISCRIMINATION_BANDS: Record<string, AnchorBand> = {
  excellent: ANCHOR_BANDS.excellent,
  bon: { min: 84, max: 93 },
  moyen: ANCHOR_BANDS.moyen,
  faible: { min: 23, max: 34 },
};

interface ReactivityProfile {
  band: keyof typeof ANCHOR_BANDS;
  trMs: number;
  sdMs: number;
  wrongRate: number;
  omitRate: number;
}

const REACTIVITY_PROFILES: ReactivityProfile[] = [
  { band: 'excellent', trMs: 420, sdMs: 55, wrongRate: 0.02, omitRate: 0 },
  { band: 'bon', trMs: 520, sdMs: 90, wrongRate: 0.04, omitRate: 0.02 },
  { band: 'moyen', trMs: 640, sdMs: 130, wrongRate: 0.08, omitRate: 0.06 },
  { band: 'faible', trMs: 800, sdMs: 185, wrongRate: 0.14, omitRate: 0.14 },
];

function standardNormal(rng: SeededRng): number {
  return (
    Math.sqrt(-2 * Math.log(Math.max(rng.next(), 1e-9))) *
    Math.cos(2 * Math.PI * rng.next())
  );
}

function discriminationScoreFor(
  profile: DiscriminationProfile,
  seed: string,
): number {
  const trials = generateDiscriminationSession(seed);
  const rng = createSeededRng(seed + profile.band);
  const budgetMs =
    AXIS_TRAINING[AxisType.VISUAL_DISCRIMINATION].timer.durationSec * 1000;
  const answers: DiscriminationTrialAnswerDto[] = [];
  let elapsedMs = 0;
  for (const trial of trials) {
    const timeMs = Math.round(
      Math.max(700, profile.decisionMs * (1 + 0.28 * standardNormal(rng))),
    );
    if (elapsedMs + timeMs > budgetMs) {
      break;
    }
    elapsedMs += timeMs;
    const correct = rng.next() < profile.accuracy;
    const truth = trial.identical ? 'IDENTICAL' : 'DIFFERENT';
    const flipped = trial.identical ? 'DIFFERENT' : 'IDENTICAL';
    answers.push({
      index: trial.index,
      answer: correct ? truth : flipped,
      timeMs,
    });
  }
  return scoreDiscriminationSession(trials, answers).score;
}

function reactivityScoreFor(profile: ReactivityProfile, seed: string): number {
  const stimuli = generateReactivitySession(seed);
  const rng = createSeededRng(seed + profile.band);
  const commands = Object.values(REACTIVITY_COMMAND_BY_TYPE);
  const answers: ReactivityStimulusAnswerDto[] = stimuli.map((stimulus) => {
    if (rng.next() < profile.omitRate) {
      return { index: stimulus.index, commandPressed: null, trMs: null };
    }
    const expected = REACTIVITY_COMMAND_BY_TYPE[stimulus.type];
    const pressed =
      rng.next() < profile.wrongRate
        ? commands.filter((command) => command !== expected)[0]
        : expected;
    const trMs = Math.round(
      Math.max(180, profile.trMs + profile.sdMs * standardNormal(rng)),
    );
    return { index: stimulus.index, commandPressed: pressed, trMs };
  });
  return scoreReactivitySession(stimuli, answers, []).score;
}

interface LogicProfile {
  band: keyof typeof ANCHOR_BANDS;
  decisionMs: number;
  accuracyByDifficulty: [number, number, number, number, number];
}

const LOGIC_PROFILES: LogicProfile[] = [
  {
    band: 'excellent',
    decisionMs: 6000,
    accuracyByDifficulty: [0.99, 0.98, 0.96, 0.93, 0.9],
  },
  {
    band: 'bon',
    decisionMs: 9000,
    accuracyByDifficulty: [0.95, 0.92, 0.85, 0.75, 0.65],
  },
  {
    band: 'moyen',
    decisionMs: 12000,
    accuracyByDifficulty: [0.88, 0.8, 0.68, 0.52, 0.42],
  },
  {
    band: 'faible',
    decisionMs: 16000,
    accuracyByDifficulty: [0.75, 0.62, 0.45, 0.32, 0.25],
  },
];

type LogicGivenAnswer = Pick<LogicItemAnswerDto, 'answerIndex'> &
  Partial<
    Pick<LogicItemAnswerDto, 'dominoTop' | 'dominoBottom' | 'numericValue'>
  >;

function logicAnswerFor(item: LogicItem, correct: boolean): LogicGivenAnswer {
  if (item.family === LogicFamily.DOMINO) {
    const answer = item.domino.answer;
    return {
      answerIndex: null,
      dominoTop: correct ? answer.top : (((answer.top + 1) % 7) as DominoFace),
      dominoBottom: answer.bottom,
    };
  }
  if (item.family === LogicFamily.NUMERIC) {
    if (item.structure === LogicNumericStructure.TRIANGLE) {
      return {
        answerIndex: null,
        numericValue: correct ? item.answer : item.answer + 1,
      };
    }
    return {
      answerIndex: correct
        ? item.answerIndex
        : (item.answerIndex + 1) % item.choices.length,
    };
  }
  return {
    answerIndex: correct
      ? item.answerIndex
      : (item.answerIndex + 1) % item.proposals.length,
  };
}

function logicScoreFor(profile: LogicProfile, seed: string): number {
  const items = generateLogicSession(seed);
  const rng = createSeededRng(seed + profile.band);
  const budgetMs = AXIS_TRAINING[AxisType.LOGIC].timer.durationSec * 1000;
  const responses: LogicItemAnswerDto[] = [];
  let elapsedMs = 0;
  for (const item of items) {
    const timeMs = Math.round(
      Math.max(2000, profile.decisionMs * (1 + 0.25 * standardNormal(rng))),
    );
    if (elapsedMs + timeMs > budgetMs) {
      break;
    }
    elapsedMs += timeMs;
    const correct =
      rng.next() < profile.accuracyByDifficulty[item.difficulty - 1];
    responses.push({
      index: item.index,
      timeMs,
      helpUsed: false,
      visited: true,
      ...logicAnswerFor(item, correct),
    });
  }
  return scoreLogicSession(items, responses).score;
}

interface MemoryProfile {
  band: keyof typeof ANCHOR_BANDS;
  recallNormal: number;
  recallInverse: number;
  blankShare: number;
}

const MEMORY_PROFILES: MemoryProfile[] = [
  {
    band: 'excellent',
    recallNormal: 0.98,
    recallInverse: 0.93,
    blankShare: 0.5,
  },
  { band: 'bon', recallNormal: 0.88, recallInverse: 0.78, blankShare: 0.5 },
  { band: 'moyen', recallNormal: 0.72, recallInverse: 0.6, blankShare: 0.5 },
  { band: 'faible', recallNormal: 0.55, recallInverse: 0.38, blankShare: 0.5 },
];

function memoryScoreFor(profile: MemoryProfile, seed: string): number {
  const sequences = generateMemorySession(seed);
  const rng = createSeededRng(seed + profile.band);
  const restitutions: MemorySequenceAnswerDto[] = sequences.map((sequence) => {
    const recall =
      sequence.phase === MemoryPhase.INVERSE
        ? profile.recallInverse
        : profile.recallNormal;
    const input = expectedMemoryAnswer(sequence).map((digit) => {
      if (rng.next() < recall) {
        return digit;
      }
      return rng.next() < profile.blankShare ? null : rng.nextInt(0, 9);
    });
    return { index: sequence.index, input, timeMs: 15_000, timedOut: false };
  });
  return scoreMemorySession(sequences, restitutions).score;
}

type MotricityExitKind = 'BRUSH' | 'EXIT' | 'LONG_EXIT';

interface MotricityExitScript {
  atPct: number;
  kind: MotricityExitKind;
}

interface MotricityCourseScript {
  untilPct: number;
  walkMs: number;
  exits: MotricityExitScript[];
}

interface MotricityProfile {
  band: keyof typeof ANCHOR_BANDS;
  courses: [
    MotricityCourseScript,
    MotricityCourseScript,
    MotricityCourseScript,
  ];
}

// Durées choisies au coeur de chaque tranche du barème (grâce 1 s, puis une
// majeure par seconde entamée) pour que le tirage aléatoire ne change jamais
// le nombre d'erreurs : BRUSH = 1 mineure, EXIT = 1 mineure + 1 majeure,
// LONG_EXIT = 1 mineure + 2 majeures.
const MOTRICITY_EXIT_DURATIONS: Record<
  MotricityExitKind,
  { minMs: number; maxMs: number }
> = {
  BRUSH: { minMs: 550, maxMs: 850 },
  EXIT: { minMs: 1250, maxMs: 1800 },
  LONG_EXIT: { minMs: 2250, maxMs: 2800 },
};

const MOTRICITY_PROFILES: MotricityProfile[] = [
  {
    band: 'excellent',
    courses: [
      { untilPct: 100, walkMs: 30_000, exits: [] },
      { untilPct: 100, walkMs: 32_000, exits: [{ atPct: 45, kind: 'BRUSH' }] },
      { untilPct: 100, walkMs: 36_000, exits: [{ atPct: 60, kind: 'BRUSH' }] },
    ],
  },
  {
    band: 'bon',
    courses: [
      {
        untilPct: 100,
        walkMs: 32_000,
        exits: [
          { atPct: 30, kind: 'BRUSH' },
          { atPct: 65, kind: 'BRUSH' },
        ],
      },
      {
        untilPct: 100,
        walkMs: 36_000,
        exits: [
          { atPct: 40, kind: 'BRUSH' },
          { atPct: 70, kind: 'EXIT' },
        ],
      },
      {
        untilPct: 100,
        walkMs: 38_000,
        exits: [
          { atPct: 25, kind: 'BRUSH' },
          { atPct: 55, kind: 'EXIT' },
        ],
      },
    ],
  },
  {
    band: 'moyen',
    courses: [
      {
        untilPct: 100,
        walkMs: 34_000,
        exits: [
          { atPct: 30, kind: 'BRUSH' },
          { atPct: 60, kind: 'EXIT' },
        ],
      },
      {
        untilPct: 100,
        walkMs: 38_000,
        exits: [
          { atPct: 25, kind: 'BRUSH' },
          { atPct: 50, kind: 'BRUSH' },
          { atPct: 75, kind: 'EXIT' },
        ],
      },
      {
        untilPct: 100,
        walkMs: 40_000,
        exits: [
          { atPct: 20, kind: 'BRUSH' },
          { atPct: 45, kind: 'BRUSH' },
          { atPct: 65, kind: 'EXIT' },
          { atPct: 80, kind: 'EXIT' },
        ],
      },
    ],
  },
  {
    band: 'faible',
    courses: [
      {
        untilPct: 100,
        walkMs: 36_000,
        exits: [
          { atPct: 25, kind: 'BRUSH' },
          { atPct: 40, kind: 'EXIT' },
          { atPct: 55, kind: 'BRUSH' },
          { atPct: 75, kind: 'EXIT' },
        ],
      },
      {
        untilPct: 100,
        walkMs: 38_000,
        exits: [
          { atPct: 20, kind: 'BRUSH' },
          { atPct: 35, kind: 'EXIT' },
          { atPct: 45, kind: 'BRUSH' },
          { atPct: 70, kind: 'BRUSH' },
        ],
      },
      {
        untilPct: 80,
        walkMs: 42_000,
        exits: [
          { atPct: 25, kind: 'BRUSH' },
          { atPct: 40, kind: 'EXIT' },
          { atPct: 50, kind: 'BRUSH' },
          { atPct: 65, kind: 'EXIT' },
        ],
      },
    ],
  },
];

function motricityTrajectoryFor(
  course: MotricityCourse,
  script: MotricityCourseScript,
  rng: SeededRng,
): MotricitySampleDto[] {
  const samples: MotricitySampleDto[] = [];
  let t = 0;
  const push = (x: number, y: number): void => {
    samples.push({ t: Math.round(t), x, y });
    t += FRAME_MS;
  };
  const exits = [...script.exits].sort((a, b) => a.atPct - b.atPct);
  const walkSteps = Math.round(script.walkMs / FRAME_MS);
  let nextExit = 0;
  for (let step = 0; step <= walkSteps; step += 1) {
    const pct = (step / walkSteps) * script.untilPct;
    while (nextExit < exits.length && pct >= exits[nextExit].atPct) {
      const exit = exits[nextExit];
      const durations = MOTRICITY_EXIT_DURATIONS[exit.kind];
      const durationMs =
        durations.minMs + rng.next() * (durations.maxMs - durations.minMs);
      const outside = outsidePointNear(
        course,
        centerlinePositionAtPct(course, exit.atPct),
      );
      const holdSteps = Math.round(durationMs / FRAME_MS);
      for (let hold = 0; hold < holdSteps; hold += 1) {
        push(outside.x, outside.y);
      }
      nextExit += 1;
    }
    const position = centerlinePositionAtPct(course, pct);
    push(position.x, position.y);
  }
  return samples;
}

function motricityScoreFor(profile: MotricityProfile, seed: string): number {
  const courses = generateMotricityCourses(seed);
  const rng = createSeededRng(seed + profile.band);
  const trajectories: MotricityCourseTrajectoryDto[] = courses.map(
    (course, position) => ({
      index: course.index,
      samples: motricityTrajectoryFor(course, profile.courses[position], rng),
    }),
  );
  return scoreMotricitySession(trajectories, seed).score;
}

function averageOverSeeds(scoreFor: (seed: string) => number): number {
  let sum = 0;
  for (let index = 0; index < ANCHOR_SEED_COUNT; index += 1) {
    sum += scoreFor(`calib-${index}`);
  }
  return sum / ANCHOR_SEED_COUNT;
}

describe('discrimination scoring anchors', () => {
  it.each(DISCRIMINATION_PROFILES)(
    'keeps the $band profile inside its band',
    (profile) => {
      const average = averageOverSeeds((seed) =>
        discriminationScoreFor(profile, seed),
      );
      const band = DISCRIMINATION_BANDS[profile.band];
      expect(average).toBeGreaterThanOrEqual(band.min);
      expect(average).toBeLessThanOrEqual(band.max);
    },
  );
});

describe('reactivity scoring anchors', () => {
  it.each(REACTIVITY_PROFILES)(
    'keeps the $band profile inside its band',
    (profile) => {
      const average = averageOverSeeds((seed) =>
        reactivityScoreFor(profile, seed),
      );
      const band = ANCHOR_BANDS[profile.band];
      expect(average).toBeGreaterThanOrEqual(band.min);
      expect(average).toBeLessThanOrEqual(band.max);
    },
  );
});

describe('logic scoring anchors', () => {
  it.each(LOGIC_PROFILES)(
    'keeps the $band profile inside its band',
    (profile) => {
      const average = averageOverSeeds((seed) => logicScoreFor(profile, seed));
      const band = ANCHOR_BANDS[profile.band];
      expect(average).toBeGreaterThanOrEqual(band.min);
      expect(average).toBeLessThanOrEqual(band.max);
    },
  );
});

describe('memory scoring anchors', () => {
  it.each(MEMORY_PROFILES)(
    'keeps the $band profile inside its band',
    (profile) => {
      const average = averageOverSeeds((seed) => memoryScoreFor(profile, seed));
      const band = ANCHOR_BANDS[profile.band];
      expect(average).toBeGreaterThanOrEqual(band.min);
      expect(average).toBeLessThanOrEqual(band.max);
    },
  );
});

describe('motricity scoring anchors', () => {
  it.each(MOTRICITY_PROFILES)(
    'keeps the $band profile inside its band',
    (profile) => {
      const average = averageOverSeeds((seed) =>
        motricityScoreFor(profile, seed),
      );
      const band = ANCHOR_BANDS[profile.band];
      expect(average).toBeGreaterThanOrEqual(band.min);
      expect(average).toBeLessThanOrEqual(band.max);
    },
    30_000,
  );
});
