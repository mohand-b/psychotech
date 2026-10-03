import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { COMPACT_LAYOUT_MEDIA } from '../../util/compact-layout';
import {
  COMPACT_SIGNAL_GRID,
  SignalCell,
  SignalGridLayout,
  WIDE_SIGNAL_GRID,
  generateSignalPattern,
  computeNextSignalCells,
} from '../../util/signal-grid-pattern';

const CELL_RADIUS = 2;
const PATTERN_INTERVAL_MS = 1700;
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const OFF_CELLS_PATTERN_ID_PREFIX = 'landing-signal-grid-cells';

type SignalFieldKey = 'wide' | 'compact';

interface SignalField {
  readonly key: SignalFieldKey;
  readonly layout: SignalGridLayout;
  readonly cellSize: number;
  readonly cellPitch: number;
  readonly width: number;
  readonly height: number;
  readonly offCellsPatternId: string;
  readonly offCellsFill: string;
}

interface SignalCellGeometry {
  readonly cellSize: number;
  readonly cellGap: number;
}

interface PlacedSignalCell extends SignalCell {
  left: number;
  top: number;
}

function buildSignalField(
  key: SignalFieldKey,
  layout: SignalGridLayout,
  { cellSize, cellGap }: SignalCellGeometry,
): SignalField {
  const cellPitch = cellSize + cellGap;
  const offCellsPatternId = `${OFF_CELLS_PATTERN_ID_PREFIX}-${key}`;
  return {
    key,
    layout,
    cellSize,
    cellPitch,
    width: layout.columns * cellPitch - cellGap,
    height: layout.rows * cellPitch - cellGap,
    offCellsPatternId,
    offCellsFill: `url(#${offCellsPatternId})`,
  };
}

const WIDE_FIELD = buildSignalField('wide', WIDE_SIGNAL_GRID, {
  cellSize: 10,
  cellGap: 16,
});
const COMPACT_FIELD = buildSignalField('compact', COMPACT_SIGNAL_GRID, {
  cellSize: 8,
  cellGap: 12,
});

@Component({
  selector: 'app-landing-signal-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  templateUrl: './landing-signal-grid.html',
  styleUrl: './landing-signal-grid.css',
})
export class LandingSignalGrid {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly state = signal<readonly SignalCell[]>([]);
  private readonly compact = signal(false);

  protected readonly fields = [WIDE_FIELD, COMPACT_FIELD];
  protected readonly cellRadius = CELL_RADIUS;
  protected readonly activeField = computed(() =>
    this.compact() ? COMPACT_FIELD : WIDE_FIELD,
  );
  protected readonly cells = computed<PlacedSignalCell[]>(() => {
    const { layout, cellPitch } = this.activeField();
    return this.state().map((cell) => ({
      ...cell,
      left: (cell.index % layout.columns) * cellPitch,
      top: Math.floor(cell.index / layout.columns) * cellPitch,
    }));
  });

  constructor() {
    afterNextRender(() => {
      const view = this.document.defaultView;
      if (!view) {
        return;
      }
      const compactLayout = view.matchMedia(COMPACT_LAYOUT_MEDIA);
      const applyLayout = () => {
        this.compact.set(compactLayout.matches);
        this.state.set([]);
        this.advanceSignalPattern();
      };
      compactLayout.addEventListener('change', applyLayout);
      this.destroyRef.onDestroy(() =>
        compactLayout.removeEventListener('change', applyLayout),
      );
      applyLayout();
      if (view.matchMedia(REDUCED_MOTION_QUERY).matches) {
        return;
      }
      const timer = view.setInterval(() => {
        if (this.document.visibilityState !== 'hidden') {
          this.advanceSignalPattern();
        }
      }, PATTERN_INTERVAL_MS);
      this.destroyRef.onDestroy(() => view.clearInterval(timer));
    });
  }

  private advanceSignalPattern(): void {
    const { layout } = this.activeField();
    this.state.update((previous) =>
      computeNextSignalCells(
        previous,
        generateSignalPattern(Math.random, layout),
      ),
    );
  }
}
