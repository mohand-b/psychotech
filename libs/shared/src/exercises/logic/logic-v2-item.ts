import { LogicFamily } from '../../enums';
import { DominoItem } from '../domino';
import { MatrixItem } from '../matrix';
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
  answerIndex: number;
}

export type LogicV2Item =
  | NumericLogicV2Item
  | DominoLogicV2Item
  | MatrixLogicV2Item;
