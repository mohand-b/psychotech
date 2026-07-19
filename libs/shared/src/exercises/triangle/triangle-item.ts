export type TriangleLevel = 1 | 2 | 3 | 4 | 5;

export enum TriangleSlot {
  TOP = 'TOP',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
  CENTER = 'CENTER',
}

export interface TriangleValues {
  top: number;
  left: number;
  right: number;
  center: number;
}

export interface TriangleMissing {
  triangleIndex: number;
  slot: TriangleSlot;
}

export interface TriangleRule {
  id: string;
  userText: string;
}

export interface TriangleItem {
  level: TriangleLevel;
  seed: string;
  triangles: TriangleValues[];
  missing: TriangleMissing;
  answer: number;
  rule: TriangleRule;
  patternId: string;
  length: number;
}
