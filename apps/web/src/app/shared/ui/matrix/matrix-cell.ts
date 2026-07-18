import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import {
  MatrixCellKind,
  MatrixCellSpec,
  MatrixContainer,
  MatrixDecor,
  MatrixElementId,
  MatrixFill,
  MatrixLayeredCell,
  MatrixRegister,
  MatrixSize,
  MatrixStrokeCount,
  MatrixStrokeType,
  MatrixSymbol,
} from '@psychotech/shared';

interface GlyphSlot {
  cx: number;
  cy: number;
  radius: number;
}

interface RenderedGlyph {
  cx: number;
  cy: number;
  radius: number;
  points: string;
  transform: string | null;
}

interface RenderedPath {
  d: string;
  filled: boolean;
  transform: string | null;
}

const GLYPH_BASE_RADIUS = 20;

const SIZE_SCALES: Record<MatrixSize, number> = {
  [MatrixSize.SMALL]: 0.6,
  [MatrixSize.MEDIUM]: 0.82,
  [MatrixSize.LARGE]: 1.08,
};

const SLOT_LAYOUTS: Record<number, GlyphSlot[]> = {
  1: [{ cx: 50, cy: 50, radius: 1 }],
  2: [
    { cx: 32, cy: 50, radius: 0.62 },
    { cx: 68, cy: 50, radius: 0.62 },
  ],
  3: [
    { cx: 50, cy: 31, radius: 0.58 },
    { cx: 32, cy: 67, radius: 0.58 },
    { cx: 68, cy: 67, radius: 0.58 },
  ],
  4: [
    { cx: 32, cy: 32, radius: 0.56 },
    { cx: 68, cy: 32, radius: 0.56 },
    { cx: 32, cy: 68, radius: 0.56 },
    { cx: 68, cy: 68, radius: 0.56 },
  ],
};

const STROKE_POSITIONS: Record<MatrixStrokeCount, number[]> = {
  1: [50],
  2: [38, 62],
  3: [28, 50, 72],
};

const ELEMENT_PATHS: Record<MatrixElementId, { d: string; filled: boolean }> = {
  [MatrixElementId.RING]: {
    d: 'M 14 50 A 36 36 0 1 0 86 50 A 36 36 0 1 0 14 50',
    filled: false,
  },
  [MatrixElementId.FRAME]: { d: 'M 18 18 H 82 V 82 H 18 Z', filled: false },
  [MatrixElementId.LOZENGE]: {
    d: 'M 50 10 L 90 50 L 50 90 L 10 50 Z',
    filled: false,
  },
  [MatrixElementId.DELTA]: { d: 'M 50 14 L 86 78 L 14 78 Z', filled: false },
  [MatrixElementId.SALTIRE]: {
    d: 'M 26 26 L 74 74 M 74 26 L 26 74',
    filled: false,
  },
  [MatrixElementId.UPRIGHT_CROSS]: {
    d: 'M 50 22 V 78 M 22 50 H 78',
    filled: false,
  },
  [MatrixElementId.PELLET]: {
    d: 'M 42 50 A 8 8 0 1 0 58 50 A 8 8 0 1 0 42 50',
    filled: true,
  },
  [MatrixElementId.ARC_UP]: { d: 'M 22 62 Q 50 22 78 62', filled: false },
  [MatrixElementId.ARC_DOWN]: { d: 'M 22 38 Q 50 78 78 38', filled: false },
  [MatrixElementId.BAR_HORIZONTAL]: { d: 'M 18 50 H 82', filled: false },
  [MatrixElementId.BAR_VERTICAL]: { d: 'M 50 18 V 82', filled: false },
  [MatrixElementId.BAR_OBLIQUE]: { d: 'M 26 74 L 74 26', filled: false },
  [MatrixElementId.BAR_OBLIQUE_BACK]: {
    d: 'M 26 26 L 74 74',
    filled: false,
  },
};

const NESTED_SCALES = [1, 0.78, 0.58, 0.4, 0.26];

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function polygonPoints(
  offsets: readonly (readonly [number, number])[],
  cx: number,
  cy: number,
): string {
  return offsets.map(([x, y]) => `${round(cx + x)},${round(cy + y)}`).join(' ');
}

function plusOffsets(radius: number): (readonly [number, number])[] {
  const arm = radius * 0.4;
  return [
    [-arm, -radius],
    [arm, -radius],
    [arm, -arm],
    [radius, -arm],
    [radius, arm],
    [arm, arm],
    [arm, radius],
    [-arm, radius],
    [-arm, arm],
    [-radius, arm],
    [-radius, -arm],
    [-arm, -arm],
  ];
}

