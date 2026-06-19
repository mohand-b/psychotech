import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
} from '@angular/core';
import { Check, LucideIconData } from 'lucide-angular';
import { Icon } from '../icon/icon';
import { inputValue } from '../../util/input-value';

@Component({
  selector: 'ui-form-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <label class="ui-form-field flex flex-col gap-2">
      @if (label()) {
        <span class="ui-form-field__label">{{ label() }}</span>
      }
      <span [class]="controlClasses()">
        @if (icon(); as glyph) {
          <ui-icon [img]="glyph" />
        }
        <input
          class="ui-form-field__input"
          [type]="type()"
          [placeholder]="placeholder()"
          [value]="value()"
          (input)="value.set(readValue($event))"
        />
        @if (showValid()) {
          <span class="ui-form-field__check"><ui-icon [img]="checkIcon" /></span>
        }
      </span>
      @if (error(); as message) {
        <span class="ui-form-field__error">{{ message }}</span>
      }
    </label>
  `,
  styles: `
    .ui-form-field__label {
      font: 600 13px/18px var(--font-sans);
      color: var(--color-ink);
    }
    .ui-form-field__control {
      display: flex;
      align-items: center;
      gap: 8px;
      height: 48px;
      padding: 0 14px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-field);
      color: var(--color-label);
    }
    .ui-form-field__control--valid {
      border-color: var(--color-success);
    }
    .ui-form-field__control--error {
      border-color: var(--color-danger);
    }
    .ui-form-field__control:focus-within {
      border-color: var(--color-brand);
      box-shadow: var(--focus-halo);
    }
    .ui-form-field__input {
      flex: 1;
      min-width: 0;
      border: none;
      background: transparent;
      outline: none;
      color: var(--color-ink);
      font: 400 15px/22px var(--font-sans);
    }
    .ui-form-field__input::placeholder {
      color: var(--color-label);
    }
    .ui-form-field__check {
      display: inline-flex;
      color: var(--color-success);
    }
    .ui-form-field__error {
      font: 400 13px/18px var(--font-sans);
      color: var(--color-danger-text);
    }
  `,
})
export class FormField {
  readonly label = input('');
  readonly placeholder = input('');
  readonly type = input('text');
  readonly icon = input<LucideIconData | null>(null);
  readonly error = input<string | null>(null);
  readonly valid = input(false);
  readonly value = model('');

  protected readonly checkIcon = Check;
  protected readonly readValue = inputValue;

  protected readonly showValid = computed(
    () => this.valid() && !this.error(),
  );

  protected readonly controlClasses = computed(() => {
    const state = this.error()
      ? ' ui-form-field__control--error'
      : this.showValid()
        ? ' ui-form-field__control--valid'
        : '';
    return `ui-form-field__control${state}`;
  });
}
