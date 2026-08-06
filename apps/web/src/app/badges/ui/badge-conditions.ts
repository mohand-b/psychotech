import {
  ChangeDetectionStrategy,
  Component,
  input,
} from '@angular/core';
import { BadgeConditionView } from './badge-views';

@Component({
  selector: 'ui-badge-conditions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (intro(); as introLabel) {
      <span class="conditions__intro">{{ introLabel }}</span>
    }
    @for (condition of conditions(); track condition.label) {
      <span
        class="conditions__item"
        [class.conditions__item--met]="condition.met"
        >{{ condition.label }}</span
      >
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .conditions__intro {
      font: 600 11px/1.4 var(--font-ui);
      color: var(--text-secondary);
    }
    .conditions__item {
      font: 400 11.5px/1.45 var(--font-ui);
      color: var(--text-secondary);
    }
    .conditions__item--met {
      font-weight: 500;
      color: var(--success-text);
      text-decoration: line-through;
    }
  `,
})
export class BadgeConditions {
  readonly intro = input<string | null>(null);
  readonly conditions = input.required<BadgeConditionView[]>();
}