function starOffsets(radius: number): (readonly [number, number])[] {
  const inner = radius * 0.42;
  const offsets: (readonly [number, number])[] = [];
  for (let index = 0; index < 8; index += 1) {
    const angle = ((index * 45 - 90) * Math.PI) / 180;
    const distance = index % 2 === 0 ? radius : inner;
    offsets.push([Math.cos(angle) * distance, Math.sin(angle) * distance]);
  }
  return offsets;
}

function diamondOffsets(radius: number): (readonly [number, number])[] {
  return [
    [0, -radius],
    [radius, 0],
    [0, radius],
    [-radius, 0],
  ];
}

function triangleOffsets(radius: number): (readonly [number, number])[] {
  return [
    [0, -radius],
    [radius * 0.93, radius * 0.72],
    [-radius * 0.93, radius * 0.72],
  ];
}

function symbolOffsets(
  symbol: MatrixSymbol,
  radius: number,
): (readonly [number, number])[] {
  switch (symbol) {
    case MatrixSymbol.PLUS:
    case MatrixSymbol.CROSS:
      return plusOffsets(radius);
    case MatrixSymbol.STAR:
      return starOffsets(radius);
    case MatrixSymbol.DIAMOND:
      return diamondOffsets(radius);
    case MatrixSymbol.TRIANGLE:
      return triangleOffsets(radius);
    case MatrixSymbol.DOT:
      return [];
  }
}

function strokeFamilyPaths(
  type: MatrixStrokeType,
  count: MatrixStrokeCount,
): RenderedPath[] {
  const positions = STROKE_POSITIONS[count];
  switch (type) {
    case MatrixStrokeType.HORIZONTAL:
      return positions.map((y) => ({
        d: `M 16 ${y} H 84`,
        filled: false,
        transform: null,
      }));
    case MatrixStrokeType.VERTICAL:
      return positions.map((x) => ({
        d: `M ${x} 16 V 84`,
        filled: false,
        transform: null,
      }));
    case MatrixStrokeType.OBLIQUE:
      return positions.map((x) => ({
        d: `M ${x} 18 V 82`,
        filled: false,
        transform: 'rotate(45 50 50)',
      }));
    case MatrixStrokeType.ARC:
      return positions.map((y) => ({
        d: `M 20 ${y + 10} Q 50 ${y - 18} 80 ${y + 10}`,
        filled: false,
        transform: null,
      }));
  }
}

let nextHatchId = 0;

