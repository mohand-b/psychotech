import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

const DIGITS: readonly number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
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
      <span class="pad__chip">
        <span class="pad__chip-label">Valeur</span>
        <span
          class="pad__chip-value t-mono"
          [class.pad__chip-value--empty]="value() === null"
          >{{ value() ?? '?' }}</span
        >
      </span>
      <span class="pad__divider" aria-hidden="true"></span>
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
      <button
        type="button"
        class="pad__clear"
        title="Effacer la réponse"
        aria-label="Effacer la réponse"
        [disabled]="disabled()"
        (click)="valueChange.emit(null)"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path
            d="M20 5H9l-7 7 7 7h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z"
          ></path>
          <line x1="18" x2="12" y1="9" y2="15"></line>
          <line x1="12" x2="18" y1="9" y2="15"></line>
        </svg>
      </button>
    </div>
  `,
  styles: `
    .pad {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
    }
    .pad__chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 9px;
      background: var(--axis-logic-pastel);
      border: 2px solid var(--axis-logic);
    }
    .pad__chip-label {
      font: 600 11px/14px var(--font-ui);
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--axis-logic-text);
    }
    .pad__chip-value {
      font-size: 15px;
      font-weight: 600;
      min-width: 22px;
      text-align: center;
      color: var(--ink);
    }
    .pad__chip-value--empty {
      color: var(--text-disabled);
    }
    .pad__divider {
      width: 1px;
      height: 26px;
      background: var(--border);
    }
    .pad__keys {
      display: flex;
      gap: 5px;
    }
    .pad__key {
      width: 38px;
      height: 48px;
      border-radius: var(--radius-button);
      background: var(--card);
      border: 1px solid var(--border);
      font-size: 16px;
      font-weight: 600;
      color: var(--ink);
      cursor: pointer;
      transition:
        border-color 0.1s ease,
        background 0.1s ease;
    }
    .pad__key:hover {
      border-color: #9dc2f9;
      background: #f5f9ff;
    }
    .pad__key:focus-visible {
      outline: 2px solid var(--axis-logic);
      outline-offset: 2px;
    }
    .pad__clear {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 42px;
      height: 48px;
      border-radius: var(--radius-button);
      border: none;
      background: transparent;
      color: var(--label);
      cursor: pointer;
      transition:
        background 0.1s ease,
        color 0.1s ease;
    }
    .pad__clear:hover {
      background: var(--surface-muted);
      color: var(--ink);
    }
    @media (max-width: 767px) {
      .pad {
        display: grid;
        grid-template-columns: 1fr 48px;
        gap: 10px 8px;
      }
      .pad__chip {
        min-height: 44px;
        justify-content: center;
        padding: 8px 10px;
        border-radius: var(--radius-button);
      }
      .pad__chip-value {
        font-size: 16px;
      }
      .pad__divider {
        display: none;
      }
      .pad__keys {
        grid-column: 1 / -1;
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 4px;
      }
      .pad__key {
        width: auto;
        height: 48px;
        font-size: 17px;
      }
      .pad__clear {
        width: 48px;
        min-height: 44px;
        height: auto;
        border: 1px solid var(--border);
        background: var(--card);
      }
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
}
