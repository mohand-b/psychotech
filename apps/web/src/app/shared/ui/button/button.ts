import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { ArrowRight, LoaderCircle, LucideIconData } from 'lucide-angular';
import { Icon } from '../icon/icon';

export type ButtonColor =
  | 'brand'
  | 'green'
  | 'neutral'
  | 'logic'
  | 'memory'
  | 'discrimination'
  | 'reactivity'
  | 'motor';

export type ButtonAppearance = 'solid' | 'outlined' | 'ghost';

export type ButtonSize = 'md' | 'lg';

@Component({
  selector: 'ui-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <button
      type="button"
      [class]="classes()"
      [disabled]="disabled() || loading()"
    >
      @if (loading()) {
        <ui-icon [img]="spinnerIcon" class="ui-button__spinner" />
      } @else if (icon(); as glyph) {
        <ui-icon [img]="glyph" />
      }
      <span class="ui-button__label"><ng-content /></span>
      @if (!loading() && iconEnd(); as glyph) {
        <ui-icon [img]="glyph" />
      }
      @if (showArrow() && !loading()) {
        <ui-icon [img]="arrowIcon" />
      }
    </button>
  `,
  host: {
    '[class.ui-button--block]': 'block()',
  },
  styles: `
    :host {
      display: inline-flex;
    }
    :host(.ui-button--block) {
      display: flex;
      width: 100%;
    }
    :host(.ui-button--block) .ui-button {
      width: 100%;
    }
    .ui-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-family: var(--font-ui);
      font-weight: 600;
      line-height: 20px;
      white-space: nowrap;
      border-radius: var(--radius-button);
      cursor: pointer;
    }
    .ui-button__label {
      white-space: nowrap;
    }
    .ui-button--md {
      --btn-pad-y: 10px;
      --btn-pad-x: 16px;
      font-size: 14px;
    }
    .ui-button--lg {
      --btn-pad-y: 13px;
      --btn-pad-x: 20px;
      font-size: 15px;
    }
    .ui-button--brand {
      --btn-fill: var(--brand);
      --btn-fill-hover: var(--brand-hover);
      --btn-fill-loading: var(--brand-loading);
      --btn-on-fill: var(--card);
      --btn-relief: var(--brand-relief);
      --btn-outline-text: var(--brand);
      --btn-outline-border: var(--brand-pastel-bd);
      --btn-outline-hover: var(--brand-pastel);
    }
    .ui-button--green {
      --btn-fill: var(--secondary-dark);
      --btn-fill-hover: var(--secondary-hover);
      --btn-fill-loading: var(--secondary-hover);
      --btn-on-fill: var(--card);
      --btn-relief: var(--secondary-relief);
      --btn-outline-text: var(--secondary-label);
      --btn-outline-border: var(--secondary-pastel-bd);
      --btn-outline-hover: var(--secondary-pastel);
    }
    .ui-button--neutral {
      --btn-fill: var(--ink);
      --btn-fill-hover: var(--text-secondary);
      --btn-fill-loading: var(--text-secondary);
      --btn-on-fill: var(--card);
      --btn-relief: var(--text-secondary);
      --btn-outline-text: var(--ink);
      --btn-outline-border: var(--border);
      --btn-outline-hover: var(--surface-hover);
    }
    .ui-button--logic {
      --btn-fill: var(--axis-logic);
      --btn-fill-hover: var(--axis-logic-text);
      --btn-fill-loading: var(--axis-logic);
      --btn-on-fill: var(--card);
      --btn-relief: var(--axis-logic-text);
      --btn-outline-text: var(--axis-logic-text);
      --btn-outline-border: var(--axis-logic-pastel-bd);
      --btn-outline-hover: var(--axis-logic-pastel);
    }
    .ui-button--memory {
      --btn-fill: var(--axis-memory);
      --btn-fill-hover: var(--axis-memory-text);
      --btn-fill-loading: var(--axis-memory);
      --btn-on-fill: var(--card);
      --btn-relief: var(--axis-memory-text);
      --btn-outline-text: var(--axis-memory-text);
      --btn-outline-border: var(--axis-memory-pastel-bd);
      --btn-outline-hover: var(--axis-memory-pastel);
    }
    .ui-button--discrimination {
      --btn-fill: var(--axis-discrimination);
      --btn-fill-hover: var(--axis-discrimination-text);
      --btn-fill-loading: var(--axis-discrimination);
      --btn-on-fill: var(--card);
      --btn-relief: var(--axis-discrimination-text);
      --btn-outline-text: var(--axis-discrimination-text);
      --btn-outline-border: var(--axis-discrimination-pastel-bd);
      --btn-outline-hover: var(--axis-discrimination-pastel);
    }
    .ui-button--reactivity {
      --btn-fill: var(--axis-reactivity);
      --btn-fill-hover: var(--axis-reactivity-text);
      --btn-fill-loading: var(--axis-reactivity);
      --btn-on-fill: var(--card);
      --btn-relief: var(--axis-reactivity-text);
      --btn-outline-text: var(--axis-reactivity-text);
      --btn-outline-border: var(--axis-reactivity-pastel-bd);
      --btn-outline-hover: var(--axis-reactivity-pastel);
    }
    .ui-button--motor {
      --btn-fill: var(--axis-motor);
      --btn-fill-hover: var(--axis-motor-text);
      --btn-fill-loading: var(--axis-motor);
      --btn-on-fill: var(--card);
      --btn-relief: var(--axis-motor-text);
      --btn-outline-text: var(--axis-motor-text);
      --btn-outline-border: var(--axis-motor-pastel-bd);
      --btn-outline-hover: var(--axis-motor-pastel);
    }
    .ui-button--solid {
      padding: var(--btn-pad-y) var(--btn-pad-x);
      border: none;
      background: var(--btn-fill);
      color: var(--btn-on-fill);
    }
    .ui-button--solid:hover:not(:disabled) {
      background: var(--btn-fill-hover);
    }
    .ui-button--solid.ui-button--relief {
      border-bottom: 3px solid var(--btn-relief);
      padding-bottom: calc(var(--btn-pad-y) - 3px);
    }
    .ui-button--outlined {
      padding: calc(var(--btn-pad-y) - 1px) var(--btn-pad-x);
      border: 1px solid var(--btn-outline-border);
      background: var(--card);
      color: var(--btn-outline-text);
    }
    .ui-button--outlined:hover:not(:disabled) {
      background: var(--btn-outline-hover);
    }
    .ui-button--ghost {
      padding: var(--btn-pad-y) var(--btn-pad-x);
      border: none;
      background: transparent;
      color: var(--text-secondary);
    }
    .ui-button--ghost:hover:not(:disabled) {
      background: var(--surface-muted);
      color: var(--ink);
    }
    .ui-button--ghost:disabled {
      background: transparent;
      color: var(--text-disabled);
    }
    .ui-button:disabled {
      background: var(--surface-muted);
      color: var(--text-disabled);
      cursor: not-allowed;
    }
    .ui-button--outlined:disabled {
      border-color: var(--border);
    }
    .ui-button--solid.ui-button--relief:disabled {
      border-bottom-color: var(--surface-muted);
    }
    .ui-button--loading:disabled {
      background: var(--btn-fill-loading);
      color: var(--btn-on-fill);
      cursor: progress;
    }
    .ui-button--loading.ui-button--relief:disabled {
      border-bottom-color: var(--btn-relief);
    }
    .ui-button__spinner {
      animation: ui-button-spin 0.7s linear infinite;
    }
    @media (max-width: 767px) {
      .ui-button {
        min-height: 44px;
      }
      .ui-button--solid.ui-button--relief-mobile {
        border-bottom: 3px solid var(--btn-relief);
        padding-bottom: calc(var(--btn-pad-y) - 3px);
      }
      .ui-button--solid.ui-button--relief-mobile:disabled {
        border-bottom-color: var(--surface-muted);
      }
      .ui-button--loading.ui-button--relief-mobile:disabled {
        border-bottom-color: var(--btn-relief);
      }
    }
    @keyframes ui-button-spin {
      to {
        transform: rotate(360deg);
      }
    }
  `,
})
export class Button {
  readonly color = input<ButtonColor>('brand');
  readonly appearance = input<ButtonAppearance>('solid');
  readonly size = input<ButtonSize>('md');
  readonly relief = input<boolean | 'mobile'>(false);
  readonly block = input(false);
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly showArrow = input(false);
  readonly icon = input<LucideIconData | null>(null);
  readonly iconEnd = input<LucideIconData | null>(null);

  protected readonly arrowIcon = ArrowRight;
  protected readonly spinnerIcon = LoaderCircle;

  protected readonly classes = computed(() => {
    const reliefValue = this.appearance() === 'solid' ? this.relief() : false;
    const relief =
      reliefValue === 'mobile'
        ? ' ui-button--relief-mobile'
        : reliefValue
          ? ' ui-button--relief'
          : '';
    const loading = this.loading() ? ' ui-button--loading' : '';
    return `ui-button ui-button--${this.color()} ui-button--${this.appearance()} ui-button--${this.size()}${relief}${loading}`;
  });
}
