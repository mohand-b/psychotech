import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

const DIGITS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
const MAX_VALUE = 99;

@Component({
  selector: 'ui-triangle-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pad">
      <div class="pad__entry">
        <input
          class="pad__field t-mono"
          inputmode="numeric"
          autocomplete="off"
          aria-label="Votre réponse"
          [value]="value() ?? ''"
          (input)="onFieldInput($any($event.target).value)"
        />
        <button
          type="button"
          class="pad__clear"
          (click)="valueChange.emit(null)"
        >
          Effacer
        </button>
      </div>
      <div class="pad__keys">
        @for (digit of digits; track digit) {
          <button
            type="button"
            class="pad__key t-mono"
            (click)="onDigit(digit)"
          >
            {{ digit }}
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
    .pad__entry {
      display: flex;
      gap: 8px;
    }
    .pad__field {
      width: 96px;
      height: 44px;
      padding: 0 12px;
      font-size: 17px;
      text-align: center;
      border: 1.5px solid var(--border-hover);
      border-radius: 10px;
      background: var(--card);
      color: var(--ink);
    }
    .pad__field:focus {
      outline: none;
      border-color: var(--brand);
    }
    .pad__clear {
      min-width: 44px;
      height: 44px;
      padding: 0 14px;
      background: var(--card);
      color: var(--text-secondary);
      font: 600 13px/16px var(--font-ui);
      border: 1.5px solid var(--border-hover);
      border-radius: 10px;
      cursor: pointer;
    }
    .pad__clear:hover {
      border-color: var(--brand);
      color: var(--brand-hover);
    }
    .pad__keys {
      display: grid;
      grid-template-columns: repeat(5, 44px);
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
export class TriangleInput {
  readonly value = input.required<number | null>();

  readonly valueChange = output<number | null>();

  protected readonly digits = DIGITS;

  protected onDigit(digit: number): void {
    const current = this.value();
    const next = current === null ? digit : current * 10 + digit;
    if (next > MAX_VALUE) {
      return;
    }
    this.valueChange.emit(next);
  }

  protected onFieldInput(raw: string): void {
    const digitsOnly = raw.replace(/\D/g, '').slice(0, 2);
    this.valueChange.emit(digitsOnly === '' ? null : Number(digitsOnly));
  }
}
