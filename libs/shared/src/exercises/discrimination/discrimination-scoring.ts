import { DiscriminationTrialAnswerDto } from '../../dtos/session';
import { DiscriminationTrial } from './discrimination-trial';

export type DiscriminationOutcome =
  | 'TRUE_POSITIVE'
  | 'TRUE_NEGATIVE'
  | 'FALSE_POSITIVE'
  | 'FALSE_NEGATIVE';

export const DISCRIMINATION_PRECISION_WEIGHT = 0.7;
export const DISCRIMINATION_SPEED_WEIGHT = 0.3;
export const DISCRIMINATION_SPEED_BEST_MS = 300;
export const DISCRIMINATION_SPEED_WORST_MS = 1500;
export const DISCRIMINATION_FP_PENALTY_THRESHOLD_PCT = 20;
export const DISCRIMINATION_FP_PENALTY_FACTOR = 0.5;

export interface DiscriminationSessionScore {
  score: number;
  outcomes: DiscriminationOutcome[];
  correctCount: number;
  wrongIdenticalCount: number;
  wrongDifferentCount: number;
  unansweredCount: number;
  avgAnswerTimeMs: number | null;
  correctAnswerAvgMs: number | null;
  wrongAnswerAvgMs: number | null;
}

function outcomeFor(
  trial: DiscriminationTrial,
  response: DiscriminationTrialAnswerDto | undefined,
): DiscriminationOutcome {
  const answer = response?.answer ?? null;
  if (answer === null) {
    return 'FALSE_NEGATIVE';
  }
  if (trial.identical) {
    return answer === 'IDENTICAL' ? 'TRUE_NEGATIVE' : 'FALSE_POSITIVE';
  }
  return answer === 'DIFFERENT' ? 'TRUE_POSITIVE' : 'FALSE_NEGATIVE';
}

function average(values: number[]): number | null {
  return values.length === 0
    ? null
    : values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function scoreDiscriminationSession(
  trials: DiscriminationTrial[],
  responses: DiscriminationTrialAnswerDto[],
): DiscriminationSessionScore {
  const responseByIndex = new Map(
    responses.map((response) => [response.index, response]),
  );
  const entries = trials.map((trial) => {
    const response = responseByIndex.get(trial.index);
    return {
      outcome: outcomeFor(trial, response),
      answered: (response?.answer ?? null) !== null,
      timeMs: response?.timeMs ?? null,
    };
  });
  const outcomes = entries.map(({ outcome }) => outcome);
  const isCorrect = (outcome: DiscriminationOutcome) =>
    outcome === 'TRUE_POSITIVE' || outcome === 'TRUE_NEGATIVE';

  const correctCount = outcomes.filter(isCorrect).length;
  const falsePositiveCount = outcomes.filter(
    (outcome) => outcome === 'FALSE_POSITIVE',
  ).length;
  const identicalCount = trials.filter(({ identical }) => identical).length;

  const precision =
    trials.length === 0 ? 0 : (correctCount / trials.length) * 100;
  const correctTimes = entries
    .filter(({ outcome, timeMs }) => isCorrect(outcome) && timeMs !== null)
    .map(({ timeMs }) => timeMs as number);
  const correctAvgMs = average(correctTimes);
  const speed =
    correctAvgMs === null
      ? 0
      : 100 *
        Math.min(
          1,
          Math.max(
            0,
            (DISCRIMINATION_SPEED_WORST_MS - correctAvgMs) /
              (DISCRIMINATION_SPEED_WORST_MS - DISCRIMINATION_SPEED_BEST_MS),
          ),
        );
  const falsePositivePct =
    identicalCount === 0 ? 0 : (falsePositiveCount / identicalCount) * 100;
  const penalty = Math.max(
    0,
    (falsePositivePct - DISCRIMINATION_FP_PENALTY_THRESHOLD_PCT) *
      DISCRIMINATION_FP_PENALTY_FACTOR,
  );
  const score = Math.round(
    Math.min(
      100,
      Math.max(
        0,
        DISCRIMINATION_PRECISION_WEIGHT * precision +
          DISCRIMINATION_SPEED_WEIGHT * speed -
          penalty,
      ),
    ),
  );

  const answeredTimes = entries
    .filter(({ answered, timeMs }) => answered && timeMs !== null)
    .map(({ timeMs }) => timeMs as number);
  const wrongTimes = entries
    .filter(
      ({ outcome, answered, timeMs }) =>
        answered && !isCorrect(outcome) && timeMs !== null,
    )
    .map(({ timeMs }) => timeMs as number);
  const avgAnswered = average(answeredTimes);
  const avgWrong = average(wrongTimes);

  return {
    score,
    outcomes,
    correctCount,
    wrongIdenticalCount: entries.filter(
      ({ outcome, answered }) => outcome === 'FALSE_NEGATIVE' && answered,
    ).length,
    wrongDifferentCount: falsePositiveCount,
    unansweredCount: entries.filter(({ answered }) => !answered).length,
    avgAnswerTimeMs: avgAnswered === null ? null : Math.round(avgAnswered),
    correctAnswerAvgMs: correctAvgMs === null ? null : Math.round(correctAvgMs),
    wrongAnswerAvgMs: avgWrong === null ? null : Math.round(avgWrong),
  };
}
