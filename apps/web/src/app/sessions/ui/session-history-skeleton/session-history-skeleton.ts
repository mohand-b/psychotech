import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-session-history-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="skeleton">
      <span class="skeleton__block skeleton__chip"></span>
      <span class="skeleton__heading flex flex-col gap-1.5">
        <span class="skeleton__block skeleton__line skeleton__line--title"></span>
        <span class="skeleton__block skeleton__line skeleton__line--sub"></span>
      </span>
      <span class="skeleton__block skeleton__line skeleton__line--date"></span>
      <span class="skeleton__block skeleton__line skeleton__line--duration"></span>
      <span class="skeleton__block skeleton__line skeleton__line--score"></span>
      <span class="skeleton__end">
        <span class="skeleton__block skeleton__line skeleton__line--link"></span>
      </span>
    </div>
    <div class="skeletonm">
      <span class="skeleton__block skeletonm__icon"></span>
      <span class="skeletonm__text flex flex-col gap-1.5">
        <span class="skeleton__block skeleton__line skeleton__line--title"></span>
        <span class="skeleton__block skeleton__line skeleton__line--sub"></span>
      </span>
      <span class="skeleton__block skeleton__line skeleton__line--score"></span>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .skeleton {
      display: grid;
      grid-template-columns: 13rem minmax(0, 1fr) 10rem 6rem 4.5rem 7rem;
      align-items: center;
      gap: 2.25rem;
      padding: 14px 24px;
    }
    .skeleton__block {
      border-radius: var(--radius-badge);
      background: var(--surface-muted);
      animation: skeleton-pulse 1.4s ease-in-out infinite;
    }
    .skeleton__chip {
      width: 6.5rem;
      height: 32px;
      border-radius: var(--radius-chip);
    }
    .skeleton__line {
      height: 12px;
    }
    .skeleton__line--title {
      width: 70%;
    }
    .skeleton__line--sub {
      width: 40%;
    }
    .skeleton__line--date {
      width: 80%;
    }
    .skeleton__line--duration {
      width: 100%;
    }
    .skeleton__line--score {
      width: 100%;
    }
    .skeleton__line--link {
      width: 5.5rem;
    }
    .skeleton__end {
      display: inline-flex;
      justify-content: flex-end;
    }
    .skeletonm {
      display: none;
      align-items: center;
      gap: 12px;
      padding: 13px 16px;
    }
    .skeletonm__icon {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
    }
    .skeletonm__text {
      flex: 1;
      min-width: 0;
    }
    .skeletonm .skeleton__line--score {
      width: 3rem;
    }
    @keyframes skeleton-pulse {
      50% {
        opacity: 0.45;
      }
    }
    @media (max-width: 767px) {
      .skeleton {
        display: none;
      }
      .skeletonm {
        display: flex;
      }
    }
  `,
})
export class SessionHistorySkeleton {}
