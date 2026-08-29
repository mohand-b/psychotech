import {
  AxisFindingsEntry,
  AxisType,
  ControlModality,
  DiscriminationTrialAnswerDto,
  LogicFamily,
  LogicItemAnswerDto,
  LogicNumericStructure,
  LogicRuleItem,
  MOTRICITY_FINAL_COURSE_WEIGHT,
  MemorySequenceAnswerDto,
  MotorSkillsMetrics,
  MotricityCourseTimeline,
  MotricityTimelinePoint,
  REACTIVITY_COMMAND_BY_TYPE,
  ReactivityStimulusAnswerDto,
  SESSION_CONTENT_VERSION,
  ScoreBand,
  Sector,
  TargetedAxisResultDto,
  analyzeDiscrimination,
  analyzeLogic,
  analyzeMemory,
  analyzeMotricity,
  analyzeReactivity,
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
  roundToTenth,
  scoreReactivitySession,
} from '@psychotech/shared';

export const EXAMPLE_SEED = 'exemple-de-bilan-2026';

const EXAMPLE_SESSION_ID = 'exemple-de-bilan';

const LOGIC_SKIPPED_INDEXES = [6, 17, 28];

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
    const skipped = LOGIC_SKIPPED_INDEXES.includes(index);
    const correct = !unreached && !skipped && rng.next() > 0.04;
    const timeMs = unreached
      ? 0
      : skipped
        ? 5000 + Math.round(rng.next() * 4000)
        : 9000 + Math.round(rng.next() * 6000);
    const shared = {
      index: item.index,
      timeMs,
      helpUsed: false,
      visited: !unreached,
    };
    if (unreached || skipped) {
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

const MOTRICITY_SAMPLE_STEP_MS = 1500;
const MOTRICITY_BASE_DEVIATION_PCT = 6;
const MOTRICITY_EVENT_SPIKE_PCT = 34;
const MOTRICITY_EVENT_SPIKE_WINDOW_MS = 2200;

interface CourseShape {
  index: number;
  durationMs: number;
  drift: number;
  events: number[];
}

function motricityTimeline(shapes: CourseShape[]): MotricityCourseTimeline[] {
  return shapes.map((shape) => {
    const rng = createSeededRng(`${EXAMPLE_SEED}:motricity:${shape.index}`);
    const points: MotricityTimelinePoint[] = [];
    for (let tMs = 0; tMs <= shape.durationMs; tMs += MOTRICITY_SAMPLE_STEP_MS) {
      const progress = tMs / shape.durationMs;
      const spike = shape.events.reduce((peak, at) => {
        const distance = Math.abs(tMs - at);
        if (distance > MOTRICITY_EVENT_SPIKE_WINDOW_MS) {
          return peak;
        }
        const closeness = 1 - distance / MOTRICITY_EVENT_SPIKE_WINDOW_MS;
        return Math.max(peak, MOTRICITY_EVENT_SPIKE_PCT * closeness);
      }, 0);
      const wander = rng.next() * 5;
      const deviationPct =
        MOTRICITY_BASE_DEVIATION_PCT + shape.drift * progress + wander + spike;
      points.push({ tMs, deviationPct: roundToTenth(deviationPct) });
    }
    return { courseIndex: shape.index, points };
  });
}

const MOTRICITY_COURSE_SHAPES: CourseShape[] = [
  { index: 0, durationMs: 46_000, drift: 3, events: [] },
  { index: 1, durationMs: 52_000, drift: 6, events: [41_200] },
  { index: 2, durationMs: 79_000, drift: 11, events: [33_800, 58_400] },
];

const MOTRICITY_METRICS: MotorSkillsMetrics = {
  axis: AxisType.MOTOR_SKILLS,
  minorErrors: 8,
  majorErrors: 2,
  totalTimeMs: 177_000,
  coursesCompleted: 2,
  controlModality: ControlModality.KEYBOARD,
  handIndependence: 0.24,
  courses: [
    {
      index: 0,
      minorErrors: 3,
      majorErrors: 0,
      progressionPct: 100,
      tReelMs: 46_000,
      avgLatencyMs: null,
      jitterMs: null,
    },
    {
      index: 1,
      minorErrors: 3,
      majorErrors: 1,
      progressionPct: 100,
      tReelMs: 52_000,
      avgLatencyMs: null,
      jitterMs: null,
    },
    {
      index: 2,
      minorErrors: 2,
      majorErrors: 1,
      progressionPct: 90,
      tReelMs: 79_000,
      avgLatencyMs: null,
      jitterMs: null,
    },
  ],
  timeline: motricityTimeline(MOTRICITY_COURSE_SHAPES),
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

export function exampleAxisFindings(): AxisFindingsEntry[] {
  const logicItems = generateLogicSession(
    EXAMPLE_SEED,
    null,
    SESSION_CONTENT_VERSION,
  );
  const logicResponses = logicAnswers();
  const logicRuleItems: LogicRuleItem[] = logicItems.map((item) => ({
    index: item.index,
    ruleId: item.rule.id,
    difficulty: item.difficulty,
    sequence: [],
    choices: [],
    answerIndex: 0,
    points: item.points,
  }));
  const memorySequences = generateMemorySession(EXAMPLE_SEED);

  return [
    {
      axis: AxisType.LOGIC,
      findings: analyzeLogic(
        logicRuleItems,
        scoreLogicSession(logicItems, logicResponses),
        logicResponses,
        logicItems,
        null,
      ),
    },
    {
      axis: AxisType.MEMORY,
      findings: analyzeMemory(
        memorySequences,
        scoreMemorySession(memorySequences, memoryAnswers()),
      ),
    },
    {
      axis: AxisType.VISUAL_DISCRIMINATION,
      findings: analyzeDiscrimination(
        scoreDiscriminationSession(
          generateDiscriminationSession(EXAMPLE_SEED),
          discriminationAnswers(),
        ),
      ),
    },
    {
      axis: AxisType.REACTIVITY,
      findings: analyzeReactivity(
        scoreReactivitySession(
          generateReactivitySession(EXAMPLE_SEED),
          reactivityAnswers(),
          [],
        ),
      ),
    },
    {
      axis: AxisType.MOTOR_SKILLS,
      findings: analyzeMotricity(MOTRICITY_METRICS),
    },
  ];
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
