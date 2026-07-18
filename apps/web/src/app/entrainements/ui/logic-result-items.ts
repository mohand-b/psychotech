import {
  LOGIC_CONTENT_VERSION_V2,
  LogicFamily,
  LogicItem,
  LogicV2Item,
  TargetedLogicResultDto,
  generateLogicSession,
  generateLogicV2Session,
  logicV1ToV2Items,
  resolveLogicRuleHint,
} from '@psychotech/shared';

export function logicItemsForResult(
  result: TargetedLogicResultDto,
): LogicV2Item[] {
  return result.contentVersion >= LOGIC_CONTENT_VERSION_V2
    ? generateLogicV2Session(result.seed, result.logicFamily)
    : logicV1ToV2Items(generateLogicSession(result.seed), resolveLogicRuleHint);
}

export function logicAnalyzerItems(items: LogicV2Item[]): LogicItem[] {
  return items.map((item) =>
    item.family === LogicFamily.NUMERIC
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
