export type DominoFace = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type DominoLevel = 1 | 2 | 3 | 4;

export interface DominoTile {
  top: DominoFace;
  bottom: DominoFace;
}

export enum DominoPattern {
  HALVES = 'HALVES',
  CROSS = 'CROSS',
  INTERLEAVED = 'INTERLEAVED',
}

export type DominoHalfRule =
  | { kind: 'CONSTANT'; value: DominoFace }
  | { kind: 'STEP'; step: number }
  | { kind: 'ALTERNATING_VALUES'; values: readonly [DominoFace, DominoFace] }
  | { kind: 'ALTERNATING_STEPS'; steps: readonly [number, number] }
  | { kind: 'GROWING_STEP'; direction: 1 | -1 };

export interface DominoInterleavedSteps {
  topStep: number;
  bottomStep: number;
}

export type DominoRuleSpec =
  | { pattern: DominoPattern.HALVES; top: DominoHalfRule; bottom: DominoHalfRule }
  | { pattern: DominoPattern.CROSS; offset: number; bottom: DominoHalfRule }
  | {
      pattern: DominoPattern.INTERLEAVED;
      even: DominoInterleavedSteps;
      odd: DominoInterleavedSteps;
    };

export interface DominoRule {
  id: string;
  userText: string;
  hintText: string;
}

export interface DominoItem {
  level: DominoLevel;
  seed: string;
  tiles: readonly DominoTile[];
  visibleTiles: readonly DominoTile[];
  answer: DominoTile;
  rule: DominoRule;
  ruleSpec: DominoRuleSpec;
  pattern: DominoPattern;
  length: number;
  hasWrap: boolean;
}
