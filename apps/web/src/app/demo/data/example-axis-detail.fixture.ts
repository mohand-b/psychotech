import {
  AxisType,
  ControlModality,
  DiscriminationTrialAnswerDto,
  LogicFamily,
  LogicItemAnswerDto,
  LogicNumericStructure,
  MOTRICITY_FINAL_COURSE_WEIGHT,
  MemorySequenceAnswerDto,
  MotorSkillsMetrics,
  REACTIVITY_COMMAND_BY_TYPE,
  ReactivityStimulusAnswerDto,
  SESSION_CONTENT_VERSION,
  ScoreBand,
  Sector,
  TargetedAxisResultDto,
  avisFromScore,
  createSeededRng,
  expectedMemoryAnswer,
  generateDiscriminationSession,
  generateLogicSession,
  generateMemorySession,
  generateReactivitySession,
  scoreDiscriminationSession,
  scoreLogicSession,
  scoreMemorySession,
  scoreMotricityRecap,
  scoreReactivitySession,
} from '@psychotech/shared';

export const EXAMPLE_SEED = 'exemple-de-bilan-2026';

const EXAMPLE_SESSION_ID = 'exemple-de-bilan';

interface DetailContext {
  startedAt: string;
  completedAt: string;
}

function base(score: number, band: ScoreBand, context: DetailContext) {
  return {
    sessionId: EXAMPLE_SESSION_ID,
    earnedBadges: [],
    sector: Sector.RAILWAY,
    seed: EXAMPLE_SEED,
    helpEnabled: false,
    score,
    band,
    startedAt: context.startedAt,
    completedAt: context.completedAt,
    bestScore: score,
    isNewBest: false,
    isEqualBest: false,
    previousBestScore: null,
    untimed: false,
  };
}

function logicAnswers(): LogicItemAnswerDto[] {
  const items = generateLogicSession(EXAMPLE_SEED, null, SESSION_CONTENT_VERSION);
  const rng = createSeededRng(`${EXAMPLE_SEED}:logic`);
  return items.map((item, index) => {
    const unreached = index >= items.length - 4;
    const correct = !unreached && rng.next() > 0.09;
    const timeMs = unreached ? 0 : 9000 + Math.round(rng.next() * 6000);
    const shared = {
      index: item.index,
      timeMs,
      helpUsed: false,
      visited: !unreached,
    };
    if (unreached) {
      return { ...shared, answerIndex: null };
    }
    if (item.family === LogicFamily.DOMINO) {
      const answer = item.domino.answer;
      return {
        ...shared,
        answerIndex: null,
        dominoTop: correct ? answer.top : (((answer.top + 1) % 7) as 0 | 1 | 2 | 3 | 4 | 5 | 6),
        dominoBottom: answer.bottom,
      };
    }
    if (
      item.family === LogicFamily.NUMERIC &&
      item.structure === LogicNumericStructure.TRIANGLE
    ) {
      return {
        ...shared,
        answerIndex: null,
        numericValue: correct ? item.answer : item.answer + 1,
      };
    }
    const choiceCount =
      item.family === LogicFamily.NUMERIC
        ? item.choices.length
        : item.proposals.length;
    return {
      ...shared,
      answerIndex: correct
        ? item.answerIndex
        : (item.answerIndex + 1) % choiceCount,
    };
  });
}

function memoryAnswers(): MemorySequenceAnswerDto[] {
  const sequences = generateMemorySession(EXAMPLE_SEED);
  return sequences.map((sequence, index) => {
    const input: (number | null)[] = [...expectedMemoryAnswer(sequence)];
    if (index >= sequences.length - 2) {
      input[input.length - 1] = null;
    }
    return {
      index: sequence.index,
      input,
      timeMs: 5200 + index * 400,
      timedOut: false,
    };
  });
}

function discriminationAnswers(): DiscriminationTrialAnswerDto[] {
  const trials = generateDiscriminationSession(EXAMPLE_SEED);
  const rng = createSeededRng(`${EXAMPLE_SEED}:discrimination`);
  return trials.map((trial) => {
    const correct = rng.next() > 0.11;
    const truth = trial.identical ? 'IDENTICAL' : 'DIFFERENT';
    const flipped = trial.identical ? 'DIFFERENT' : 'IDENTICAL';
    return {
      index: trial.index,
      answer: correct ? truth : flipped,
      timeMs: 2200 + Math.round(rng.next() * 900),
    };
  });
}