@Component({
  selector: 'ui-matrix-cell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <defs>
        <pattern
          [attr.id]="hatchId"
          patternUnits="userSpaceOnUse"
          width="6"
          height="6"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="6" stroke="currentColor" stroke-width="1.7" />
        </pattern>
      </defs>

      @if (layered(); as cell) {
        @if (cell.register === registers.TRAITS) {
          @for (path of strokePaths(); track $index) {
            <path
              [attr.d]="path.d"
              [attr.transform]="path.transform"
              fill="none"
              class="stroke-path"
            />
          }
        } @else {
          @switch (cell.decor) {
            @case (decors.STRIPES) {
              <g class="decor">
                <line x1="0" y1="50" x2="50" y2="0" />
                <line x1="0" y1="100" x2="100" y2="0" />
                <line x1="50" y1="100" x2="100" y2="50" />
              </g>
            }
            @case (decors.CORNER_DOTS) {
              <g>
                <circle cx="9" cy="9" r="3.4" fill="currentColor" />
                <circle cx="91" cy="9" r="3.4" fill="currentColor" />
                <circle cx="9" cy="91" r="3.4" fill="currentColor" />
                <circle cx="91" cy="91" r="3.4" fill="currentColor" />
              </g>
            }
            @case (decors.DIAMOND_DOTS) {
              <g>
                <circle cx="50" cy="7" r="3.4" fill="currentColor" />
                <circle cx="93" cy="50" r="3.4" fill="currentColor" />
                <circle cx="50" cy="93" r="3.4" fill="currentColor" />
                <circle cx="7" cy="50" r="3.4" fill="currentColor" />
              </g>
            }
          }

          @switch (cell.container) {
            @case (containers.CIRCLE) {
              <circle cx="50" cy="50" r="42" class="stroke-only" />
            }
            @case (containers.SQUARE) {
              <rect x="9" y="9" width="82" height="82" rx="2" class="stroke-only" />
            }
            @case (containers.DOUBLE_SQUARE) {
              <rect x="6" y="6" width="88" height="88" rx="2" class="stroke-only" />
              <rect x="14" y="14" width="72" height="72" rx="1.5" class="stroke-only" />
            }
          }

          @for (glyph of glyphs(); track $index) {
            @if (cell.symbol === symbols.DOT) {
              <circle
                [attr.cx]="glyph.cx"
                [attr.cy]="glyph.cy"
                [attr.r]="glyph.radius * 0.78"
                [attr.fill]="fillValue()"
                class="glyph"
              />
            } @else {
              <polygon
                [attr.points]="glyph.points"
                [attr.transform]="glyph.transform"
                [attr.fill]="fillValue()"
                class="glyph"
              />
            }
          }
        }
      } @else {
        @for (piece of compositionPieces(); track $index) {
          <path
            [attr.d]="piece.d"
            [attr.transform]="piece.transform"
            [attr.fill]="piece.filled ? 'currentColor' : 'none'"
            class="stroke-path"
          />
        }
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      color: var(--ink);
    }
    svg {
      display: block;
    }
    .decor line {
      stroke: currentColor;
      stroke-width: 1.4;
      opacity: 0.38;
    }
    .stroke-only {
      fill: none;
      stroke: currentColor;
      stroke-width: 2.4;
    }
    .glyph {
      stroke: currentColor;
      stroke-width: 2.6;
      stroke-linejoin: round;
    }
    .stroke-path {
      stroke: currentColor;
      stroke-width: 3;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
  `,
})
export class MatrixCell {
  readonly cell = input.required<MatrixCellSpec>();
  readonly size = input(88);

  protected readonly symbols = MatrixSymbol;
  protected readonly containers = MatrixContainer;
  protected readonly decors = MatrixDecor;
  protected readonly registers = MatrixRegister;
  protected readonly hatchId = `mx-hatch-${(nextHatchId += 1)}`;

  protected readonly layered = computed<MatrixLayeredCell | null>(() => {
    const cell = this.cell();
    return cell.kind === MatrixCellKind.LAYERED ? cell : null;
  });

  protected readonly fillValue = computed(() => {
    const cell = this.layered();
    if (!cell) {
      return 'none';
    }
    switch (cell.fill) {
      case MatrixFill.OUTLINE:
        return 'none';
      case MatrixFill.SOLID:
        return 'currentColor';
      case MatrixFill.HATCHED:
        return `url(#${this.hatchId})`;
    }
  });

  protected readonly glyphs = computed<RenderedGlyph[]>(() => {
    const cell = this.layered();
    if (!cell || cell.register !== MatrixRegister.FIGURES) {
      return [];
    }
    const slots = SLOT_LAYOUTS[cell.count];
    const baseRadius = GLYPH_BASE_RADIUS * SIZE_SCALES[cell.size];
    return slots.map((slot) => {
      const radius = round(baseRadius * slot.radius);
      const rotation =
        cell.rotation + (cell.symbol === MatrixSymbol.CROSS ? 45 : 0);
      return {
        cx: slot.cx,
        cy: slot.cy,
        radius,
        points: polygonPoints(
          symbolOffsets(cell.symbol, radius),
          slot.cx,
          slot.cy,
        ),
        transform:
          rotation === 0 ? null : `rotate(${rotation} ${slot.cx} ${slot.cy})`,
      };
    });
  });

  protected readonly strokePaths = computed<RenderedPath[]>(() => {
    const cell = this.layered();
    if (!cell || cell.register !== MatrixRegister.TRAITS) {
      return [];
    }
    return [
      ...strokeFamilyPaths(cell.strokeAType, cell.strokeACount),
      ...strokeFamilyPaths(cell.strokeBType, cell.strokeBCount),
    ];
  });

  protected readonly compositionPieces = computed<RenderedPath[]>(() => {
    const cell = this.cell();
    if (cell.kind !== MatrixCellKind.COMPOSITION) {
      return [];
    }
    return cell.elements.map((element, index) => {
      const geometry = ELEMENT_PATHS[element];
      const scale = cell.nested
        ? NESTED_SCALES[Math.min(index, NESTED_SCALES.length - 1)]
        : 1;
      return {
        d: geometry.d,
        filled: geometry.filled,
        transform:
          scale === 1
            ? null
            : `translate(50 50) scale(${scale}) translate(-50 -50)`,
      };
    });
  });
}
