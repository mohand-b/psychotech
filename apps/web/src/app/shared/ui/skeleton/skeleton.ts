import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'ui-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
  host: { 'aria-hidden': 'true' },
  styles: `
    :host {
      display: block;
      border-radius: var(--radius-chip);
      background: linear-gradient(
        100deg,
        var(--surface-muted) 40%,
        var(--surface-hover) 50%,
        var(--surface-muted) 60%
      );
      background-size: 200% 100%;
      animation: ui-skeleton-shimmer 1.4s ease-in-out infinite;
    }

    @keyframes ui-skeleton-shimmer {
      from {
        background-position: 120% 0;
      }
      to {
        background-position: -20% 0;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      :host {
        animation: none;
      }
    }
  `,
})
export class Skeleton {}
