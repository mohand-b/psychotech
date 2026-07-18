import {
  MatrixProposalKind,
  generateMatrixItemFromCatalog,
} from '../matrix';
import { generateDominoItem } from '../domino';
import { DominoLevel } from '../domino/domino-item';
import { LogicFamily, LogicFamilyFilter } from '../../enums';
import { createSeededRng } from '../rng';
import { buildLogicChoices } from './logic-choices';
import { logicFamiliesForFilter } from './logic-family';
import { LogicDifficulty } from './logic-item';
import { resolveLogicRuleHint } from './logic-rule-hints';
import { LOGIC_RULES } from './logic-rules';
import { LogicV2Item } from './logic-v2-item';

export const LOGIC_V2_LEVELS: readonly LogicDifficulty[] = [1, 2, 3, 4, 5];
export const LOGIC_V2_BLOCK_SIZE = 10;
export const LOGIC_V2_SESSION_SIZE = 40;
export const LOGIC_V2_MAX_POINTS = 120;

const DOMINO_MAX_LEVEL: DominoLevel = 4;

const MATRIX_I_CATALOG_BY_LEVEL: Record<LogicDifficulty, string> = {
  1: 'addition-traits',
  2: 'addition-traits',
  3: 'croisees-traits-nombres',
  4: 'croisees-figures-decor',
  5: 'croisees-traits-nature-nombre',
};

const MATRIX_II_CATALOG_BY_LEVEL: Record<LogicDifficulty, string> = {
  1: 'soustraction-figures',
  2: 'soustraction-figures',
  3: 'soustraction-traits',
  4: 'distribution-figures-triple',
  5: 'distribution-figures-triple',
};

function itemsPerLevel(filter: LogicFamilyFilter | null): number {
  switch (filter) {
    case LogicFamilyFilter.NUMERIC:
    case LogicFamilyFilter.DOMINO:
      return 8;
    case LogicFamilyFilter.MATRIX:
      return 4;
    default:
      return 2;
  }
}

export function generateLogicV2Session(
  seed: string,
  familyFilter: LogicFamilyFilter | null = null,
): LogicV2Item[] {
  const families = logicFamiliesForFilter(familyFilter);
  const perLevel = itemsPerLevel(familyFilter);
  const numericRng = createSeededRng(`${seed}::logic-v2::numeric`);
  const items: LogicV2Item[] = [];
  for (const family of families) {
    for (const level of LOGIC_V2_LEVELS) {
      for (let position = 0; position < perLevel; position += 1) {
        const index = items.length;
        const itemSeed = `${seed}::logic-v2::${family}::${level}::${position}`;
        if (family === LogicFamily.NUMERIC) {
          const pool = LOGIC_RULES.filter((rule) => rule.difficulty === level);
          const rule = numericRng.pick(pool);
          const puzzle = rule.generate(numericRng);
          const { choices, answerIndex } = buildLogicChoices(
            numericRng,
            puzzle,
          );
          items.push({
            index,
            family,
            difficulty: level,
            points: level,
            sequence: puzzle.terms,
            choices,
            answerIndex,
            rule: {
              id: rule.id,
              userText: resolveLogicRuleHint({
                index,
                ruleId: rule.id,
                difficulty: level,
                sequence: puzzle.terms,
                choices,
                answerIndex,
                points: level,
              }),
            },
          });
          continue;
        }
        if (family === LogicFamily.DOMINO) {
          const domino = generateDominoItem({
            level: Math.min(level, DOMINO_MAX_LEVEL) as DominoLevel,
            seed: itemSeed,
          });
          items.push({
            index,
            family,
            difficulty: level,
            points: level,
            domino,
            rule: { ...domino.rule },
          });
          continue;
        }
        const catalogId =
          family === LogicFamily.MATRIX_I
            ? MATRIX_I_CATALOG_BY_LEVEL[level]
            : MATRIX_II_CATALOG_BY_LEVEL[level];
        const matrix = generateMatrixItemFromCatalog(catalogId, itemSeed);
        items.push({
          index,
          family,
          difficulty: level,
          points: level,
          matrix,
          answerIndex: matrix.proposals.findIndex(
            (proposal) => proposal.kind === MatrixProposalKind.CORRECT,
          ),
          rule: { ...matrix.rule },
        });
      }
    }
  }
  return items;
}
