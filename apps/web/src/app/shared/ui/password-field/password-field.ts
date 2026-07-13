import {
  ChangeDetectionStrategy,
  Component,
  input,
  model,
  signal,
} from '@angular/core';
import { Eye, EyeOff } from 'lucide-angular';
import { FormField } from '../form-field/form-field';
import { Icon } from '../icon/icon';

@Component({
  selector: 'ui-password-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormField, Icon],
  template: `
    <ui-form-field
      [label]="label()"
      [placeholder]="placeholder()"
      [type]="visible() ? 'text' : 'password'"
      [error]="error()"
      [valid]="valid()"
      [(value)]="value"
    >
      <ng-content
        select="[field-label-suffix]"
        ngProjectAs="[field-label-suffix]"
      />
      <button
        field-suffix
        type="button"
        class="ui-password-field__toggle"
        [attr.aria-label]="
          visible() ? 'Masquer le mot de passe' : 'Afficher le mot de passe'
        "
        (click)="toggleVisibility()"
      >
        <ui-icon [img]="visible() ? eyeOffIcon : eyeIcon" [size]="17" />
      </button>
    </ui-form-field>
  `,
  styles: `
    .ui-password-field__toggle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 38px;
      height: 38px;
      padding: 0;
      border: none;
      border-radius: 9px;
      background: transparent;
      color: var(--label);
      cursor: pointer;
      margin-right: -8px;
    }
    .ui-password-field__toggle:hover {
      color: var(--ink);
      background: var(--bg);
    }
    .ui-password-field__toggle:focus-visible {
      outline: 2px solid var(--brand);
      outline-offset: 2px;
    }
    @media (max-width: 767px) {
      .ui-password-field__toggle {
        width: 44px;
        height: 44px;
        border-radius: 10px;
        margin-right: -10px;
      }
    }
  `,
})
export class PasswordField {
  readonly label = input('');
  readonly placeholder = input('');
  readonly error = input<string | null>(null);
  readonly valid = input(false);
  readonly value = model('');

  protected readonly visible = signal(false);
  protected readonly eyeIcon = Eye;
  protected readonly eyeOffIcon = EyeOff;

  protected toggleVisibility(): void {
    this.visible.update((visible) => !visible);
  }
}
