import {
  ChangeDetectionStrategy,
  Component,
  input,
  model,
} from '@angular/core';
import { inputValue } from '../../util/input-value';

@Component({
  selector: 'ui-form-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="ui-form-field flex flex-col gap-2">
      <span class="t-label">{{ label() }}</span>
      <input
        class="ui-form-field__input"
        [type]="type()"
        [placeholder]="placeholder()"
        [value]="value()"
        (input)="value.set(readValue($event))"
      />
      @if (error(); as message) {
        <span class="ui-form-field__error t-support">{{ message }}</span>
      }
    </label>
  `,
  styles: `
    .ui-form-field__input {
      padding: 10px 12px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-button);
      background: var(--color-surface);
      color: var(--color-ink);
      font: 400 15px/22px var(--font-sans);
      outline: none;
    }
    .ui-form-field__input:focus {
      border-color: var(--color-brand);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-brand) 20%, transparent);
    }
    .ui-form-field__error {
      color: var(--color-danger);
    }
  `,
})
export class FormField {
  readonly label = input('');
  readonly placeholder = input('');
  readonly type = input('text');
  readonly error = input<string | null>(null);
  readonly value = model('');

  protected readonly readValue = inputValue;
}
