import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { ArrowRight, LoaderCircle, LucideIconData } from 'lucide-angular';
import { Icon } from '../icon/icon';

export type ButtonVariant = 'primary' | 'primary-green' | 'secondary';

@Component({
  selector: 'ui-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <button type="button" [class]="classes()" [disabled]="disabled() || loading()">
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
  styles: `
    :host {
      display: inline-flex;
    }
    .ui-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 18px;
      border: 1px solid transparent;
      border-radius: var(--radius-button);
      font: 600 15px/22px var(--font-sans);
      cursor: pointer;
    }
    .ui-button--primary {
      background: var(--color-brand);
      color: #ffffff;
    }
    .ui-button--primary:hover:not(:disabled) {
      background: var(--color-brand-dark);
    }
    .ui-button--primary-green {
      background: var(--color-secondary-dark);
      color: #ffffff;
    }
    .ui-button--primary-green:hover:not(:disabled) {
      background: var(--color-secondary-hover);
    }
    .ui-button--secondary {
      background: var(--color-surface);
      color: var(--color-ink);
      border-color: var(--color-border);
    }
    .ui-button--secondary:hover:not(:disabled) {
      background: var(--color-surface-hover);
      border-color: var(--color-border-hover);
    }
    .ui-button:disabled {
      background: var(--color-surface-neutral);
      color: var(--color-text-disabled);
      border-color: transparent;
      cursor: not-allowed;
    }
    .ui-button--loading:disabled {
      background: var(--color-brand-loading);
      color: #ffffff;
      cursor: progress;
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
  readonly variant = input<ButtonVariant>('primary');
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly showArrow = input(false);
  readonly icon = input<LucideIconData | null>(null);

  protected readonly arrowIcon = ArrowRight;
  protected readonly spinnerIcon = LoaderCircle;

  protected readonly classes = computed(() => {
    const variant = `ui-button--${this.variant()}`;
    const loading = this.loading() ? ' ui-button--loading' : '';
    return `ui-button ${variant}${loading}`;
  });
}
