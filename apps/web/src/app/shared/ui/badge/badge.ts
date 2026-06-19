import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

export type BadgeTone = 'neutral' | 'info' | 'soon' | 'sector';

@Component({
  selector: 'ui-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span [class]="classes()"><ng-content /></span>`,
  styles: `
    :host {
      display: inline-flex;
    }
    .ui-badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 8px;
      border: 1px solid transparent;
      border-radius: var(--radius-badge);
      font: 600 11px/14px var(--font-sans);
      letter-spacing: 0.02em;
    }
    .ui-badge--neutral {
      background: var(--color-surface-neutral);
      border-color: var(--color-border);
      color: var(--color-text-secondary);
    }
    .ui-badge--info {
      background: var(--color-brand-pastel);
      border-color: var(--color-brand-pastel-border);
      color: var(--color-brand);
    }
    .ui-badge--soon {
      background: var(--color-surface-neutral);
      border-color: var(--color-border);
      color: var(--color-label);
    }
    .ui-badge--sector {
      background: var(--color-secondary-pastel);
      border-color: var(--color-secondary-pastel-border);
      color: var(--color-secondary-label);
    }
  `,
})
export class Badge {
  readonly tone = input<BadgeTone>('neutral');

  protected readonly classes = computed(
    () => `ui-badge ui-badge--${this.tone()}`,
  );
}
