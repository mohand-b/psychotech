import {
  LOGIC_CONTENT_VERSION_V2,
  LogicFamily,
  LogicItem,
  LogicNumericStructure,
  LogicRuleItem,
  TargetedLogicResultDto,
  adaptLegacyLogicItems,
  generateLegacyLogicSession,
  generateLogicSession,
  resolveLogicRuleHint,
} from '@psychotech/shared';

export function logicItemsForResult(
  result: TargetedLogicResultDto,
): LogicItem[] {
  return result.contentVersion >= LOGIC_CONTENT_VERSION_V2
    ? generateLogicSession(
        result.seed,
        result.logicFamily,
        result.contentVersion,
      )
    : adaptLegacyLogicItems(
        generateLegacyLogicSession(result.seed),
        resolveLogicRuleHint,
      );
}

export function logicFamilyBoundaries(items: LogicItem[]): number[] {
  return items
    .slice(1)
    .map((item, index) => (item.family !== items[index].family ? index : null))
    .filter((index): index is number => index !== null);
}

export function logicAnalyzerItems(items: LogicItem[]): LogicRuleItem[] {
  return items.map((item) =>
    item.family === LogicFamily.NUMERIC &&
    item.structure === LogicNumericStructure.SEQUENCE
      ? {
          index: item.index,
          ruleId: item.rule.id,
          difficulty: item.difficulty,
          sequence: item.sequence,
          choices: item.choices,
          answerIndex: item.answerIndex,
          points: item.points,
        }
      : {
          index: item.index,
          ruleId: item.rule.id,
          difficulty: item.difficulty,
          sequence: [],
          choices: [],
          answerIndex: 0,
          points: item.points,
        },
  );
}
