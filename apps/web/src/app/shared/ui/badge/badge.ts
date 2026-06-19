import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { AxisType } from '@psychotech/shared';
import { AXIS_PRESENTATION } from '../axis-presentation';

export type BadgeTone = 'brand' | 'neutral';

@Component({
  selector: 'ui-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      [class]="classes()"
      [style.--badge-pastel]="axisPastel()"
      [style.--badge-text]="axisText()"
    >
      <ng-content />
    </span>
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    .ui-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 11px;
      border-radius: var(--radius-badge);
      font: 600 11px/14px var(--font-ui);
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .ui-badge--brand {
      background: var(--brand-pastel);
      color: var(--brand-hover);
    }
    .ui-badge--neutral {
      background: var(--surface-muted);
      color: var(--label);
    }
    .ui-badge--axis {
      background: var(--badge-pastel);
      color: var(--badge-text);
    }
  `,
})
export class Badge {
  readonly tone = input<BadgeTone>('brand');
  readonly axis = input<AxisType | null>(null);

  protected readonly axisPastel = computed(() => {
    const axis = this.axis();
    return axis ? AXIS_PRESENTATION[axis].pastelVar : null;
  });

  protected readonly axisText = computed(() => {
    const axis = this.axis();
    return axis ? AXIS_PRESENTATION[axis].textVar : null;
  });

  protected readonly classes = computed(() =>
    this.axis() ? 'ui-badge ui-badge--axis' : `ui-badge ui-badge--${this.tone()}`,
  );
}
