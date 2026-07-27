import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { AxisType } from '@psychotech/shared';
import { Icon } from '../icon/icon';
import { AXIS_PRESENTATION } from '../axis-presentation';

@Component({
  selector: 'ui-axis-label',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <span class="ui-axis-label">
      <ui-icon
        class="ui-axis-label__icon"
        [img]="presentation().icon"
        [size]="16"
        [style.color]="presentation().plainVar"
      />
      <span class="ui-axis-label__name">{{
        compact() ? presentation().shortLabel : presentation().label
      }}</span>
    </span>
  `,
  styles: `
    :host {
      display: inline-flex;
      min-width: 0;
    }
    .ui-axis-label {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }
    .ui-axis-label__icon {
      flex-shrink: 0;
      display: inline-flex;
    }
    .ui-axis-label__name {
      font: 500 13px/18px var(--font-ui);
      color: var(--ink);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `,
})
export class AxisLabel {
  readonly axis = input.required<AxisType>();
  readonly compact = input(false);

  protected readonly presentation = computed(
    () => AXIS_PRESENTATION[this.axis()],
  );
}
