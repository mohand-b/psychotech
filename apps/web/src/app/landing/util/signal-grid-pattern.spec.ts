import {
  COMPACT_SIGNAL_GRID,
  SignalCell,
  SignalGridLayout,
  WIDE_SIGNAL_GRID,
  generateSignalPattern,
  nextSignalCells,
} from './signal-grid-pattern';

function sequence(values: number[]): () => number {
  let cursor = 0;
  return () => values[cursor++ % values.length];
}

function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function cellCount(layout: SignalGridLayout): number {
  return layout.rows * layout.columns;
}

describe('generateSignalPattern', () => {
  it('draws seven segments of three to five cells on the wide grid, the first, fourth and seventh vivid, then twenty-six scattered lit cells', () => {
    const horizontalAtOrigin = [0, 0, 0, 0.9];
    const scatteredOnLastCell = 0.9999;
    const pattern = generateSignalPattern(
      sequence([
        ...Array.from({ length: 7 }, () => horizontalAtOrigin).flat(),
        ...Array.from({ length: 26 }, () => scatteredOnLastCell),
      ]),
      WIDE_SIGNAL_GRID,
    );
    expect(pattern.get(0)).toBe('vivid');
    expect(pattern.get(1)).toBe('vivid');
    expect(pattern.get(2)).toBe('vivid');
    expect(pattern.has(3)).toBe(false);
    expect(pattern.get(cellCount(WIDE_SIGNAL_GRID) - 1)).toBe('lit');
  });

  it('draws five segments of three to four cells on the compact grid, the first and fourth vivid, then fourteen scattered lit cells', () => {
    const longestHorizontalOnRow = (row: number) => [
      (row + 0.5) / COMPACT_SIGNAL_GRID.rows,
      0,
      0.9999,
      0.9,
    ];
    const scatteredOnLastCell = 0.9999;
    const pattern = generateSignalPattern(
      sequence([
        ...Array.from({ length: 5 }, (_, row) =>
          longestHorizontalOnRow(row),
        ).flat(),
        ...Array.from({ length: 14 }, () => scatteredOnLastCell),
      ]),
      COMPACT_SIGNAL_GRID,
    );
    const rowStart = (row: number) => row * COMPACT_SIGNAL_GRID.columns;
    expect([0, 1, 2, 3, 4].map((row) => pattern.get(rowStart(row)))).toEqual([
      'vivid',
      'lit',
      'lit',
      'vivid',
      'lit',
    ]);
    expect(pattern.get(rowStart(0) + 3)).toBe('vivid');
    expect(pattern.has(rowStart(0) + 4)).toBe(false);
    expect(pattern.get(cellCount(COMPACT_SIGNAL_GRID) - 1)).toBe('lit');
  });

  it('runs vertical segments down the column and clamps them to the last row', () => {
    const lastRowVertical = [0.9999, 0, 0.9999, 0.1];
    const pattern = generateSignalPattern(
      sequence([...lastRowVertical, 0, 0, 0, 0.9]),
      WIDE_SIGNAL_GRID,
    );
    const lastRowStart = (WIDE_SIGNAL_GRID.rows - 1) * WIDE_SIGNAL_GRID.columns;
    expect(pattern.get(lastRowStart)).toBe('vivid');
    expect(pattern.has(lastRowStart + 1)).toBe(false);
  });

  it.each([
    ['wide', WIDE_SIGNAL_GRID],
    ['compact', COMPACT_SIGNAL_GRID],
  ])('keeps every cell inside the %s grid', (_, layout) => {
    const random = seeded(42);
    for (let draw = 0; draw < 200; draw++) {
      for (const index of generateSignalPattern(random, layout).keys()) {
        expect(index).toBeGreaterThanOrEqual(0);
        expect(index).toBeLessThan(cellCount(layout));
      }
    }
  });
});

describe('nextSignalCells', () => {
  it('lights the new pattern, fades the cells it drops and forgets cells already faded, ordered by index', () => {
    const previous: SignalCell[] = [
      { index: 4, state: 'lit' },
      { index: 9, state: 'fading' },
      { index: 12, state: 'vivid' },
    ];
    const next = nextSignalCells(
      previous,
      new Map([
        [12, 'lit'],
        [2, 'vivid'],
      ]),
    );
    expect(next).toEqual([
      { index: 2, state: 'vivid' },
      { index: 4, state: 'fading' },
      { index: 12, state: 'lit' },
    ]);
  });
});
