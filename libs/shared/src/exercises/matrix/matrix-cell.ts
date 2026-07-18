export enum MatrixStructure {
  CROSSED = 'CROSSED',
  DISTRIBUTION = 'DISTRIBUTION',
  COMPOSITION = 'COMPOSITION',
}

export enum MatrixCompositionVariant {
  ADDITION = 'ADDITION',
  SOUSTRACTION = 'SOUSTRACTION',
  EMBOITEMENT = 'EMBOITEMENT',
}

export enum MatrixRegister {
  FIGURES = 'FIGURES',
  TRAITS = 'TRAITS',
}

export type MatrixLevel = 1 | 2 | 3 | 4 | 5;

export enum MatrixSymbol {
  CROSS = 'CROSS',
  PLUS = 'PLUS',
  DIAMOND = 'DIAMOND',
  STAR = 'STAR',
  DOT = 'DOT',
  TRIANGLE = 'TRIANGLE',
}

export enum MatrixContainer {
  NONE = 'NONE',
  CIRCLE = 'CIRCLE',
  SQUARE = 'SQUARE',
  DOUBLE_SQUARE = 'DOUBLE_SQUARE',
}

export enum MatrixDecor {
  NONE = 'NONE',
  STRIPES = 'STRIPES',
  CORNER_DOTS = 'CORNER_DOTS',
  DIAMOND_DOTS = 'DIAMOND_DOTS',
}

export enum MatrixSize {
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE',
}

export enum MatrixFill {
  OUTLINE = 'OUTLINE',
  HATCHED = 'HATCHED',
  SOLID = 'SOLID',
}

export type MatrixRotation = 0 | 45 | 90;

export type MatrixCount = 1 | 2 | 3 | 4;

export enum MatrixStrokeType {
  ARC = 'ARC',
  HORIZONTAL = 'HORIZONTAL',
  VERTICAL = 'VERTICAL',
  OBLIQUE = 'OBLIQUE',
}

export type MatrixStrokeCount = 1 | 2 | 3;

export enum MatrixLayerKind {
  SYMBOL = 'SYMBOL',
  CONTAINER = 'CONTAINER',
  DECOR = 'DECOR',
  SIZE = 'SIZE',
  FILL = 'FILL',
  ROTATION = 'ROTATION',
  COUNT = 'COUNT',
  STROKE_A_TYPE = 'STROKE_A_TYPE',
  STROKE_A_COUNT = 'STROKE_A_COUNT',
  STROKE_B_TYPE = 'STROKE_B_TYPE',
  STROKE_B_COUNT = 'STROKE_B_COUNT',
}

export type MatrixLayerValue =
  | MatrixSymbol
  | MatrixContainer
  | MatrixDecor
  | MatrixSize
  | MatrixFill
  | MatrixRotation
  | MatrixCount
  | MatrixStrokeType
  | MatrixStrokeCount;

export enum MatrixCellKind {
  LAYERED = 'LAYERED',
  COMPOSITION = 'COMPOSITION',
}

export interface MatrixLayeredCell {
  kind: MatrixCellKind.LAYERED;
  register: MatrixRegister;
  symbol: MatrixSymbol;
  container: MatrixContainer;
  decor: MatrixDecor;
  size: MatrixSize;
  fill: MatrixFill;
  rotation: MatrixRotation;
  count: MatrixCount;
  strokeAType: MatrixStrokeType;
  strokeACount: MatrixStrokeCount;
  strokeBType: MatrixStrokeType;
  strokeBCount: MatrixStrokeCount;
}

export enum MatrixElementId {
  RING = 'RING',
  FRAME = 'FRAME',
  LOZENGE = 'LOZENGE',
  DELTA = 'DELTA',
  SALTIRE = 'SALTIRE',
  UPRIGHT_CROSS = 'UPRIGHT_CROSS',
  PELLET = 'PELLET',
  ARC_UP = 'ARC_UP',
  ARC_DOWN = 'ARC_DOWN',
  BAR_HORIZONTAL = 'BAR_HORIZONTAL',
  BAR_VERTICAL = 'BAR_VERTICAL',
  BAR_OBLIQUE = 'BAR_OBLIQUE',
  BAR_OBLIQUE_BACK = 'BAR_OBLIQUE_BACK',
}

