import { LogicFamily } from '../../enums';
import { DominoItem } from '../domino';
import { MatrixItem, MatrixProposal } from '../matrix';
import { LogicDifficulty } from './logic-item';

export interface LogicV2Rule {
  id: string;
  userText: string;
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
  sequence: string[];
  choices: string[];
  answerIndex: number;
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
    difficulty: item.difficulty,
    points: item.points,
    sequence: item.sequence,
    choices: item.choices,
    answerIndex: item.answerIndex,
    rule: { id: item.ruleId, userText: hintFor(item) },
  }));
}
