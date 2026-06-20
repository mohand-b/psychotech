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
  styles: `
    :host {
      display: inline-flex;
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
    .ui-button--primary {
      padding: 10px 16px;
      border: none;
      background: var(--brand);
      color: var(--card);
    }
    .ui-button--primary:hover:not(:disabled) {
      background: var(--brand-hover);
    }
    .ui-button--primary-green {
      padding: 10px 16px;
      border: none;
      background: var(--secondary-dark);
      color: var(--card);
    }
    .ui-button--primary-green:hover:not(:disabled) {
      background: var(--secondary-hover);
    }
    .ui-button--secondary {
      padding: 9px 16px;
      border: 1px solid var(--border);
      background: var(--card);
      color: var(--ink);
    }
    .ui-button--secondary:hover:not(:disabled) {
      border-color: var(--border-hover);
      background: var(--surface-hover);
    }
    .ui-button:disabled {
      padding: 10px 16px;
      border: none;
      background: var(--surface-muted);
      color: var(--text-disabled);
      cursor: not-allowed;
    }
    .ui-button--loading:disabled {
      background: var(--brand-loading);
      color: var(--card);
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
    const loading = this.loading() ? ' ui-button--loading' : '';
    return `ui-button ui-button--${this.variant()}${loading}`;
  });
}
