import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { TriangleSlot } from '@psychotech/shared';

interface TriangleTileValueView {
  slot: string;
  value: number | null;
  accent: boolean;
  left: string;
  top: string;
}

const SLOT_POSITIONS: Record<string, readonly [number, number]> = {
  top: [66, 12],
  left: [12, 144],
  right: [120, 144],
  center: [66, 94],
};

const SLOT_KEYS: Record<TriangleSlot, string> = {
  [TriangleSlot.TOP]: 'top',
  [TriangleSlot.LEFT]: 'left',
  [TriangleSlot.RIGHT]: 'right',
  [TriangleSlot.CENTER]: 'center',
};

function toPercent(value: number, extent: number): string {
  return `${((value / extent) * 100).toFixed(1)}%`;
}

@Component({
  selector: 'ui-triangle-tile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[style.--triangle-tile-default]': 'size() + "px"' },
  template: `
    <span class="tile">
      <svg viewBox="0 0 132 156" preserveAspectRatio="none" aria-hidden="true">
        <path
          class="frame"
          d="M61 38.6 L15 117.4 Q10 126 20 126 L112 126 Q122 126 117 117.4 L71 38.6 Q66 30 61 38.6 Z"
        />
      </svg>
      @for (view of views(); track view.slot) {
        <span
          class="value"
          [class.value--slot]="view.accent"
          [class.value--unknown]="view.value === null"
          [attr.data-slot]="view.slot"
          [style.left]="view.left"
          [style.top]="view.top"
          >{{ view.value ?? '?' }}</span
        >
      }
    </span>
  `,
  styles: `
    :host {
      display: inline-flex;
      color: var(--ink);
    }
    .tile {
      position: relative;
      display: inline-block;
      width: var(--triangle-tile-width, var(--triangle-tile-default));
      aspect-ratio: 132 / 156;
    }
    svg {
      display: block;
      width: 100%;
      height: 100%;
    }
    .frame {
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linejoin: round;
      vector-effect: non-scaling-stroke;
    }
    .value {
      position: absolute;
      transform: translate(-50%, -50%);
      font: 600 var(--triangle-value-fs, 15px) / 1 var(--font-mono);
      color: currentColor;
    }
    .value--unknown {
      color: var(--triangle-accent, var(--axis-logic));
    }
    .value--slot {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 27px;
      border: 2px solid var(--axis-logic-pastel-bd);
      border-radius: var(--radius-badge);
      background: var(--card);
      color: var(--ink);
    }
    .value--slot.value--unknown {
      border-style: dashed;
      background: #f8fbff;
      color: var(--triangle-accent, var(--axis-logic));
    }
    @media (max-width: 767px) {
      .value--slot {
        width: 30px;
        height: 24px;
      }
    }
  `,
})
export class TriangleTile {
  readonly top = input.required<number | null>();
  readonly left = input.required<number | null>();
  readonly right = input.required<number | null>();
  readonly center = input.required<number | null>();
  readonly size = input(100);
  readonly accentSlot = input<TriangleSlot | null>(null);

  protected readonly views = computed<TriangleTileValueView[]>(() => {
    const accent = this.accentSlot();
    const accentKey = accent === null ? null : SLOT_KEYS[accent];
    const values: Record<string, number | null> = {
      top: this.top(),
      left: this.left(),
      right: this.right(),
      center: this.center(),
    };
    return Object.entries(SLOT_POSITIONS).map(([slot, [x, y]]) => ({
      slot,
      value: values[slot],
      accent: slot === accentKey,
      left: toPercent(x, 132),
      top: toPercent(y, 156),
    }));
  });
}
