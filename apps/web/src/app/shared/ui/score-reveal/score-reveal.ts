import { DOCUMENT } from '@angular/common';
import {
  DestroyRef,
  Injectable,
  Signal,
  inject,
  signal,
} from '@angular/core';
import { animate, spring } from 'motion';

export const SCORE_REVEAL_VISUAL_DURATION_SEC = 1.7;
export const SCORE_REVEAL_CEILING = 100;

interface BounceStep {
  bounce: number;
  peakRatio: number;
}

/**
 * Measured peak of the spring for each bounce, as a ratio of its target. The
 * liveliest bounce whose peak still fits under the ceiling is picked, so the
 * note never has to be clamped in the middle of the wobble.
 */
export const SCORE_REVEAL_BOUNCE_STEPS: readonly BounceStep[] = [
  { bounce: 0.62, peakRatio: 1.275 },
  { bounce: 0.55, peakRatio: 1.205 },
  { bounce: 0.48, peakRatio: 1.148 },
  { bounce: 0.4, peakRatio: 1.095 },
  { bounce: 0.32, peakRatio: 1.054 },
  { bounce: 0.24, peakRatio: 1.025 },
  { bounce: 0.16, peakRatio: 1.008 },
  { bounce: 0, peakRatio: 1 },
];

const LEAST_BOUNCE =
  SCORE_REVEAL_BOUNCE_STEPS[SCORE_REVEAL_BOUNCE_STEPS.length - 1].bounce;

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export function bounceFor(target: number): number {
  const fitting = SCORE_REVEAL_BOUNCE_STEPS.find(
    (step) => target * step.peakRatio <= SCORE_REVEAL_CEILING,
  );
  return fitting?.bounce ?? LEAST_BOUNCE;
}

@Injectable()
export class ScoreReveal {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  private readonly animatedValue = signal(0);
  private readonly stampShown = signal(true);
  private readonly stampStruck = signal(false);

  private started = false;
  private stopAnimation: (() => void) | null = null;

  readonly value: Signal<number> = this.animatedValue.asReadonly();
  readonly stampVisible: Signal<boolean> = this.stampShown.asReadonly();
  readonly stampStrike: Signal<boolean> = this.stampStruck.asReadonly();

  constructor() {
    this.destroyRef.onDestroy(() => this.teardown());
  }

  /**
   * Settles on the target first: a frozen or failed animation still leaves the
   * final score and stamp on screen.
   */
  start(target: number): void {
    if (this.started) {
      return;
    }
    this.started = true;
    this.settle(target);
    if (this.prefersReducedMotion()) {
      return;
    }
    try {
      this.stampShown.set(false);
      const controls = animate(0, target, {
        type: spring,
        visualDuration: SCORE_REVEAL_VISUAL_DURATION_SEC,
        bounce: bounceFor(target),
        onUpdate: (current: number) => this.animatedValue.set(current),
        onComplete: () => {
          this.settle(target);
          this.stampStruck.set(true);
        },
      });
      this.stopAnimation = () => controls.stop();
    } catch {
      this.settle(target);
    }
  }

  private settle(target: number): void {
    this.animatedValue.set(target);
    this.stampShown.set(true);
  }

  private prefersReducedMotion(): boolean {
    const view = this.document.defaultView;
    if (typeof view?.matchMedia !== 'function') {
      return true;
    }
    return view.matchMedia(REDUCED_MOTION_QUERY).matches;
  }

  private teardown(): void {
    this.stopAnimation?.();
    this.stopAnimation = null;
  }
}
