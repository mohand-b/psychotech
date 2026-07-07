import { ShapeId } from '../../enums';
import {
  DiscriminationElement,
  ShapeRotation,
} from './discrimination-trial';

const DIGITS = '0123456789';
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

export const DISCRIMINATION_CHAR_POOL: readonly string[] = [
  ...DIGITS,
  ...LETTERS,
];

export const CONFUSABLE_CHAR_PAIRS: readonly (readonly [string, string])[] = [
  ['6', '9'],
  ['1', '7'],
  ['3', '8'],
  ['B', '8'],
  ['S', '5'],
  ['Z', '2'],
  ['M', 'W'],
  ['E', 'F'],
  ['P', 'R'],
  ['U', 'V'],
  ['C', 'G'],
  ['K', 'X'],
];

export const CONFUSABLE_SHAPE_PAIRS: readonly (readonly [ShapeId, ShapeId])[] = [
  [ShapeId.SQUARE, ShapeId.RECTANGLE],
  [ShapeId.SQUARE, ShapeId.DIAMOND],
  [ShapeId.TRIANGLE, ShapeId.DIAMOND],
  [ShapeId.CIRCLE, ShapeId.SQUARE],
];

export const DISTINCT_ROTATIONS: Record<ShapeId, readonly ShapeRotation[]> = {
  [ShapeId.TRIANGLE]: [0, 90, 180, 270],
  [ShapeId.SQUARE]: [0],
  [ShapeId.CIRCLE]: [0],
  [ShapeId.DIAMOND]: [0, 90],
  [ShapeId.RECTANGLE]: [0, 90],
};

export function canonicalRotation(
  shape: ShapeId,
  rotation: ShapeRotation,
): ShapeRotation {
  const distinct = DISTINCT_ROTATIONS[shape];
  if (distinct.length === 1) {
    return 0;
  }
  if (distinct.length === 2) {
    return (rotation % 180) as ShapeRotation;
  }
  return rotation;
}

export function sameElement(
  first: DiscriminationElement,
  second: DiscriminationElement,
): boolean {
  if (first.kind === 'CHAR' || second.kind === 'CHAR') {
    return (
      first.kind === 'CHAR' &&
      second.kind === 'CHAR' &&
      first.value === second.value
    );
  }
  return (
    first.shape === second.shape &&
    canonicalRotation(first.shape, first.rotation) ===
      canonicalRotation(second.shape, second.rotation)
  );
}

export function confusablePartnersFor(value: string): string[] {
  return CONFUSABLE_CHAR_PAIRS.flatMap(([left, right]) => {
    if (left === value) {
      return [right];
    }
    return right === value ? [left] : [];
  });
}

export function shapePartnersFor(shape: ShapeId): ShapeId[] {
  return CONFUSABLE_SHAPE_PAIRS.flatMap(([left, right]) => {
    if (left === shape) {
      return [right];
    }
    return right === shape ? [left] : [];
  });
}
