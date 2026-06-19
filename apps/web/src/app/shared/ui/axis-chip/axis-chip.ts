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
      [style.--axis-pastel]="presentation().pastelVar"
      [style.--axis-border]="presentation().pastelBorderVar"
      [style.--axis-text]="presentation().textVar"
    >
      <ui-icon [img]="presentation().icon" />
      <span class="ui-axis-chip__label">{{ presentation().label }}</span>
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
      padding: 7px 12px;
      border: 1px solid var(--axis-border);
      border-radius: var(--radius-chip);
      background: var(--axis-pastel);
      color: var(--axis-text);
      font: 600 13px/18px var(--font-sans);
    }
  `,
})
export class AxisChip {
  readonly axis = input.required<AxisType>();

  protected readonly presentation = computed(
    () => AXIS_PRESENTATION[this.axis()],
  );
}