export const MATRIX_FIGURE_ELEMENTS: readonly MatrixElementId[] = [
  MatrixElementId.RING,
  MatrixElementId.FRAME,
  MatrixElementId.LOZENGE,
  MatrixElementId.DELTA,
  MatrixElementId.SALTIRE,
  MatrixElementId.UPRIGHT_CROSS,
  MatrixElementId.PELLET,
];

export const MATRIX_STROKE_ELEMENTS: readonly MatrixElementId[] = [
  MatrixElementId.ARC_UP,
  MatrixElementId.ARC_DOWN,
  MatrixElementId.BAR_HORIZONTAL,
  MatrixElementId.BAR_VERTICAL,
  MatrixElementId.BAR_OBLIQUE,
  MatrixElementId.BAR_OBLIQUE_BACK,
];

export const MATRIX_NESTABLE_ELEMENTS: readonly MatrixElementId[] = [
  MatrixElementId.RING,
  MatrixElementId.FRAME,
  MatrixElementId.LOZENGE,
  MatrixElementId.DELTA,
  MatrixElementId.PELLET,
];

export interface MatrixCompositionCell {
  kind: MatrixCellKind.COMPOSITION;
  register: MatrixRegister;
  elements: readonly MatrixElementId[];
  nested: boolean;
}

export type MatrixCellSpec = MatrixLayeredCell | MatrixCompositionCell;

export const MATRIX_LAYER_KINDS: readonly MatrixLayerKind[] = [
  MatrixLayerKind.SYMBOL,
  MatrixLayerKind.CONTAINER,
  MatrixLayerKind.DECOR,
  MatrixLayerKind.SIZE,
  MatrixLayerKind.FILL,
  MatrixLayerKind.ROTATION,
  MatrixLayerKind.COUNT,
  MatrixLayerKind.STROKE_A_TYPE,
  MatrixLayerKind.STROKE_A_COUNT,
  MatrixLayerKind.STROKE_B_TYPE,
  MatrixLayerKind.STROKE_B_COUNT,
];

export const MATRIX_SYMBOLS: readonly MatrixSymbol[] = [
  MatrixSymbol.CROSS,
  MatrixSymbol.PLUS,
  MatrixSymbol.DIAMOND,
  MatrixSymbol.STAR,
  MatrixSymbol.DOT,
  MatrixSymbol.TRIANGLE,
];

export const MATRIX_VISIBLE_CONTAINERS: readonly MatrixContainer[] = [
  MatrixContainer.CIRCLE,
  MatrixContainer.SQUARE,
  MatrixContainer.DOUBLE_SQUARE,
];

export const MATRIX_DECORS: readonly MatrixDecor[] = [
  MatrixDecor.NONE,
  MatrixDecor.STRIPES,
  MatrixDecor.CORNER_DOTS,
  MatrixDecor.DIAMOND_DOTS,
];

export const MATRIX_SIZE_SCALE: readonly MatrixSize[] = [
  MatrixSize.SMALL,
  MatrixSize.MEDIUM,
  MatrixSize.LARGE,
];

export const MATRIX_FILL_SCALE: readonly MatrixFill[] = [
  MatrixFill.OUTLINE,
  MatrixFill.HATCHED,
  MatrixFill.SOLID,
];

export const MATRIX_ROTATION_SCALE: readonly MatrixRotation[] = [0, 45, 90];

export const MATRIX_COUNT_SCALE: readonly MatrixCount[] = [1, 2, 3, 4];

export const MATRIX_STROKE_TYPES: readonly MatrixStrokeType[] = [
  MatrixStrokeType.ARC,
  MatrixStrokeType.HORIZONTAL,
  MatrixStrokeType.VERTICAL,
  MatrixStrokeType.OBLIQUE,
];

export const MATRIX_STROKE_COUNT_SCALE: readonly MatrixStrokeCount[] = [
  1, 2, 3,
];

