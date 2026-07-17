export enum MatrixStructure {
  CROSSED = 'CROSSED',
  DISTRIBUTION = 'DISTRIBUTION',
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

export enum MatrixLayerKind {
  SYMBOL = 'SYMBOL',
  CONTAINER = 'CONTAINER',
  DECOR = 'DECOR',
  SIZE = 'SIZE',
  FILL = 'FILL',
  ROTATION = 'ROTATION',
  COUNT = 'COUNT',
}

export type MatrixLayerValue =
  | MatrixSymbol
  | MatrixContainer
  | MatrixDecor
  | MatrixSize
  | MatrixFill
  | MatrixRotation
  | MatrixCount;

export interface MatrixCellSpec {
  symbol: MatrixSymbol;
  container: MatrixContainer;
  decor: MatrixDecor;
  size: MatrixSize;
  fill: MatrixFill;
  rotation: MatrixRotation;
  count: MatrixCount;
}

export const MATRIX_LAYER_KINDS: readonly MatrixLayerKind[] = [
  MatrixLayerKind.SYMBOL,
  MatrixLayerKind.CONTAINER,
  MatrixLayerKind.DECOR,
  MatrixLayerKind.SIZE,
  MatrixLayerKind.FILL,
  MatrixLayerKind.ROTATION,
  MatrixLayerKind.COUNT,
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

export const MATRIX_ROTATION_SAFE_SYMBOL = MatrixSymbol.TRIANGLE;

export function createDefaultMatrixCell(symbol: MatrixSymbol): MatrixCellSpec {
  return {
    symbol,
    container: MatrixContainer.NONE,
    decor: MatrixDecor.NONE,
    size: MatrixSize.MEDIUM,
    fill: MatrixFill.SOLID,
    rotation: 0,
    count: 1,
  };
}

export function getMatrixLayerValue(
  cell: MatrixCellSpec,
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
  }
}

export function withMatrixLayerValue(
  cell: MatrixCellSpec,
  layer: MatrixLayerKind,
  value: MatrixLayerValue,
): MatrixCellSpec {
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
    default:
      return null;
  }
}

export function matrixCellsEqual(a: MatrixCellSpec, b: MatrixCellSpec): boolean {
  return MATRIX_LAYER_KINDS.every(
    (layer) => getMatrixLayerValue(a, layer) === getMatrixLayerValue(b, layer),
  );
}

export const MATRIX_MIN_PERCEPTUAL_DISTANCE = 2;

export function matrixPerceptualDistance(
  a: MatrixCellSpec,
  b: MatrixCellSpec,
): number {
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
  distance += Math.abs(
    MATRIX_SIZE_SCALE.indexOf(a.size) - MATRIX_SIZE_SCALE.indexOf(b.size),
  );
  distance += Math.abs(
    MATRIX_FILL_SCALE.indexOf(a.fill) - MATRIX_FILL_SCALE.indexOf(b.fill),
  );
  distance += Math.abs(
    MATRIX_ROTATION_SCALE.indexOf(a.rotation) -
      MATRIX_ROTATION_SCALE.indexOf(b.rotation),
  );
  return distance;
}
