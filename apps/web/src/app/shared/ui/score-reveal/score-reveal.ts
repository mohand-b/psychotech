import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, Signal, inject, signal } from '@angular/core';
import { animate, spring } from 'motion';

// Vitesse de montée constante : une note de 20 et une note de 90 progressent
// au même rythme, la seconde prend simplement plus de temps à se révéler.
const SCORE_REVEAL_POINTS_PER_SEC = 28;

const SCORE_REVEAL_MIN_DURATION_SEC = 0.5;

export function visualDurationFor(target: number): number {
  return Math.max(
    SCORE_REVEAL_MIN_DURATION_SEC,
    target / SCORE_REVEAL_POINTS_PER_SEC,
  );
}

export const SCORE_REVEAL_CEILING = 100;

// Le dépassement est borné en points, pas seulement sous 100 : voir sa note
// grimper bien au-dessus avant de retomber donne de faux espoirs.
const SCORE_REVEAL_MAX_OVERSHOOT_POINTS = 4;

interface BounceStep {
  bounce: number;
  peakRatio: number;
}

// Dépassements mesurés sur le ressort ; ils ne dépendent que du rebond, pas
// de la durée. Le plus vivant tient deux allers-retours qui s'amortissent.
// On retient le plus vivant dont le pic tient encore sous 100, pour que la
// note oscille autour de sa valeur sans jamais afficher un score impossible.
const SCORE_REVEAL_BOUNCE_STEPS: readonly BounceStep[] = [
  { bounce: 0.7, peakRatio: 1.372 },
  { bounce: 0.62, peakRatio: 1.275 },
  { bounce: 0.45, peakRatio: 1.126 },
  { bounce: 0.35, peakRatio: 1.068 },
  { bounce: 0.25, peakRatio: 1.028 },
  { bounce: 0.15, peakRatio: 1.006 },
  { bounce: 0, peakRatio: 1 },
];

export function bounceFor(target: number): number {
  const fitting = SCORE_REVEAL_BOUNCE_STEPS.find((step) => {
    const peak = target * step.peakRatio;
    return (
      peak <= SCORE_REVEAL_CEILING &&
      peak - target <= SCORE_REVEAL_MAX_OVERSHOOT_POINTS
    );
  });
  return fitting?.bounce ?? 0;
}

// Le ressort est un générateur pur : on l'échantillonne avant de lancer
// l'animation pour repérer son dernier creux sous la note. On coupe là, puis
// on termine par une courte montée : le dernier mouvement va vers la note.
const SCORE_REVEAL_SAMPLE_STEP_MS = 10;
const SCORE_REVEAL_MAX_SAMPLE_MS = 12000;
const SCORE_REVEAL_TROUGH_EPSILON = 0.3;
const SCORE_REVEAL_FINAL_RISE_SEC = 0.42;

const SCORE_REVEAL_PULSE_MS = 460;

interface SpringTrough {
  timeMs: number;
  value: number;
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

@Injectable()
export class ScoreReveal {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  private readonly animatedValue = signal(0);
  private readonly stampShown = signal(true);
  private readonly stampStruck = signal(false);
  private readonly settlePulsing = signal(false);

  private started = false;
  private risingToTarget = false;
  private stopAnimation: (() => void) | null = null;

  readonly value: Signal<number> = this.animatedValue.asReadonly();
  readonly stampVisible: Signal<boolean> = this.stampShown.asReadonly();
  readonly stampStrike: Signal<boolean> = this.stampStruck.asReadonly();
  readonly settlePulse: Signal<boolean> = this.settlePulsing.asReadonly();

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
      const visualDuration = visualDurationFor(target);
      const bounce = bounceFor(target);
      const trough = this.lastTroughOf(target, bounce, visualDuration);
      const startedAt = performance.now();
      const controls = animate(0, target, {
        type: spring,
        visualDuration,
        bounce,
        onUpdate: (current: number) => {
          if (this.risingToTarget) {
            return;
          }
          this.animatedValue.set(current);
          if (!trough || performance.now() - startedAt < trough.timeMs) {
            return;
          }
          this.risingToTarget = true;
          this.stopAnimation?.();
          this.riseToTarget(trough.value, target);
        },
        onComplete: () => {
          if (this.risingToTarget) {
            return;
          }
          this.finish(target);
        },
      });
      this.stopAnimation = () => controls.stop();
    } catch {
      this.settle(target);
    }
  }

  /**
   * Dernier creux du ressort sous la note, ou null quand il n'oscille pas.
   */
  private lastTroughOf(
    target: number,
    bounce: number,
    visualDuration: number,
  ): SpringTrough | null {
    if (bounce === 0) {
      return null;
    }
    const generator = spring({ visualDuration, bounce, keyframes: [0, target] });
    let trough: SpringTrough | null = null;
    let previous = 0;
    let descending = false;
    for (
      let elapsed = 0;
      elapsed <= SCORE_REVEAL_MAX_SAMPLE_MS;
      elapsed += SCORE_REVEAL_SAMPLE_STEP_MS
    ) {
      const { value, done } = generator.next(elapsed);
      if (value < previous) {
        descending = true;
      } else if (descending) {
        if (previous < target - SCORE_REVEAL_TROUGH_EPSILON) {
          trough = { timeMs: elapsed - SCORE_REVEAL_SAMPLE_STEP_MS, value: previous };
        }
        descending = false;
      }
      previous = value;
      if (done) {
        break;
      }
    }
    return trough;
  }

  private riseToTarget(from: number, target: number): void {
    const controls = animate(from, target, {
      duration: SCORE_REVEAL_FINAL_RISE_SEC,
      ease: 'easeOut',
      onUpdate: (current: number) => this.animatedValue.set(current),
      onComplete: () => this.finish(target),
    });
    this.stopAnimation = () => controls.stop();
  }

  private finish(target: number): void {
    this.settle(target);
    this.stampStruck.set(true);
    this.settlePulsing.set(true);
    const pulseId = window.setTimeout(
      () => this.settlePulsing.set(false),
      SCORE_REVEAL_PULSE_MS,
    );
    this.destroyRef.onDestroy(() => window.clearTimeout(pulseId));
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
