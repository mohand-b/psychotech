import {
  MatrixProposalKind,
  generateMatrixItemFromCatalog,
} from '../matrix';
import { generateDominoItem } from '../domino';
import { DominoLevel } from '../domino/domino-item';
import { LogicFamily, LogicFamilyFilter } from '../../enums';
import { createSeededRng, SeededRng } from '../rng';
import { generateTriangleItem } from '../triangle';
import { buildLogicChoices } from './logic-choices';
import {
  LOGIC_CONTENT_VERSION_V3,
  logicFamiliesForFilter,
} from './logic-family';
import { LogicDifficulty } from './logic-rule-item';
import { resolveLogicRuleHint } from './logic-rule-hints';
import { LOGIC_RULES } from './logic-rules';
import {
  LogicNumericStructure,
  LogicItem,
  MatrixLogicItem,
  TriangleLogicItem,
} from './logic-item';

export const LOGIC_SESSION_LEVELS: readonly LogicDifficulty[] = [1, 2, 3, 4, 5];
export const LOGIC_FAMILY_BLOCK_SIZE = 10;
export const LOGIC_SESSION_SIZE = 40;
export const LOGIC_SESSION_MAX_POINTS = 120;
export const LOGIC_MATRIX_CHOICE_COUNT = 4;

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

function numericStructuresForLevel(
  count: number,
  contentVersion: number,
  rng: SeededRng,
): LogicNumericStructure[] {
  if (contentVersion < LOGIC_CONTENT_VERSION_V3) {
    return Array.from({ length: count }, () => LogicNumericStructure.SEQUENCE);
  }
  const half = count / 2;
  return rng.shuffle([
    ...Array.from({ length: half }, () => LogicNumericStructure.SEQUENCE),
    ...Array.from({ length: half }, () => LogicNumericStructure.TRIANGLE),
  ]);
}

function buildTriangleLogicItem(
  level: LogicDifficulty,
  index: number,
  itemSeed: string,
): TriangleLogicItem {
  const triangle = generateTriangleItem({ level, seed: itemSeed });
  return {
    index,
    family: LogicFamily.NUMERIC,
    structure: LogicNumericStructure.TRIANGLE,
    difficulty: level,
    points: level,
    triangle,
    answer: triangle.answer,
    rule: { ...triangle.rule },
  };
}

function buildMatrixLogicItem(
  family: LogicFamily.MATRIX_I | LogicFamily.MATRIX_II,
  level: LogicDifficulty,
  index: number,
  itemSeed: string,
): MatrixLogicItem {
  const catalogId =
    family === LogicFamily.MATRIX_I
      ? MATRIX_I_CATALOG_BY_LEVEL[level]
      : MATRIX_II_CATALOG_BY_LEVEL[level];
  const matrix = generateMatrixItemFromCatalog(catalogId, itemSeed);
  const choicesRng = createSeededRng(`${itemSeed}::choices`);
  const correct = matrix.proposals.filter(
    (proposal) => proposal.kind === MatrixProposalKind.CORRECT,
  );
  const distractors = choicesRng
    .shuffle(
      matrix.proposals.filter(
        (proposal) => proposal.kind !== MatrixProposalKind.CORRECT,
      ),
    )
    .slice(0, LOGIC_MATRIX_CHOICE_COUNT - correct.length);
  const proposals = choicesRng.shuffle([...correct, ...distractors]);
  return {
    index,
    family,
    difficulty: level,
    points: level,
    matrix,
    proposals,
    answerIndex: proposals.findIndex(
      (proposal) => proposal.kind === MatrixProposalKind.CORRECT,
    ),
    rule: { ...matrix.rule },
  };
}

interface LogicTutorialSlot {
  family: LogicFamily;
  structure?: LogicNumericStructure;
  level: LogicDifficulty;
}

const LOGIC_TUTORIAL_SLOTS: readonly LogicTutorialSlot[] = [
  {
    family: LogicFamily.NUMERIC,
    structure: LogicNumericStructure.SEQUENCE,
    level: 1,
  },
  {
    family: LogicFamily.NUMERIC,
    structure: LogicNumericStructure.TRIANGLE,
    level: 1,
  },
  { family: LogicFamily.DOMINO, level: 1 },
  { family: LogicFamily.MATRIX_I, level: 1 },
  { family: LogicFamily.MATRIX_II, level: 1 },
];

export function generateLogicTutorial(seed: string): LogicItem[] {
  const numericRng = createSeededRng(`${seed}::logic-v2-tutorial::numeric`);
  return LOGIC_TUTORIAL_SLOTS.map((slot, index) => {
    const itemSeed = `${seed}::logic-v2-tutorial::${slot.family}::${index}`;
    if (
      slot.family === LogicFamily.NUMERIC &&
      slot.structure === LogicNumericStructure.TRIANGLE
    ) {
      return buildTriangleLogicItem(slot.level, index, itemSeed);
    }
    if (slot.family === LogicFamily.NUMERIC) {
      const pool = LOGIC_RULES.filter(
        (rule) => rule.difficulty === slot.level,
      );
      const rule = numericRng.pick(pool);
      const puzzle = rule.generate(numericRng);
      const { choices, answerIndex } = buildLogicChoices(numericRng, puzzle);
      return {
        index,
        family: LogicFamily.NUMERIC,
        structure: LogicNumericStructure.SEQUENCE,
        difficulty: slot.level,
        points: slot.level,
        sequence: puzzle.terms,
        choices,
        answerIndex,
        rule: {
          id: rule.id,
          userText: resolveLogicRuleHint({
            ruleId: rule.id,
            sequence: puzzle.terms,
          }),
        },
      };
    }
    if (slot.family === LogicFamily.DOMINO) {
      const domino = generateDominoItem({ level: 1, seed: itemSeed });
      return {
        index,
        family: LogicFamily.DOMINO,
        difficulty: slot.level,
        points: slot.level,
        domino,
        rule: { ...domino.rule },
      };
    }
    return buildMatrixLogicItem(slot.family, slot.level, index, itemSeed);
  });
}

export function generateLogicSession(
  seed: string,
  familyFilter: LogicFamilyFilter | null = null,
  contentVersion: number = LOGIC_CONTENT_VERSION_V3,
): LogicItem[] {
  const families = logicFamiliesForFilter(familyFilter);
  const perLevel = itemsPerLevel(familyFilter);
  const numericRng = createSeededRng(`${seed}::logic-v2::numeric`);
  const items: LogicItem[] = [];
  for (const family of families) {
    for (const level of LOGIC_SESSION_LEVELS) {
      const structures =
        family === LogicFamily.NUMERIC
          ? numericStructuresForLevel(perLevel, contentVersion, numericRng)
          : null;
      for (let position = 0; position < perLevel; position += 1) {
        const index = items.length;
        const itemSeed = `${seed}::logic-v2::${family}::${level}::${position}`;
        if (family === LogicFamily.NUMERIC) {
          if (structures?.[position] === LogicNumericStructure.TRIANGLE) {
            items.push(buildTriangleLogicItem(level, index, itemSeed));
            continue;
          }
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
            structure: LogicNumericStructure.SEQUENCE,
            difficulty: level,
            points: level,
            sequence: puzzle.terms,
            choices,
            answerIndex,
            rule: {
              id: rule.id,
              userText: resolveLogicRuleHint({
                ruleId: rule.id,
                sequence: puzzle.terms,
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
        items.push(buildMatrixLogicItem(family, level, index, itemSeed));
      }
    }
  }
  return items;
}
