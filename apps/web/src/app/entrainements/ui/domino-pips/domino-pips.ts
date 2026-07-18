import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { DominoFace } from '@psychotech/shared';

const PIP_CELLS: Record<DominoFace, readonly number[]> = {
  0: [],
  1: [4],
  2: [2, 6],
  3: [2, 4, 6],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

const GRID_CELLS = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const;

@Component({
  selector: 'ui-domino-pips',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="pips" aria-hidden="true">
      @for (cell of cells; track cell) {
        <span class="pips__cell">
          @if (litCells().includes(cell)) {
            <span class="pips__dot"></span>
          }
        </span>
      }
    </span>
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    .pips {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 2px;
      width: 32px;
      height: 32px;
    }
    .pips__cell {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .pips__dot {
      width: 6px;
      height: 6px;
      border-radius: var(--radius-pill);
      background: var(--ink);
    }
    @media (max-width: 767px) {
      .pips {
        gap: 1px;
        width: 27px;
        height: 27px;
      }
      .pips__dot {
        width: 5px;
        height: 5px;
      }
    }
  `,
})
export class DominoPips {
  readonly value = input.required<DominoFace>();

  protected readonly cells = GRID_CELLS;
  protected readonly litCells = computed(() => PIP_CELLS[this.value()]);
}
