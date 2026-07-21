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
  selector: 'ui-axis-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <span
      class="ui-axis-chip"
      [class.ui-axis-chip--mobile-icon]="mobileIconOnly()"
      [style.--axis-pastel]="presentation().pastelVar"
      [style.--axis-pastel-bd]="presentation().pastelBorderVar"
      [style.--axis-text]="presentation().textVar"
    >
      <ui-icon [img]="presentation().icon" />
      <span class="ui-axis-chip__label">{{
        compact() ? presentation().shortLabel : presentation().label
      }}</span>
    </span>
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    .ui-axis-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      min-width: 0;
      padding: 7px 12px;
      border: 1px solid var(--axis-pastel-bd);
      border-radius: var(--radius-chip);
      background: var(--axis-pastel);
      color: var(--axis-text);
      font: 600 13px/18px var(--font-ui);
    }
    @media (max-width: 767px) {
      .ui-axis-chip--mobile-icon {
        flex: none;
        padding: 7px;
      }
      .ui-axis-chip--mobile-icon .ui-axis-chip__label {
        display: none;
      }
    }
  `,
})
export class AxisChip {
  readonly axis = input.required<AxisType>();
  readonly compact = input(false);
  readonly mobileIconOnly = input(false);

  protected readonly presentation = computed(
    () => AXIS_PRESENTATION[this.axis()],
  );
}
