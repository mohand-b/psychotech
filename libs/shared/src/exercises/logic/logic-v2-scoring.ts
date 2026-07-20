import { LogicFamilyMetricsEntry } from '../../domain/axis-metrics';
import { LogicFamilyResultDto, LogicItemAnswerDto } from '../../dtos/session';
import { LogicFamily, LogicFamilyFilter } from '../../enums';
import {
  LogicItemStatus,
  LogicSessionScore,
  computeLogicScore,
} from './logic-scoring';
import { LogicNumericStructure, LogicV2Item } from './logic-v2-item';

function isTriangleItem(item: LogicV2Item): boolean {
  return (
    item.family === LogicFamily.NUMERIC &&
    item.structure === LogicNumericStructure.TRIANGLE
  );
}

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
  if (isTriangleItem(item)) {
    return response.numericValue !== null && response.numericValue !== undefined;
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
  if (
    item.family === LogicFamily.NUMERIC &&
    item.structure === LogicNumericStructure.TRIANGLE
  ) {
    return response.numericValue === item.answer;
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

export function computeLogicFamilyAggregates(
  items: LogicV2Item[],
  responses: LogicItemAnswerDto[],
  familyFilter: LogicFamilyFilter | null,
): LogicFamilyResultDto[] {
  const responseByIndex = new Map(
    responses.map((response) => [response.index, response]),
  );
  const byFamily = new Map<LogicFamily, LogicFamilyResultDto>();
  for (const item of items) {
    const entry = byFamily.get(item.family) ?? {
      family: item.family,
      correct: 0,
      attempted: 0,
      total: 0,
      ratePct: 0,
      timeMs: 0,
      marker: null,
    };
    entry.total += 1;
    const response = responseByIndex.get(item.index);
    if (response) {
      entry.timeMs += response.timeMs;
      if (logicV2AnswerGiven(item, response)) {
        entry.attempted += 1;
        if (logicV2AnswerCorrect(item, response)) {
          entry.correct += 1;
        }
      }
    }
    byFamily.set(item.family, entry);
  }
  const aggregates = [...byFamily.values()].map((entry) => ({
    ...entry,
    ratePct:
      entry.attempted === 0
        ? 0
        : Math.round((entry.correct / entry.attempted) * 100),
  }));
  if (familyFilter !== null || aggregates.length < 2) {
    return aggregates;
  }
  const allSameRate = aggregates.every(
    (entry) => entry.ratePct === aggregates[0].ratePct,
  );
  if (allSameRate) {
    return aggregates;
  }
  const strength = aggregates.reduce((best, entry) =>
    entry.ratePct > best.ratePct ||
    (entry.ratePct === best.ratePct && entry.correct > best.correct)
      ? entry
      : best,
  );
  const weakness = aggregates.reduce((worst, entry) =>
    entry.ratePct < worst.ratePct ||
    (entry.ratePct === worst.ratePct && entry.correct < worst.correct)
      ? entry
      : worst,
  );
  strength.marker = 'STRENGTH';
  weakness.marker = 'WEAKNESS';
  return aggregates;
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
