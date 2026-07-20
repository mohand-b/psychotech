import { LogicFamily } from '../../enums';
import { DominoItem } from '../domino';
import { MatrixItem, MatrixProposal } from '../matrix';
import { TriangleItem } from '../triangle';
import { LogicDifficulty } from './logic-rule-item';

export enum LogicNumericStructure {
  SEQUENCE = 'SEQUENCE',
  TRIANGLE = 'TRIANGLE',
}

export interface LogicItemRule {
  id: string;
  userText: string;
  hintText?: string;
}

interface LogicItemBase {
  index: number;
  family: LogicFamily;
  difficulty: LogicDifficulty;
  points: number;
  rule: LogicItemRule;
}

export interface NumericLogicItem extends LogicItemBase {
  family: LogicFamily.NUMERIC;
  structure: LogicNumericStructure.SEQUENCE;
  sequence: string[];
  choices: string[];
  answerIndex: number;
}

export interface TriangleLogicItem extends LogicItemBase {
  family: LogicFamily.NUMERIC;
  structure: LogicNumericStructure.TRIANGLE;
  triangle: TriangleItem;
  answer: number;
}

export interface DominoLogicItem extends LogicItemBase {
  family: LogicFamily.DOMINO;
  domino: DominoItem;
}

export interface MatrixLogicItem extends LogicItemBase {
  family: LogicFamily.MATRIX_I | LogicFamily.MATRIX_II;
  matrix: MatrixItem;
  proposals: readonly MatrixProposal[];
  answerIndex: number;
}

export type LogicItem =
  | NumericLogicItem
  | TriangleLogicItem
  | DominoLogicItem
  | MatrixLogicItem;

export interface LegacyLogicItemShape {
  index: number;
  ruleId: string;
  difficulty: LogicDifficulty;
  sequence: string[];
  choices: string[];
  answerIndex: number;
  points: number;
}

export function adaptLegacyLogicItems(
  items: LegacyLogicItemShape[],
  hintFor: (item: LegacyLogicItemShape) => string,
): NumericLogicItem[] {
  return items.map((item) => ({
    index: item.index,
    family: LogicFamily.NUMERIC,
    structure: LogicNumericStructure.SEQUENCE,
    difficulty: item.difficulty,
    points: item.points,
    sequence: item.sequence,
    choices: item.choices,
    answerIndex: item.answerIndex,
    rule: { id: item.ruleId, userText: hintFor(item) },
  }));
}
