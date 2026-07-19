import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

const DIGITS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
const MAX_VALUE = 99;

export function appendTriangleInputDigit(
  current: number | null,
  digit: number,
): number | null {
  const next = current === null ? digit : current * 10 + digit;
  return next > MAX_VALUE ? current : next;
}

export function eraseTriangleInputDigit(
  current: number | null,
): number | null {
  if (current === null || current < 10) {
    return null;
  }
  return Math.floor(current / 10);
}

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
          [disabled]="disabled()"
          [value]="value() ?? ''"
          (input)="onFieldInput($any($event.target).value)"
        />
        <button
          type="button"
          class="pad__clear"
          [disabled]="disabled()"
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
            [disabled]="disabled()"
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
      align-items: var(--pad-align, stretch);
      gap: 10px;
    }
    .pad__entry {
      display: flex;
      gap: 8px;
    }
    .pad__field {
      width: 96px;
      height: var(--pad-key-height, 44px);
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
      border-color: var(--pad-accent, var(--brand));
    }
    .pad__clear {
      min-width: 44px;
      height: var(--pad-key-height, 44px);
      padding: 0 14px;
      background: var(--card);
      color: var(--text-secondary);
      font: 600 13px/16px var(--font-ui);
      border: 1.5px solid var(--border-hover);
      border-radius: 10px;
      cursor: pointer;
    }
    .pad__clear:hover {
      border-color: var(--pad-accent, var(--brand));
      color: var(--pad-accent-strong, var(--brand-hover));
    }
    .pad__keys {
      display: grid;
      grid-template-columns: repeat(5, var(--pad-key-width, 44px));
      gap: 8px;
    }
    .pad__key {
      width: var(--pad-key-width, 44px);
      height: var(--pad-key-height, 44px);
      background: var(--card);
      color: var(--ink);
      font-size: 17px;
      font-weight: 600;
      border: 1.5px solid var(--border-hover);
      border-radius: 10px;
      cursor: pointer;
    }
    .pad__key:hover {
      border-color: var(--pad-accent, var(--brand));
      color: var(--pad-accent-strong, var(--brand-hover));
    }
    .pad__key:focus-visible {
      outline: 2px solid var(--pad-accent, var(--brand));
      outline-offset: 2px;
    }
  `,
})
export class TriangleInput {
  readonly value = input.required<number | null>();
  readonly disabled = input(false);

  readonly valueChange = output<number | null>();

  protected readonly digits = DIGITS;

  protected onDigit(digit: number): void {
    const next = appendTriangleInputDigit(this.value(), digit);
    if (next !== this.value()) {
      this.valueChange.emit(next);
    }
  }

  protected onFieldInput(raw: string): void {
    const digitsOnly = raw.replace(/\D/g, '').slice(0, 2);
    this.valueChange.emit(digitsOnly === '' ? null : Number(digitsOnly));
  }
}
