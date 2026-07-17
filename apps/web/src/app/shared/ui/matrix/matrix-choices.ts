import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { MatrixCellSpec } from '@psychotech/shared';
import { MatrixCell } from './matrix-cell';

export interface MatrixChoiceAnnotation {
  label: string;
  correct: boolean;
}

@Component({
  selector: 'ui-matrix-choices',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatrixCell],
  template: `
    <div class="choices">
      @for (cell of cells(); track $index) {
        <button
          type="button"
          class="choice"
          [class.choice--selected]="$index === selectedIndex()"
          [class.choice--correct]="annotations()?.[$index]?.correct === true"
          (click)="pick.emit($index)"
        >
          <ui-matrix-cell [cell]="cell" [size]="cellSize()" />
          @if (annotations(); as notes) {
            <span
              class="choice__label"
              [class.choice__label--correct]="notes[$index].correct"
              >{{ notes[$index].label }}</span
            >
          }
        </button>
      }
    </div>
  `,
  styles: `
    .choices {
      display: grid;
      grid-template-columns: repeat(3, auto);
      gap: 12px;
    }
    .choice {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 8px;
      background: var(--card);
      border: 1.5px solid var(--border-hover);
      border-radius: 8px;
      cursor: pointer;
    }
    .choice:hover {
      border-color: var(--label);
    }
    .choice--selected {
      border-color: var(--brand);
      box-shadow: 0 0 0 2px var(--brand-pastel-bd);
    }
    .choice--correct {
      border-color: var(--success);
      box-shadow: 0 0 0 2px var(--axis-discrimination-pastel-bd);
    }
    .choice__label {
      max-width: 110px;
      font: 500 11px/14px var(--font-ui);
      color: var(--label);
      text-align: center;
    }
    .choice__label--correct {
      color: var(--success-text);
      font-weight: 700;
    }
  `,
})
export class MatrixChoices {
  readonly cells = input.required<readonly MatrixCellSpec[]>();
  readonly selectedIndex = input<number | null>(null);
  readonly annotations = input<readonly MatrixChoiceAnnotation[] | null>(null);
  readonly cellSize = input(78);

  readonly pick = output<number>();
}
