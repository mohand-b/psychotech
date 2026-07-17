import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import {
  MatrixCellSpec,
  MatrixContainer,
  MatrixDecor,
  MatrixFill,
  MatrixSize,
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
  transform: string;
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

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function polygonPoints(
  offsets: readonly (readonly [number, number])[],
  cx: number,
  cy: number,
): string {
  return offsets
    .map(([x, y]) => `${round(cx + x)},${round(cy + y)}`)
    .join(' ');
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

      @switch (cell().decor) {
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

      @switch (cell().container) {
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
        @if (cell().symbol === symbols.DOT) {
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
  `,
})
export class MatrixCell {
  readonly cell = input.required<MatrixCellSpec>();
  readonly size = input(88);

  protected readonly symbols = MatrixSymbol;
  protected readonly containers = MatrixContainer;
  protected readonly decors = MatrixDecor;
  protected readonly hatchId = `mx-hatch-${(nextHatchId += 1)}`;

  protected readonly fillValue = computed(() => {
    switch (this.cell().fill) {
      case MatrixFill.OUTLINE:
        return 'none';
      case MatrixFill.SOLID:
        return 'currentColor';
      case MatrixFill.HATCHED:
        return `url(#${this.hatchId})`;
    }
  });

  protected readonly glyphs = computed<RenderedGlyph[]>(() => {
    const cell = this.cell();
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
          rotation === 0
            ? ''
            : `rotate(${rotation} ${slot.cx} ${slot.cy})`,
      };
    });
  });
}
