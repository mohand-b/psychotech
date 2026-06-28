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

export type ButtonAppearance = 'solid' | 'ghost';

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
      @if (showArrow() && !loading()) {
        <ui-icon [img]="arrowIcon" />
      }
    </button>
  `,
  host: {
    '[class.ui-button--full]': 'block()',
  },
  styles: `
    :host {
      display: inline-flex;
    }
    :host(.ui-button--full) {
      display: flex;
      width: 100%;
    }
    :host(.ui-button--full) .ui-button {
      width: 100%;
    }
    .ui-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-family: var(--font-ui);
      font-size: 14px;
      font-weight: 600;
      line-height: 20px;
      border-radius: var(--radius-button);
      cursor: pointer;
    }
    .ui-button--brand {
      --btn-bg: var(--brand);
      --btn-bg-hover: var(--brand-hover);
      --btn-relief: var(--brand-relief);
      --btn-on: var(--card);
      --btn-loading: var(--brand-loading);
      --btn-text: var(--brand);
      --btn-line: var(--brand-pastel-bd);
      --btn-tint: var(--brand-pastel);
    }
    .ui-button--green {
      --btn-bg: var(--secondary-dark);
      --btn-bg-hover: var(--secondary-hover);
      --btn-relief: var(--secondary-relief);
      --btn-on: var(--card);
      --btn-loading: var(--secondary-hover);
      --btn-text: var(--secondary-label);
      --btn-line: var(--secondary-pastel-bd);
      --btn-tint: var(--secondary-pastel);
    }
    .ui-button--neutral {
      --btn-bg: var(--ink);
      --btn-bg-hover: var(--text-secondary);
      --btn-relief: var(--text-secondary);
      --btn-on: var(--card);
      --btn-loading: var(--text-secondary);
      --btn-text: var(--ink);
      --btn-line: var(--border);
      --btn-tint: var(--surface-hover);
    }
    .ui-button--logic {
      --btn-bg: var(--axis-logic);
      --btn-bg-hover: var(--axis-logic-text);
      --btn-relief: var(--axis-logic-text);
      --btn-on: var(--card);
      --btn-loading: var(--axis-logic);
      --btn-text: var(--axis-logic-text);
      --btn-line: var(--axis-logic-pastel-bd);
      --btn-tint: var(--axis-logic-pastel);
    }
    .ui-button--memory {
      --btn-bg: var(--axis-memory);
      --btn-bg-hover: var(--axis-memory-text);
      --btn-relief: var(--axis-memory-text);
      --btn-on: var(--card);
      --btn-loading: var(--axis-memory);
      --btn-text: var(--axis-memory-text);
      --btn-line: var(--axis-memory-pastel-bd);
      --btn-tint: var(--axis-memory-pastel);
    }
    .ui-button--discrimination {
      --btn-bg: var(--axis-discrimination);
      --btn-bg-hover: var(--axis-discrimination-text);
      --btn-relief: var(--axis-discrimination-text);
      --btn-on: var(--card);
      --btn-loading: var(--axis-discrimination);
      --btn-text: var(--axis-discrimination-text);
      --btn-line: var(--axis-discrimination-pastel-bd);
      --btn-tint: var(--axis-discrimination-pastel);
    }
    .ui-button--reactivity {
      --btn-bg: var(--axis-reactivity);
      --btn-bg-hover: var(--axis-reactivity-text);
      --btn-relief: var(--axis-reactivity-text);
      --btn-on: var(--card);
      --btn-loading: var(--axis-reactivity);
      --btn-text: var(--axis-reactivity-text);
      --btn-line: var(--axis-reactivity-pastel-bd);
      --btn-tint: var(--axis-reactivity-pastel);
    }
    .ui-button--motor {
      --btn-bg: var(--axis-motor);
      --btn-bg-hover: var(--axis-motor-text);
      --btn-relief: var(--axis-motor-text);
      --btn-on: var(--card);
      --btn-loading: var(--axis-motor);
      --btn-text: var(--axis-motor-text);
      --btn-line: var(--axis-motor-pastel-bd);
      --btn-tint: var(--axis-motor-pastel);
    }
    .ui-button--solid {
      padding: 10px 16px;
      border: none;
      background: var(--btn-bg);
      color: var(--btn-on);
    }
    .ui-button--solid:hover:not(:disabled) {
      background: var(--btn-bg-hover);
    }
    .ui-button--solid.ui-button--relief {
      border-bottom: 3px solid var(--btn-relief);
      padding-bottom: 7px;
    }
    .ui-button--ghost {
      padding: 9px 16px;
      border: 1px solid var(--btn-line);
      background: var(--card);
      color: var(--btn-text);
    }
    .ui-button--ghost:hover:not(:disabled) {
      background: var(--btn-tint);
    }
    .ui-button:disabled {
      background: var(--surface-muted);
      color: var(--text-disabled);
      cursor: not-allowed;
    }
    .ui-button--solid.ui-button--relief:disabled {
      border-bottom-color: var(--surface-muted);
    }
    .ui-button--loading:disabled {
      background: var(--btn-loading);
      color: var(--btn-on);
      cursor: progress;
    }
    .ui-button--loading.ui-button--relief:disabled {
      border-bottom-color: var(--btn-relief);
    }
    .ui-button__spinner {
      animation: ui-button-spin 0.7s linear infinite;
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
  readonly relief = input(false);
  readonly block = input(false);
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly showArrow = input(false);
  readonly icon = input<LucideIconData | null>(null);

  protected readonly arrowIcon = ArrowRight;
  protected readonly spinnerIcon = LoaderCircle;

  protected readonly classes = computed(() => {
    const relief =
      this.relief() && this.appearance() === 'solid' ? ' ui-button--relief' : '';
    const loading = this.loading() ? ' ui-button--loading' : '';
    return `ui-button ui-button--${this.color()} ui-button--${this.appearance()}${relief}${loading}`;
  });
}
