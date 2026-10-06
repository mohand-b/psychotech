import { ChangeDetectionStrategy, Component } from '@angular/core';

interface BadgeSparkle {
  centerXPercent: number;
  centerYPercent: number;
  sizePercent: number;
  delayMs: number;
  durationMs: number;
}

const SPARKLE_PHASE_SPREAD_MS = 4400;

const BADGE_SPARKLES: readonly BadgeSparkle[] = [
  {
    centerXPercent: 70,
    centerYPercent: 27,
    sizePercent: 28,
    delayMs: 0,
    durationMs: 3600,
  },
  {
    centerXPercent: 25,
    centerYPercent: 52,
    sizePercent: 18,
    delayMs: 1300,
    durationMs: 4100,
  },
  {
    centerXPercent: 60,
    centerYPercent: 70,
    sizePercent: 16,
    delayMs: 2300,
    durationMs: 3800,
  },
  {
    centerXPercent: 40,
    centerYPercent: 18,
    sizePercent: 12,
    delayMs: 700,
    durationMs: 4400,
  },
];

@Component({
  selector: 'ui-badge-shine',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: `
    @for (sparkle of sparkles; track sparkle) {
      <svg
        class="shine__sparkle"
        viewBox="0 0 24 24"
        [style.left.%]="sparkle.centerXPercent"
        [style.top.%]="sparkle.centerYPercent"
        [style.width.%]="sparkle.sizePercent"
        [style.animation-delay.ms]="sparkle.delayMs"
        [style.animation-duration.ms]="sparkle.durationMs"
      >
        <path
          d="M12 0C12.9 7.6 16.4 11.1 24 12C16.4 12.9 12.9 16.4 12 24C11.1 16.4 7.6 12.9 0 12C7.6 11.1 11.1 7.6 12 0Z"
        />
      </svg>
    }
  `,
  styles: `
    :host {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }
    .shine__sparkle {
      position: absolute;
      aspect-ratio: 1;
      translate: -50% -50%;
      fill: var(--badge-shine-sparkle);
      filter: drop-shadow(0 0 1px var(--badge-shine-sparkle))
        drop-shadow(0 0 4px var(--badge-shine-glow));
      animation-name: badgeShineTwinkle;
      animation-timing-function: ease-in-out;
      animation-iteration-count: infinite;
      animation-fill-mode: both;
    }
    @keyframes badgeShineTwinkle {
      0%,
      100% {
        opacity: 0;
        transform: scale(0) rotate(-35deg);
      }
      10% {
        opacity: 1;
      }
      20% {
        opacity: 1;
        transform: scale(1) rotate(10deg);
      }
      32% {
        opacity: 0;
        transform: scale(0.1) rotate(45deg);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      :host {
        display: none;
      }
    }
  `,
})
export class BadgeShine {
  private readonly phaseMs = Math.round(
    Math.random() * SPARKLE_PHASE_SPREAD_MS,
  );

  protected readonly sparkles: readonly BadgeSparkle[] = BADGE_SPARKLES.map(
    (sparkle) => ({ ...sparkle, delayMs: sparkle.delayMs - this.phaseMs }),
  );
}