function reactivityAnswers(): ReactivityStimulusAnswerDto[] {
  const stimuli = generateReactivitySession(EXAMPLE_SEED);
  const rng = createSeededRng(`${EXAMPLE_SEED}:reactivity`);
  return stimuli.map((stimulus, index) => {
    const roll = rng.next();
    if (roll < 0.04) {
      return { index: stimulus.index, commandPressed: null, trMs: null };
    }
    const expected = REACTIVITY_COMMAND_BY_TYPE[stimulus.type];
    const drift = index > stimuli.length * 0.66 ? 70 : 0;
    return {
      index: stimulus.index,
      commandPressed: expected,
      trMs: 410 + drift + Math.round(rng.next() * 120),
    };
  });
}

const MOTRICITY_METRICS: MotorSkillsMetrics = {
  axis: AxisType.MOTOR_SKILLS,
  minorErrors: 8,
  majorErrors: 2,
  totalTimeMs: 214_000,
  coursesCompleted: 2,
  controlModality: ControlModality.KEYBOARD,
  handIndependence: 0.24,
  courses: [
    {
      index: 0,
      minorErrors: 3,
      majorErrors: 0,
      progressionPct: 100,
      tReelMs: 61_000,
      avgLatencyMs: null,
      jitterMs: null,
    },
    {
      index: 1,
      minorErrors: 3,
      majorErrors: 1,
      progressionPct: 100,
      tReelMs: 74_000,
      avgLatencyMs: null,
      jitterMs: null,
    },
    {
      index: 2,
      minorErrors: 2,
      majorErrors: 1,
      progressionPct: 58,
      tReelMs: 79_000,
      avgLatencyMs: null,
      jitterMs: null,
    },
  ],
  timeline: [],
  events: [
    { courseIndex: 1, tMs: 41_200, type: 'EXIT', segment: 'DIAG', durationMs: 620 },
    { courseIndex: 2, tMs: 33_800, type: 'CONTACT', segment: 'DIAG' },
    { courseIndex: 2, tMs: 58_400, type: 'EXIT', segment: 'DIAG', durationMs: 540 },
  ],
};

function motricityScore(): number {
  const scores = MOTRICITY_METRICS.courses.map((course) =>
    scoreMotricityRecap(course),
  );
  const weightedSum = scores.reduce(
    (sum, score, index) =>
      sum + score * (index === scores.length - 1 ? MOTRICITY_FINAL_COURSE_WEIGHT : 1),
    0,
  );
  const totalWeight = scores.length - 1 + MOTRICITY_FINAL_COURSE_WEIGHT;
  return Math.round(weightedSum / totalWeight);
}

export function exampleAxisScores(): Record<AxisType, number> {
  const logic = scoreLogicSession(
    generateLogicSession(EXAMPLE_SEED, null, SESSION_CONTENT_VERSION),
    logicAnswers(),
  ).score;
  const memory = scoreMemorySession(
    generateMemorySession(EXAMPLE_SEED),
    memoryAnswers(),
  ).score;
  const discrimination = scoreDiscriminationSession(
    generateDiscriminationSession(EXAMPLE_SEED),
    discriminationAnswers(),
  ).score;
  const reactivity = scoreReactivitySession(
    generateReactivitySession(EXAMPLE_SEED),
    reactivityAnswers(),
    [],
  ).score;
  return {
    [AxisType.LOGIC]: logic,
    [AxisType.MEMORY]: memory,
    [AxisType.VISUAL_DISCRIMINATION]: discrimination,
    [AxisType.REACTIVITY]: reactivity,
    [AxisType.MOTOR_SKILLS]: motricityScore(),
  } as Record<AxisType, number>;
}

export function buildExampleAxisDetail(
  axis: AxisType,
  context: DetailContext,
): TargetedAxisResultDto | null {
  const scores = exampleAxisScores();
  const score = scores[axis];
  const shared = base(score, avisFromScore(score), context);
  switch (axis) {
    case AxisType.LOGIC:
      return {
        ...shared,
        axis: AxisType.LOGIC,
        items: logicAnswers(),
        contentVersion: SESSION_CONTENT_VERSION,
        logicFamily: null,
      };
    case AxisType.MEMORY:
      return { ...shared, axis: AxisType.MEMORY, sequences: memoryAnswers() };
    case AxisType.VISUAL_DISCRIMINATION:
      return {
        ...shared,
        axis: AxisType.VISUAL_DISCRIMINATION,
        trials: discriminationAnswers(),
      };
    case AxisType.REACTIVITY:
      return {
        ...shared,
        axis: AxisType.REACTIVITY,
        stimuli: reactivityAnswers(),
        waitPresses: [],
      };
    case AxisType.MOTOR_SKILLS:
      return {
        ...shared,
        axis: AxisType.MOTOR_SKILLS,
        metrics: MOTRICITY_METRICS,
      };
    default:
      return null;
  }
}
