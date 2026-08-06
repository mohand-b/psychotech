import {
  AXIS_TRAINING,
  AxisType,
  DiscriminationTrial,
  DiscriminationTrialAnswerDto,
  LogicFamily,
  LogicItem,
  LogicItemAnswerDto,
  LogicNumericStructure,
  MOTRICITY_CURSOR_RADIUS,
  MOTRICITY_CURSOR_SPEED_UNITS_PER_SEC,
  MOTRICITY_SAMPLE_INTERVAL_MS,
  MemorySequence,
  MemorySequenceAnswerDto,
  MotricityCourse,
  MotricityCourseTrajectoryDto,
  MotricitySampleDto,
  REACTIVITY_COMMAND_BY_TYPE,
  ReactivityStimulus,
  ReactivityStimulusAnswerDto,
  ReactivityWaitPressDto,
  SeededRng,
  expectedMemoryAnswer,
} from '@psychotech/shared';
import { MATRIX_ABILITY_FACTOR } from './demo-profile';

const LOGIC_MAX_DIFFICULTY_PENALTY = 0.2;
const LOGIC_MEDIAN_ANSWER_MS = 9000;
const LOGIC_MIN_ATTEMPTED_SHARE = 0.74;

const MEMORY_MEDIAN_ANSWER_MS = 6500;
const MEMORY_TIMEOUT_ABILITY_THRESHOLD = 0.35;

const DISCRIMINATION_MEDIAN_ANSWER_MS = 4200;
const DISCRIMINATION_OMISSION_RATE = 0.06;

const REACTIVITY_FLOOR_MS = 240;
const REACTIVITY_SPREAD_MS = 320;
const REACTIVITY_OMISSION_RATE = 0.08;
const REACTIVITY_WRONG_COMMAND_RATE = 0.12;
const REACTIVITY_ANTICIPATION_RATE = 0.05;

const MOTRICITY_NOISE_SHARE = 0.67;
const MOTRICITY_NOISE_INERTIA = 0.82;
const MOTRICITY_SPEED_JITTER = 0.12;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function standardNormal(rng: SeededRng): number {
  const uniform = Math.max(rng.next(), Number.EPSILON);
  return (
    Math.sqrt(-2 * Math.log(uniform)) * Math.cos(2 * Math.PI * rng.next())
  );
}

function lognormalMs(
  rng: SeededRng,
  medianMs: number,
  sigma: number,
  minMs: number,
  maxMs: number,
): number {
  return Math.round(
    clamp(medianMs * Math.exp(sigma * standardNormal(rng)), minMs, maxMs),
  );
}

function succeeds(rng: SeededRng, probability: number): boolean {
  return rng.next() < clamp(probability, 0, 1);
}

function wrongIndex(rng: SeededRng, choiceCount: number, correct: number): number {
  if (choiceCount <= 1) {
    return correct;
  }
  const offset = rng.nextInt(1, choiceCount - 1);
  return (correct + offset) % choiceCount;
}

// Une habileté n'est pas un taux de réussite : même à habileté nulle, un choix
// multiple se devine une fois sur cinq. On interpole donc entre le hasard et la
// quasi-certitude, sans quoi un candidat moyen ferait pire qu'au hasard.
function successRate(ability: number, chanceLevel: number, ceiling: number): number {
  return clamp(chanceLevel + (ceiling - chanceLevel) * ability, 0, ceiling);
}

const LOGIC_CHANCE_LEVEL = 0.26;
const LOGIC_CEILING = 0.96;

function logicItemAbility(item: LogicItem, ability: number): number {
  const familyAbility =
    item.family === LogicFamily.MATRIX_I || item.family === LogicFamily.MATRIX_II
      ? ability * MATRIX_ABILITY_FACTOR
      : ability;
  const difficultyPenalty =
    ((item.difficulty - 1) / 4) * LOGIC_MAX_DIFFICULTY_PENALTY;
  return successRate(
    clamp(familyAbility - difficultyPenalty, 0, 1),
    LOGIC_CHANCE_LEVEL,
    LOGIC_CEILING,
  );
}

function correctLogicAnswer(
  item: LogicItem,
): Pick<
  LogicItemAnswerDto,
  'answerIndex' | 'dominoTop' | 'dominoBottom' | 'numericValue'
> {
  if (item.family === LogicFamily.DOMINO) {
    return {
      answerIndex: null,
      dominoTop: item.domino.answer.top,
      dominoBottom: item.domino.answer.bottom,
    };
  }
  if (
    item.family === LogicFamily.NUMERIC &&
    item.structure === LogicNumericStructure.TRIANGLE
  ) {
    return { answerIndex: null, numericValue: item.answer };
  }
  return { answerIndex: item.answerIndex };
}

function wrongLogicAnswer(
  item: LogicItem,
  rng: SeededRng,
): Pick<
  LogicItemAnswerDto,
  'answerIndex' | 'dominoTop' | 'dominoBottom' | 'numericValue'
