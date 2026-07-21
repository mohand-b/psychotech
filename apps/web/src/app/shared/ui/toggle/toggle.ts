import {
  ChangeDetectionStrategy,
  Component,
  input,
  model,
} from '@angular/core';

@Component({
  selector: 'ui-toggle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      role="switch"
      class="ui-toggle"
      [class.ui-toggle--on]="checked()"
      [attr.aria-checked]="checked()"
      [attr.aria-label]="label()"
      [disabled]="disabled()"
      (click)="checked.set(!checked())"
    >
      <span class="ui-toggle__thumb"></span>
    </button>
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    .ui-toggle {
      display: inline-flex;
      align-items: center;
      flex-shrink: 0;
      width: var(--toggle-w, 40px);
      height: var(--toggle-h, 22px);
      padding: 2px;
      border: none;
      border-radius: calc(var(--toggle-h, 22px) / 2);
      background: var(--border-hover);
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .ui-toggle--on {
      background: var(--toggle-on, var(--brand));
    }
    .ui-toggle:disabled {
      background: var(--surface-muted);
      cursor: not-allowed;
    }
    .ui-toggle:focus-visible {
      outline: none;
      box-shadow: var(--shadow-focus);
    }
    .ui-toggle__thumb {
      width: calc(var(--toggle-h, 22px) - 4px);
      height: calc(var(--toggle-h, 22px) - 4px);
      border-radius: var(--radius-pill);
      background: var(--card);
      box-shadow: var(--shadow-card);
      transition: transform 0.15s ease;
    }
    .ui-toggle--on .ui-toggle__thumb {
      transform: translateX(
        calc(var(--toggle-w, 40px) - var(--toggle-h, 22px))
      );
    }
    @media (max-width: 767px) {
      .ui-toggle {
        --toggle-w: 44px;
        --toggle-h: 26px;
      }
    }
    @media (pointer: coarse) {
      .ui-toggle {
        position: relative;
      }
      .ui-toggle::before {
        content: '';
        position: absolute;
        inset: -10px 0;
      }
    }
  `,
})
export class Toggle {
  readonly checked = model(false);
  readonly label = input<string | null>(null);
  readonly disabled = input(false);
}
