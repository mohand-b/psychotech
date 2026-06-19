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
      border-radius: var(--radius-chip);
      font: 600 11px/14px var(--font-sans);
      letter-spacing: 0.04em;
    }
    .ui-badge--neutral {
      background: color-mix(in srgb, var(--color-label) 14%, transparent);
      color: var(--color-text-secondary);
    }
    .ui-badge--info {
      background: color-mix(in srgb, var(--color-brand) 12%, transparent);
      color: var(--color-brand);
    }
    .ui-badge--soon {
      background: color-mix(in srgb, var(--color-label) 12%, transparent);
      color: var(--color-label);
    }
    .ui-badge--sector {
      background: color-mix(in srgb, var(--color-secondary) 16%, transparent);
      color: var(--color-secondary-label);
    }
  `,
})
export class Badge {
  readonly tone = input<BadgeTone>('neutral');

  protected readonly classes = computed(() => `ui-badge ui-badge--${this.tone()}`);
}
