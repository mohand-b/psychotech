import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { ArrowRight, LucideIconData } from 'lucide-angular';
import { Icon } from '../icon/icon';

export type ButtonVariant = 'primary' | 'primary-green' | 'secondary';

@Component({
  selector: 'ui-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <button type="button" [class]="classes()" [disabled]="disabled()">
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
  `,
})
export class Button {
  readonly variant = input<ButtonVariant>('primary');
  readonly disabled = input(false);
  readonly showArrow = input(false);
  readonly icon = input<LucideIconData | null>(null);

  protected readonly arrowIcon = ArrowRight;

  protected readonly classes = computed(
    () => `ui-button ui-button--${this.variant()}`,
  );
}
