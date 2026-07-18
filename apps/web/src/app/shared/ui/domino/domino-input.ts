import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { DominoFace } from '@psychotech/shared';
import { DominoHalf } from './domino-sequence';

const FACES: readonly DominoFace[] = [0, 1, 2, 3, 4, 5, 6];

@Component({
  selector: 'ui-domino-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pad">
      <div class="pad__halves">
        <button
          type="button"
          class="pad__half"
          [class.pad__half--active]="activeHalf() === 'top'"
          (click)="pickHalf.emit('top')"
        >
          Haut : {{ top() ?? '—' }}
        </button>
        <button
          type="button"
          class="pad__half"
          [class.pad__half--active]="activeHalf() === 'bottom'"
          (click)="pickHalf.emit('bottom')"
        >
          Bas : {{ bottom() ?? '—' }}
        </button>
      </div>
      <div class="pad__keys">
        @for (face of faces; track face) {
          <button
            type="button"
            class="pad__key t-mono"
            (click)="pickFace.emit(face)"
          >
            {{ face }}
          </button>
        }
      </div>
    </div>
  `,
  styles: `
    .pad {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .pad__halves {
      display: flex;
      gap: 8px;
    }
    .pad__half {
      flex: 1;
      padding: 10px 12px;
      background: var(--card);
      color: var(--text-secondary);
      font: 600 13px/16px var(--font-ui);
      border: 1.5px solid var(--border-hover);
      border-radius: 8px;
      cursor: pointer;
    }
    .pad__half--active {
      border-color: var(--brand);
      background: var(--brand-pastel);
      color: var(--brand-hover);
    }
    .pad__keys {
      display: flex;
      gap: 8px;
    }
    .pad__key {
      width: 44px;
      height: 44px;
      background: var(--card);
      color: var(--ink);
      font-size: 17px;
      border: 1.5px solid var(--border-hover);
      border-radius: 10px;
      cursor: pointer;
    }
    .pad__key:hover {
      border-color: var(--brand);
      color: var(--brand-hover);
    }
  `,
})
export class DominoInput {
  readonly top = input.required<DominoFace | null>();
  readonly bottom = input.required<DominoFace | null>();
  readonly activeHalf = input.required<DominoHalf>();

  readonly pickFace = output<DominoFace>();
  readonly pickHalf = output<DominoHalf>();

  protected readonly faces = FACES;
}
