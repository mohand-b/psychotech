import { AXIS_TRAINING, LogicTraining } from '../../domain';
import { AxisType } from '../../enums';
import { createSeededRng } from '../rng';
import { buildLogicChoices } from './logic-choices';
import { LogicDifficulty, LogicItem } from './logic-item';
import { LOGIC_RULES } from './logic-rules';

export interface GeneratedLogicItem {
  item: LogicItem;
  ruleId: string;
}

export function generateLogicSessionDetailed(
  seed: string,
  training: LogicTraining = AXIS_TRAINING[AxisType.LOGIC],
): GeneratedLogicItem[] {
  const rng = createSeededRng(seed);
  const itemsPerLevel = training.exerciseCount / training.difficultyLevels;
  const generated: GeneratedLogicItem[] = [];
  for (let level = 1; level <= training.difficultyLevels; level += 1) {
    const difficulty = level as LogicDifficulty;
    const pool = LOGIC_RULES.filter((rule) => rule.difficulty === difficulty);
    for (let position = 0; position < itemsPerLevel; position += 1) {
      const rule = rng.pick(pool);
      const puzzle = rule.generate(rng);
      const { choices, answerIndex } = buildLogicChoices(rng, puzzle);
      generated.push({
        ruleId: rule.id,
        item: {
          index: generated.length,
          difficulty,
          sequence: puzzle.terms,
          choices,
          answerIndex,
          points: difficulty,
        },
      });
    }
  }
  return generated;
}

export function generateLogicSession(
  seed: string,
  training: LogicTraining = AXIS_TRAINING[AxisType.LOGIC],
): LogicItem[] {
  return generateLogicSessionDetailed(seed, training).map(({ item }) => item);
}
