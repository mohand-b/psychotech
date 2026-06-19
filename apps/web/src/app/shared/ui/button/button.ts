import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { AxisType } from '@psychotech/shared';
import { ArrowRight, LucideIconData } from 'lucide-angular';
import { Icon } from '../icon/icon';
import { AXIS_PRESENTATION } from '../axis-presentation';

export type ButtonVariant = 'primary' | 'secondary' | 'accent';

@Component({
  selector: 'ui-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <button
      type="button"
      [class]="classes()"
      [disabled]="disabled()"
      [style.--ui-button-axis]="axisColor()"
    >
      @if (icon(); as glyph) {
        <ui-icon [img]="glyph" />
      }
      <span class="ui-button__label"><ng-content /></span>
      @if (showArrow()) {
        <ui-icon [img]="arrowIcon" />
      }
    </button>
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    .ui-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px 18px;
      border: 1px solid transparent;
      border-radius: var(--radius-button);
      font: 600 15px/22px var(--font-sans);
      cursor: pointer;
    }
    .ui-button--primary {
      background: var(--color-brand);
      color: #ffffff;
    }
    .ui-button--secondary {
      background: var(--color-surface);
      color: var(--color-ink);
      border-color: var(--color-border);
    }
    .ui-button--accent {
      background: var(--color-secondary-strong);
      color: #ffffff;
    }
    .ui-button--axis {
      background: var(--ui-button-axis);
      color: #ffffff;
    }
    .ui-button:disabled {
      background: var(--color-disabled);
      color: var(--color-label);
      border-color: transparent;
      cursor: not-allowed;
    }
  `,
})
export class Button {
  readonly variant = input<ButtonVariant>('primary');
  readonly axis = input<AxisType | null>(null);
  readonly disabled = input(false);
  readonly showArrow = input(false);
  readonly icon = input<LucideIconData | null>(null);

  protected readonly arrowIcon = ArrowRight;

  protected readonly classes = computed(() => {
    const variant = this.axis()
      ? 'ui-button--axis'
      : `ui-button--${this.variant()}`;
    return `ui-button ${variant}`;
  });

  protected readonly axisColor = computed(() => {
    const axis = this.axis();
    return axis ? AXIS_PRESENTATION[axis].colorVar : null;
  });
}
