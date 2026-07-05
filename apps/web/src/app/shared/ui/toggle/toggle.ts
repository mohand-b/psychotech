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
      width: 44px;
      height: 24px;
      padding: 2px;
      border: none;
      border-radius: 12px;
      background: var(--border-hover);
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .ui-toggle--on {
      background: var(--brand);
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
      width: 20px;
      height: 20px;
      border-radius: var(--radius-pill);
      background: var(--card);
      box-shadow: var(--shadow-card);
      transition: transform 0.15s ease;
    }
    .ui-toggle--on .ui-toggle__thumb {
      transform: translateX(20px);
    }
  `,
})
export class Toggle {
  readonly checked = model(false);
  readonly label = input<string | null>(null);
  readonly disabled = input(false);
}
