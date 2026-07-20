import { LogicFamily } from '../../enums';
import { DominoItem } from '../domino';
import { MatrixItem, MatrixProposal } from '../matrix';
import { TriangleItem } from '../triangle';
import { LogicDifficulty } from './logic-item';

export enum LogicNumericStructure {
  SEQUENCE = 'SEQUENCE',
  TRIANGLE = 'TRIANGLE',
}

export interface LogicV2Rule {
  id: string;
  userText: string;
  hintText?: string;
}

interface LogicV2ItemBase {
  index: number;
  family: LogicFamily;
  difficulty: LogicDifficulty;
  points: number;
  rule: LogicV2Rule;
}

export interface NumericLogicV2Item extends LogicV2ItemBase {
  family: LogicFamily.NUMERIC;
  structure: LogicNumericStructure.SEQUENCE;
  sequence: string[];
  choices: string[];
  answerIndex: number;
}

export interface TriangleLogicV2Item extends LogicV2ItemBase {
  family: LogicFamily.NUMERIC;
  structure: LogicNumericStructure.TRIANGLE;
  triangle: TriangleItem;
  answer: number;
}

export interface DominoLogicV2Item extends LogicV2ItemBase {
  family: LogicFamily.DOMINO;
  domino: DominoItem;
}

export interface MatrixLogicV2Item extends LogicV2ItemBase {
  family: LogicFamily.MATRIX_I | LogicFamily.MATRIX_II;
  matrix: MatrixItem;
  proposals: readonly MatrixProposal[];
  answerIndex: number;
}

export type LogicV2Item =
  | NumericLogicV2Item
  | TriangleLogicV2Item
  | DominoLogicV2Item
  | MatrixLogicV2Item;

export interface LogicV1ItemShape {
  index: number;
  ruleId: string;
  difficulty: LogicDifficulty;
  sequence: string[];
  choices: string[];
  answerIndex: number;
  points: number;
}

export function logicV1ToV2Items(
  items: LogicV1ItemShape[],
  hintFor: (item: LogicV1ItemShape) => string,
): NumericLogicV2Item[] {
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
