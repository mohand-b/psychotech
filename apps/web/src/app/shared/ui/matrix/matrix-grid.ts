import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { MatrixCellSpec } from '@psychotech/shared';
import { MatrixCell } from './matrix-cell';

@Component({
  selector: 'ui-matrix-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatrixCell],
  template: `
    <div class="grid">
      @for (cell of visibleCells(); track $index) {
        <div class="slot">
          <ui-matrix-cell [cell]="cell" [size]="cellSize()" />
        </div>
      }
      @if (showAnswer()) {
        <div class="slot slot--answer">
          <ui-matrix-cell [cell]="cells()[8]" [size]="cellSize()" />
        </div>
      } @else {
        <div class="slot slot--mystery" [style.width.px]="cellSize()" [style.height.px]="cellSize()">
          <span class="t-mono">?</span>
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, auto);
      background: var(--card);
      border: 1.5px solid var(--ink);
      border-radius: 4px;
      overflow: hidden;
    }
    .slot {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 6px;
      border-right: 1px solid var(--border-hover);
      border-bottom: 1px solid var(--border-hover);
    }
    .slot:nth-child(3n) {
      border-right: none;
    }
    .slot:nth-child(n + 7) {
      border-bottom: none;
    }
    .slot--mystery {
      box-sizing: content-box;
      color: var(--label);
      font-size: 34px;
    }
    .slot--answer {
      background: var(--surface-muted);
    }
  `,
})
export class MatrixGrid {
  readonly cells = input.required<readonly MatrixCellSpec[]>();
  readonly showAnswer = input(false);
  readonly cellSize = input(88);

  protected readonly visibleCells = computed(() => this.cells().slice(0, 8));
}
