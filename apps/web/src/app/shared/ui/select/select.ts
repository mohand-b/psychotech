import {
  ChangeDetectionStrategy,
  Component,
  input,
  model,
} from '@angular/core';
import { ChevronDown } from 'lucide-angular';
import { Icon } from '../icon/icon';
import { inputValue } from '../../util/input-value';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

@Component({
  selector: 'ui-select',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <label class="ui-select">
      @if (label()) {
        <span class="ui-select__label">{{ label() }}</span>
      }
      <span class="ui-select__control">
        <select
          class="ui-select__input"
          [value]="value()"
          (change)="value.set(readValue($event))"
        >
          @for (option of options(); track option.value) {
            <option [value]="option.value" [disabled]="option.disabled ?? false">
              {{ option.label }}
            </option>
          }
        </select>
        <span class="ui-select__chevron" aria-hidden="true">
          <ui-icon [img]="chevronIcon" [size]="17" />
        </span>
      </span>
    </label>
  `,
  styles: `
    :host {
      display: block;
    }
    .ui-select {
      display: flex;
      flex-direction: column;
      gap: 7px;
    }
    .ui-select__label {
      font: 600 13px/18px var(--font-ui);
      color: var(--ink);
    }
    .ui-select__control {
      position: relative;
      display: flex;
      align-items: center;
      height: 48px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius-input);
    }
    .ui-select__control:focus-within {
      border-color: var(--brand);
      box-shadow: var(--shadow-focus);
    }
    .ui-select__input {
      flex: 1;
      min-width: 0;
      height: 100%;
      padding: 0 40px 0 14px;
      border: none;
      outline: none;
      background: transparent;
      font: 400 15px/22px var(--font-ui);
      color: var(--ink);
      appearance: none;
      cursor: pointer;
    }
    .ui-select__chevron {
      position: absolute;
      right: 14px;
      display: inline-flex;
      color: var(--label);
      pointer-events: none;
    }
  `,
})
export class Select {
  readonly label = input('');
  readonly options = input<SelectOption[]>([]);
  readonly value = model('');

  protected readonly chevronIcon = ChevronDown;
  protected readonly readValue = inputValue;
}
