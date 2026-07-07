import { ShapeId } from '../../enums';

export type ShapeRotation = 0 | 90 | 180 | 270;

export interface CharElement {
  kind: 'CHAR';
  value: string;
}

export interface ShapeElement {
  kind: 'SHAPE';
  shape: ShapeId;
  rotation: ShapeRotation;
}

export type DiscriminationElement = CharElement | ShapeElement;

export interface SequenceOffset {
  x: number;
  y: number;
}

export interface DiscriminationTrial {
  index: number;
  a: DiscriminationElement[];
  b: DiscriminationElement[];
  identical: boolean;
  offsetA: SequenceOffset;
  offsetB: SequenceOffset;
}