export function createDefaultMatrixCell(symbol: MatrixSymbol): MatrixLayeredCell {
  return {
    kind: MatrixCellKind.LAYERED,
    register: MatrixRegister.FIGURES,
    symbol,
    container: MatrixContainer.NONE,
    decor: MatrixDecor.NONE,
    size: MatrixSize.MEDIUM,
    fill: MatrixFill.SOLID,
    rotation: 0,
    count: 1,
    strokeAType: MatrixStrokeType.HORIZONTAL,
    strokeACount: 1,
    strokeBType: MatrixStrokeType.VERTICAL,
    strokeBCount: 1,
  };
}

export function createDefaultStrokeCell(
  strokeAType: MatrixStrokeType,
  strokeBType: MatrixStrokeType,
): MatrixLayeredCell {
  return {
    ...createDefaultMatrixCell(MatrixSymbol.DOT),
    register: MatrixRegister.TRAITS,
    strokeAType,
    strokeBType,
  };
}

export function createCompositionCell(
  register: MatrixRegister,
  elements: readonly MatrixElementId[],
  nested: boolean,
): MatrixCompositionCell {
  return {
    kind: MatrixCellKind.COMPOSITION,
    register,
    elements: nested ? [...elements] : [...elements].sort(),
    nested,
  };
}

export function getMatrixLayerValue(
  cell: MatrixLayeredCell,
  layer: MatrixLayerKind,
): MatrixLayerValue {
  switch (layer) {
    case MatrixLayerKind.SYMBOL:
      return cell.symbol;
    case MatrixLayerKind.CONTAINER:
      return cell.container;
    case MatrixLayerKind.DECOR:
      return cell.decor;
    case MatrixLayerKind.SIZE:
      return cell.size;
    case MatrixLayerKind.FILL:
      return cell.fill;
    case MatrixLayerKind.ROTATION:
      return cell.rotation;
    case MatrixLayerKind.COUNT:
      return cell.count;
    case MatrixLayerKind.STROKE_A_TYPE:
      return cell.strokeAType;
    case MatrixLayerKind.STROKE_A_COUNT:
      return cell.strokeACount;
    case MatrixLayerKind.STROKE_B_TYPE:
      return cell.strokeBType;
    case MatrixLayerKind.STROKE_B_COUNT:
      return cell.strokeBCount;
  }
}

export function withMatrixLayerValue(
  cell: MatrixLayeredCell,
  layer: MatrixLayerKind,
  value: MatrixLayerValue,
): MatrixLayeredCell {
  switch (layer) {
    case MatrixLayerKind.SYMBOL:
      return { ...cell, symbol: value as MatrixSymbol };
    case MatrixLayerKind.CONTAINER:
      return { ...cell, container: value as MatrixContainer };
    case MatrixLayerKind.DECOR:
      return { ...cell, decor: value as MatrixDecor };
    case MatrixLayerKind.SIZE:
      return { ...cell, size: value as MatrixSize };
    case MatrixLayerKind.FILL:
      return { ...cell, fill: value as MatrixFill };
    case MatrixLayerKind.ROTATION:
      return { ...cell, rotation: value as MatrixRotation };
    case MatrixLayerKind.COUNT:
      return { ...cell, count: value as MatrixCount };
    case MatrixLayerKind.STROKE_A_TYPE:
      return { ...cell, strokeAType: value as MatrixStrokeType };
    case MatrixLayerKind.STROKE_A_COUNT:
      return { ...cell, strokeACount: value as MatrixStrokeCount };
    case MatrixLayerKind.STROKE_B_TYPE:
      return { ...cell, strokeBType: value as MatrixStrokeType };
    case MatrixLayerKind.STROKE_B_COUNT:
      return { ...cell, strokeBCount: value as MatrixStrokeCount };
  }
}

export function matrixLayerScale(
  layer: MatrixLayerKind,
): readonly MatrixLayerValue[] | null {
  switch (layer) {
    case MatrixLayerKind.SIZE:
      return MATRIX_SIZE_SCALE;
    case MatrixLayerKind.FILL:
      return MATRIX_FILL_SCALE;
    case MatrixLayerKind.ROTATION:
      return MATRIX_ROTATION_SCALE;
    case MatrixLayerKind.COUNT:
      return MATRIX_COUNT_SCALE;
    case MatrixLayerKind.STROKE_A_COUNT:
    case MatrixLayerKind.STROKE_B_COUNT:
      return MATRIX_STROKE_COUNT_SCALE;
    default:
      return null;
  }
}

