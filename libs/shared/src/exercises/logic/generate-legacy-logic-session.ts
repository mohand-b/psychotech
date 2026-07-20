import { AXIS_TRAINING, LogicTraining } from '../../domain';
import { AxisType } from '../../enums';
import { createSeededRng } from '../rng';
import { buildLogicChoices } from './logic-choices';
import { LogicDifficulty, LogicRuleItem } from './logic-rule-item';
import { LOGIC_RULES } from './logic-rules';

export function generateLegacyLogicSession(
  seed: string,
  training: LogicTraining = AXIS_TRAINING[AxisType.LOGIC],
): LogicRuleItem[] {
  const rng = createSeededRng(seed);
  const itemsPerLevel = training.exerciseCount / training.difficultyLevels;
  const items: LogicRuleItem[] = [];
  for (let level = 1; level <= training.difficultyLevels; level += 1) {
    const difficulty = level as LogicDifficulty;
    const pool = LOGIC_RULES.filter((rule) => rule.difficulty === difficulty);
    for (let position = 0; position < itemsPerLevel; position += 1) {
      const rule = rng.pick(pool);
      const puzzle = rule.generate(rng);
      const { choices, answerIndex } = buildLogicChoices(rng, puzzle);
      items.push({
        index: items.length,
        ruleId: rule.id,
        difficulty,
        sequence: puzzle.terms,
        choices,
        answerIndex,
        points: difficulty,
      });
    }
  }
  return items;
}
