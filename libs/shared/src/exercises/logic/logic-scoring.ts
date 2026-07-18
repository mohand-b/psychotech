import { LogicItemAnswerDto } from '../../dtos/session';
import { ScoreBand } from '../../enums';
import { LogicItem } from './logic-item';

export type LogicItemStatus = 'CORRECT' | 'WRONG' | 'SKIPPED' | 'UNREACHED';

export const LOGIC_PRECISION_WEIGHT = 0.85;
export const LOGIC_COVERAGE_WEIGHT = 0.15;

export const SCORE_EXCELLENT_MIN = 80;
export const SCORE_ACCEPTABLE_MIN = 70;
export const SCORE_FRAGILE_MIN = 60;

export interface LogicSessionScore {
  score: number;
  precision: number;
  coverage: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  unreachedCount: number;
  statuses: LogicItemStatus[];
  avgAnswerTimeMs: number | null;
}

function statusFor(
  item: LogicItem,
  response: LogicItemAnswerDto | undefined,
): LogicItemStatus {
  if (!response) {
    return 'UNREACHED';
  }
  if (response.answerIndex !== null) {
    return response.answerIndex === item.answerIndex ? 'CORRECT' : 'WRONG';
  }
  return response.visited ? 'SKIPPED' : 'UNREACHED';
}

export function computeLogicScore(
  statuses: LogicItemStatus[],
  points: number[],
  answerTimesMs: number[],
): LogicSessionScore {
  const totalPoints = points.reduce((sum, value) => sum + value, 0);
  const earnedPoints = points.reduce(
    (sum, value, position) =>
      statuses[position] === 'CORRECT' ? sum + value : sum,
    0,
  );
  const counts = {
    correctCount: statuses.filter((status) => status === 'CORRECT').length,
    wrongCount: statuses.filter((status) => status === 'WRONG').length,
    skippedCount: statuses.filter((status) => status === 'SKIPPED').length,
    unreachedCount: statuses.filter((status) => status === 'UNREACHED').length,
  };
  const precision = totalPoints === 0 ? 0 : (earnedPoints / totalPoints) * 100;
  const coverage =
    statuses.length === 0
      ? 0
      : ((statuses.length - counts.unreachedCount) / statuses.length) * 100;
  const score = Math.round(
    Math.min(
      100,
      Math.max(
        0,
        LOGIC_PRECISION_WEIGHT * precision + LOGIC_COVERAGE_WEIGHT * coverage,
      ),
    ),
  );
  const avgAnswerTimeMs =
    answerTimesMs.length === 0
      ? null
      : Math.round(
          answerTimesMs.reduce((sum, timeMs) => sum + timeMs, 0) /
            answerTimesMs.length,
        );
  return { score, precision, coverage, ...counts, statuses, avgAnswerTimeMs };
}

export function scoreLogicSession(
  items: LogicItem[],
  responses: LogicItemAnswerDto[],
): LogicSessionScore {
  const responseByIndex = new Map(
    responses.map((response) => [response.index, response]),
  );
  const statuses = items.map((item) =>
    statusFor(item, responseByIndex.get(item.index)),
  );
  const answerTimes = responses
    .filter((response) => response.answerIndex !== null)
    .map((response) => response.timeMs);
  return computeLogicScore(
    statuses,
    items.map((item) => item.points),
    answerTimes,
  );
}

export function avisFromScore(score: number): ScoreBand {
  if (score >= SCORE_EXCELLENT_MIN) {
    return ScoreBand.EXCELLENT;
  }
  if (score >= SCORE_ACCEPTABLE_MIN) {
    return ScoreBand.ACCEPTABLE;
  }
  if (score >= SCORE_FRAGILE_MIN) {
    return ScoreBand.FRAGILE;
  }
  return ScoreBand.INSUFFICIENT;
}
