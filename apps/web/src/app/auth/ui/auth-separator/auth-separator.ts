import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'ui-auth-separator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="separator-line"></span>
    <span class="separator-label">{{ label() }}</span>
    <span class="separator-line"></span>
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .separator-line {
      height: 1px;
      flex: 1;
      background: var(--border);
    }
    .separator-label {
      font: 500 12px/16px var(--font-ui);
      color: var(--text-disabled);
    }
  `,
})
export class AuthSeparator {
  readonly label = input('ou par email');
}
