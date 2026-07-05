export type LogicDifficulty = 1 | 2 | 3 | 4 | 5;

export interface LogicItem {
  index: number;
  ruleId: string;
  difficulty: LogicDifficulty;
  sequence: string[];
  choices: string[];
  answerIndex: number;
  points: number;
}