> {
  if (item.family === LogicFamily.DOMINO) {
    const { top, bottom } = item.domino.answer;
    const shiftedTop = ((top + rng.nextInt(1, 6)) % 7) as typeof top;
    return { answerIndex: null, dominoTop: shiftedTop, dominoBottom: bottom };
  }
  if (
    item.family === LogicFamily.NUMERIC &&
    item.structure === LogicNumericStructure.TRIANGLE
  ) {
    const drift = rng.pick([-3, -2, -1, 1, 2, 3]);
    return { answerIndex: null, numericValue: item.answer + drift };
  }
  const choiceCount =
    item.family === LogicFamily.NUMERIC ? item.choices.length : item.proposals.length;
  return { answerIndex: wrongIndex(rng, choiceCount, item.answerIndex) };
}

export function simulateLogicAnswers(
  items: readonly LogicItem[],
  ability: number,
  rng: SeededRng,
): LogicItemAnswerDto[] {
  const attempted = Math.round(
    items.length * (LOGIC_MIN_ATTEMPTED_SHARE + (1 - LOGIC_MIN_ATTEMPTED_SHARE) * ability),
  );
  return items.map((item, index) => {
    if (index >= attempted) {
      return {
        index: item.index,
        answerIndex: null,
        timeMs: 0,
        helpUsed: false,
        visited: false,
      };
    }
    const itemAbility = logicItemAbility(item, ability);
    const answer = succeeds(rng, itemAbility)
      ? correctLogicAnswer(item)
      : wrongLogicAnswer(item, rng);
    return {
      index: item.index,
      ...answer,
      timeMs: lognormalMs(
        rng,
        LOGIC_MEDIAN_ANSWER_MS * (1 + (item.difficulty - 1) * 0.18),
        0.42,
        1800,
        45000,
      ),
      helpUsed: false,
      visited: true,
    };
  });
}

function perturbMemoryInput(
  expected: readonly number[],
  ability: number,
  rng: SeededRng,
): (number | null)[] {
  const input: (number | null)[] = [...expected];
  const errorCount = Math.max(1, Math.round((1 - ability) * expected.length * 0.6));
  for (let error = 0; error < errorCount; error += 1) {
    const position = rng.nextInt(0, input.length - 1);
    if (succeeds(rng, 0.55) && input.length > 1) {
      const other = rng.nextInt(0, input.length - 1);
      [input[position], input[other]] = [input[other], input[position]];
      continue;
    }
    input[position] = null;
  }
  return input;
}

export function simulateMemoryAnswers(
  sequences: readonly MemorySequence[],
  ability: number,
  rng: SeededRng,
): MemorySequenceAnswerDto[] {
  return sequences.map((sequence) => {
    const expected = expectedMemoryAnswer(sequence);
    // Restituer une suite exacte ne se devine pas : le hasard y est nul, et une
    // suite longue s'oublie plus vite qu'une courte.
    const lengthPenalty = (sequence.length - 3) * 0.11;
    const recallAbility = successRate(
      clamp(ability - lengthPenalty, 0, 1),
      0.02,
      0.94,
    );
    const timedOut =
      recallAbility < MEMORY_TIMEOUT_ABILITY_THRESHOLD && succeeds(rng, 0.18);
    if (timedOut) {
      return {
        index: sequence.index,
        input: expected.map(() => null),
        timeMs: AXIS_TRAINING[AxisType.MEMORY].restitutionSec * 1000,
        timedOut: true,
      };
    }
    const input = succeeds(rng, recallAbility)
      ? [...expected]
      : perturbMemoryInput(expected, recallAbility, rng);
    return {
      index: sequence.index,
      input,
      timeMs: lognormalMs(rng, MEMORY_MEDIAN_ANSWER_MS, 0.35, 1500, 20000),
      timedOut: false,
    };
  });
}

export function simulateDiscriminationAnswers(
  trials: readonly DiscriminationTrial[],
  ability: number,
  rng: SeededRng,
): DiscriminationTrialAnswerDto[] {
  const training = AXIS_TRAINING[AxisType.VISUAL_DISCRIMINATION];
  const targetTotalMs = training.timer.durationSec * 1000;
  const answers = trials.map((trial) => {
    const omitted = succeeds(rng, DISCRIMINATION_OMISSION_RATE * (1 - ability));
    const correct = succeeds(rng, successRate(ability, 0.58, 0.99));
    const truth = trial.identical ? 'IDENTICAL' : 'DIFFERENT';
    const flipped = trial.identical ? 'DIFFERENT' : 'IDENTICAL';
    return {
      index: trial.index,
      answer: omitted ? null : correct ? truth : flipped,
      timeMs: lognormalMs(rng, DISCRIMINATION_MEDIAN_ANSWER_MS, 0.38, 900, 15000),
    } satisfies DiscriminationTrialAnswerDto;
  });
  const totalMs = answers.reduce((sum, answer) => sum + answer.timeMs, 0);
  if (totalMs >= targetTotalMs) {
    return answers;
  }
  const scale = targetTotalMs / Math.max(totalMs, 1);
  return answers.map((answer, index) => ({
    ...answer,
    timeMs:
      index === answers.length - 1
        ? Math.max(
            1,
            targetTotalMs -
              answers
                .slice(0, -1)
                .reduce((sum, previous) => sum + Math.round(previous.timeMs * scale), 0),
          )
        : Math.round(answer.timeMs * scale),
  }));
}

