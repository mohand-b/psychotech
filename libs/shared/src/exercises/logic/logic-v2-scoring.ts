import { LogicFamilyMetricsEntry } from '../../domain/axis-metrics';
import { LogicItemAnswerDto } from '../../dtos/session';
import { LogicFamily } from '../../enums';
import {
  LogicItemStatus,
  LogicSessionScore,
  computeLogicScore,
} from './logic-scoring';
import { LogicV2Item } from './logic-v2-item';

export function logicV2AnswerGiven(
  item: LogicV2Item,
  response: LogicItemAnswerDto,
): boolean {
  if (item.family === LogicFamily.DOMINO) {
    return (
      response.dominoTop !== null &&
      response.dominoTop !== undefined &&
      response.dominoBottom !== null &&
      response.dominoBottom !== undefined
    );
  }
  return response.answerIndex !== null;
}

export function logicV2AnswerCorrect(
  item: LogicV2Item,
  response: LogicItemAnswerDto,
): boolean {
  if (item.family === LogicFamily.DOMINO) {
    return (
      response.dominoTop === item.domino.answer.top &&
      response.dominoBottom === item.domino.answer.bottom
    );
  }
  return response.answerIndex === item.answerIndex;
}

function statusForV2(
  item: LogicV2Item,
  response: LogicItemAnswerDto | undefined,
): LogicItemStatus {
  if (!response) {
    return 'UNREACHED';
  }
  if (logicV2AnswerGiven(item, response)) {
    return logicV2AnswerCorrect(item, response) ? 'CORRECT' : 'WRONG';
  }
  return response.visited ? 'SKIPPED' : 'UNREACHED';
}

export function scoreLogicV2Session(
  items: LogicV2Item[],
  responses: LogicItemAnswerDto[],
): LogicSessionScore {
  const responseByIndex = new Map(
    responses.map((response) => [response.index, response]),
  );
  const statuses = items.map((item) =>
    statusForV2(item, responseByIndex.get(item.index)),
  );
  const answerTimes = items
    .map((item) => {
      const response = responseByIndex.get(item.index);
      return response && logicV2AnswerGiven(item, response)
        ? response.timeMs
        : null;
    })
    .filter((timeMs): timeMs is number => timeMs !== null);
  return computeLogicScore(
    statuses,
    items.map((item) => item.points),
    answerTimes,
  );
}

export function computeLogicFamilyBreakdown(
  items: LogicV2Item[],
  responses: LogicItemAnswerDto[],
): LogicFamilyMetricsEntry[] {
  const responseByIndex = new Map(
    responses.map((response) => [response.index, response]),
  );
  const byFamily = new Map<LogicFamily, LogicFamilyMetricsEntry>();
  for (const item of items) {
    const entry = byFamily.get(item.family) ?? {
      family: item.family,
      errors: 0,
      timeMs: 0,
    };
    const response = responseByIndex.get(item.index);
    if (response) {
      entry.timeMs += response.timeMs;
      if (
        logicV2AnswerGiven(item, response) &&
        !logicV2AnswerCorrect(item, response)
      ) {
        entry.errors += 1;
      }
    }
    byFamily.set(item.family, entry);
  }
  return [...byFamily.values()];
}
