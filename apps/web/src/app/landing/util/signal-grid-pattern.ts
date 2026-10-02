export interface SignalGridLayout {
  readonly columns: number;
  readonly rows: number;
  readonly segmentCount: number;
  readonly segmentLengthSpread: number;
  readonly scatteredCellCount: number;
}

export const WIDE_SIGNAL_GRID: SignalGridLayout = {
  columns: 64,
  rows: 40,
  segmentCount: 7,
  segmentLengthSpread: 3,
  scatteredCellCount: 26,
};

export const COMPACT_SIGNAL_GRID: SignalGridLayout = {
  columns: 24,
  rows: 44,
  segmentCount: 5,
  segmentLengthSpread: 2,
  scatteredCellCount: 14,
};

const SEGMENT_MIN_LENGTH = 3;
const SEGMENT_COLUMN_MARGIN = 5;
const VERTICAL_SEGMENT_SHARE = 0.35;
const VIVID_SEGMENT_PERIOD = 3;

export type SignalLevel = 'lit' | 'vivid';
export type SignalCellState = SignalLevel | 'fading';
export type SignalPattern = ReadonlyMap<number, SignalLevel>;
export type RandomSource = () => number;

export interface SignalCell {
  index: number;
  state: SignalCellState;
}

function pick(random: RandomSource, count: number): number {
  return Math.floor(random() * count);
}

export function generateSignalPattern(
  random: RandomSource,
  layout: SignalGridLayout,
): SignalPattern {
  const pattern = new Map<number, SignalLevel>();
  for (let segment = 0; segment < layout.segmentCount; segment++) {
    const row = pick(random, layout.rows);
    const column = pick(random, layout.columns - SEGMENT_COLUMN_MARGIN);
    const length =
      SEGMENT_MIN_LENGTH + pick(random, layout.segmentLengthSpread);
    const horizontal = random() > VERTICAL_SEGMENT_SHARE;
    const level: SignalLevel =
      segment % VIVID_SEGMENT_PERIOD === 0 ? 'vivid' : 'lit';
    for (let step = 0; step < length; step++) {
      const cellRow = horizontal ? row : Math.min(layout.rows - 1, row + step);
      const cellColumn = horizontal ? column + step : column;
      pattern.set(cellRow * layout.columns + cellColumn, level);
    }
  }
  for (let scattered = 0; scattered < layout.scatteredCellCount; scattered++) {
    pattern.set(pick(random, layout.rows * layout.columns), 'lit');
  }
  return pattern;
}

export function nextSignalCells(
  previous: readonly SignalCell[],
  pattern: SignalPattern,
): SignalCell[] {
  const fading = previous
    .filter((cell) => cell.state !== 'fading' && !pattern.has(cell.index))
    .map((cell): SignalCell => ({ index: cell.index, state: 'fading' }));
  const lit = [...pattern].map(
    ([index, state]): SignalCell => ({ index, state }),
  );
  return [...lit, ...fading].sort((left, right) => left.index - right.index);
}