export function matrixCellsEqual(a: MatrixCellSpec, b: MatrixCellSpec): boolean {
  if (a.kind !== b.kind || a.register !== b.register) {
    return false;
  }
  if (
    a.kind === MatrixCellKind.COMPOSITION &&
    b.kind === MatrixCellKind.COMPOSITION
  ) {
    return (
      a.nested === b.nested &&
      a.elements.length === b.elements.length &&
      a.elements.every((element, index) => element === b.elements[index])
    );
  }
  if (a.kind === MatrixCellKind.LAYERED && b.kind === MatrixCellKind.LAYERED) {
    return MATRIX_LAYER_KINDS.every(
      (layer) =>
        getMatrixLayerValue(a, layer) === getMatrixLayerValue(b, layer),
    );
  }
  return false;
}

export const MATRIX_MIN_PERCEPTUAL_DISTANCE = 2;

const CROSS_KIND_DISTANCE = 99;

function scaledLayerDistance(
  steps: number,
  layer: MatrixLayerKind,
  activeLayers: readonly MatrixLayerKind[],
): number {
  if (steps === 0) {
    return 0;
  }
  return activeLayers.includes(layer) ? Math.max(2, steps) : steps;
}

function compositionDistance(
  a: MatrixCompositionCell,
  b: MatrixCompositionCell,
): number {
  const missing = a.elements.filter(
    (element) => !b.elements.includes(element),
  ).length;
  const extra = b.elements.filter(
    (element) => !a.elements.includes(element),
  ).length;
  const setDistance = 2 * (missing + extra);
  if (setDistance > 0) {
    return setDistance;
  }
  const sameOrder = a.elements.every(
    (element, index) => element === b.elements[index],
  );
  return sameOrder ? 0 : 2;
}

export function matrixPerceptualDistance(
  a: MatrixCellSpec,
  b: MatrixCellSpec,
  activeLayers: readonly MatrixLayerKind[] = [],
): number {
  if (a.kind !== b.kind) {
    return CROSS_KIND_DISTANCE;
  }
  if (
    a.kind === MatrixCellKind.COMPOSITION &&
    b.kind === MatrixCellKind.COMPOSITION
  ) {
    return compositionDistance(a, b);
  }
  if (a.kind !== MatrixCellKind.LAYERED || b.kind !== MatrixCellKind.LAYERED) {
    return CROSS_KIND_DISTANCE;
  }
  let distance = 0;
  if (a.symbol !== b.symbol) {
    distance += 2;
  }
  if (a.container !== b.container) {
    distance += 2;
  }
  if (a.decor !== b.decor) {
    distance += 2;
  }
  if (a.count !== b.count) {
    distance += 2;
  }
  if (a.strokeAType !== b.strokeAType) {
    distance += 2;
  }
  if (a.strokeBType !== b.strokeBType) {
    distance += 2;
  }
  if (a.strokeACount !== b.strokeACount) {
    distance += 2;
  }
  if (a.strokeBCount !== b.strokeBCount) {
    distance += 2;
  }
  distance += scaledLayerDistance(
    Math.abs(
      MATRIX_SIZE_SCALE.indexOf(a.size) - MATRIX_SIZE_SCALE.indexOf(b.size),
    ),
    MatrixLayerKind.SIZE,
    activeLayers,
  );
  distance += scaledLayerDistance(
    Math.abs(
      MATRIX_FILL_SCALE.indexOf(a.fill) - MATRIX_FILL_SCALE.indexOf(b.fill),
    ),
    MatrixLayerKind.FILL,
    activeLayers,
  );
  distance += scaledLayerDistance(
    Math.abs(
      MATRIX_ROTATION_SCALE.indexOf(a.rotation) -
        MATRIX_ROTATION_SCALE.indexOf(b.rotation),
    ),
    MatrixLayerKind.ROTATION,
    activeLayers,
  );
  return distance;
}