export interface SimulatedReactivity {
  stimuli: ReactivityStimulusAnswerDto[];
  waitPresses: ReactivityWaitPressDto[];
}

export function simulateReactivityAnswers(
  stimuli: readonly ReactivityStimulus[],
  ability: number,
  rng: SeededRng,
): SimulatedReactivity {
  const commands = Object.values(REACTIVITY_COMMAND_BY_TYPE);
  const answers = stimuli.map((stimulus) => {
    const expected = REACTIVITY_COMMAND_BY_TYPE[stimulus.type];
    if (succeeds(rng, REACTIVITY_OMISSION_RATE * (1 - ability))) {
      return { index: stimulus.index, commandPressed: null, trMs: null };
    }
    const mistaken = succeeds(rng, REACTIVITY_WRONG_COMMAND_RATE * (1 - ability));
    const pressed = mistaken
      ? commands.filter((command) => command !== expected)[
          rng.nextInt(0, commands.length - 2)
        ]
      : expected;
    const medianMs = REACTIVITY_FLOOR_MS + REACTIVITY_SPREAD_MS * (1 - ability);
    return {
      index: stimulus.index,
      commandPressed: pressed,
      trMs: lognormalMs(rng, medianMs, 0.26, 120, 1800),
    };
  });
  const waitPresses: ReactivityWaitPressDto[] = [];
  for (const stimulus of stimuli) {
    if (succeeds(rng, REACTIVITY_ANTICIPATION_RATE * (1 - ability))) {
      waitPresses.push({
        atMs: Math.max(0, stimulus.appearAtMs - rng.nextInt(60, 400)),
      });
    }
  }
  return { stimuli: answers, waitPresses };
}

interface TraversalCursor {
  samples: MotricitySampleDto[];
  elapsedMs: number;
  offset: number;
}

function pushSample(
  cursor: TraversalCursor,
  x: number,
  y: number,
  ability: number,
  rng: SeededRng,
  halfClearance: number,
): void {
  const noiseScale = (1 - ability) * MOTRICITY_NOISE_SHARE * halfClearance;
  cursor.offset =
    cursor.offset * MOTRICITY_NOISE_INERTIA +
    standardNormal(rng) * noiseScale * (1 - MOTRICITY_NOISE_INERTIA) * 3;
  cursor.samples.push({
    t: Math.round(cursor.elapsedMs),
    x,
    y,
  });
}

function traverseSegment(
  cursor: TraversalCursor,
  start: { x: number; y: number },
  end: { x: number; y: number },
  width: number,
  ability: number,
  rng: SeededRng,
): void {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) {
    return;
  }
  const ux = dx / length;
  const uy = dy / length;
  const halfClearance = Math.max(width / 2 - MOTRICITY_CURSOR_RADIUS, 0.5);
  const baseStepUnits =
    (MOTRICITY_CURSOR_SPEED_UNITS_PER_SEC * MOTRICITY_SAMPLE_INTERVAL_MS) / 1000;
  let travelled = 0;
  while (travelled < length) {
    const jitter = 1 + standardNormal(rng) * MOTRICITY_SPEED_JITTER * (1 - ability);
    travelled = Math.min(length, travelled + baseStepUnits * clamp(jitter, 0.5, 1.5));
    cursor.elapsedMs += MOTRICITY_SAMPLE_INTERVAL_MS;
    const alongX = start.x + ux * travelled;
    const alongY = start.y + uy * travelled;
    pushSample(
      cursor,
      alongX - uy * cursor.offset,
      alongY + ux * cursor.offset,
      ability,
      rng,
      halfClearance,
    );
  }
}

export function simulateMotricityTrajectories(
  courses: readonly MotricityCourse[],
  ability: number,
  rng: SeededRng,
): MotricityCourseTrajectoryDto[] {
  return courses.map((course) => {
    const cursor: TraversalCursor = {
      samples: [{ t: 0, x: course.startPosition.x, y: course.startPosition.y }],
      elapsedMs: 0,
      offset: 0,
    };
    const firstSegment = course.segments[0];
    if (firstSegment) {
      traverseSegment(
        cursor,
        course.startPosition,
        firstSegment.start,
        firstSegment.width,
        ability,
        rng,
      );
    }
    for (const segment of course.segments) {
      traverseSegment(
        cursor,
        segment.start,
        segment.end,
        segment.width,
        ability,
        rng,
      );
    }
    return {
      index: course.index,
      samples: cursor.samples,
      avgLatencyMs: Math.round(40 + (1 - ability) * 60),
      jitterMs: Math.round(6 + (1 - ability) * 18),
    };
  });
}
