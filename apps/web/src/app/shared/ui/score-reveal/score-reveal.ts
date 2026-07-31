import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, Signal, inject, signal } from '@angular/core';
import { animate } from 'motion';

export const SCORE_REVEAL_CEILING = 100;

// Vitesse de montée constante : une note de 20 et une note de 90 progressent
// au même rythme, la seconde prend simplement plus de temps à se révéler.
const SCORE_REVEAL_POINTS_PER_SEC = 28;

const SCORE_REVEAL_MIN_DURATION_SEC = 0.5;

/**
 * Durée de la montée initiale, calculée sur la distance réellement parcourue
 * depuis zéro : la note grimpe au même nombre de points par seconde, qu'elle
 * s'arrête à 20 ou à 90.
 */
export function visualDurationFor(climbDistance: number): number {
  return Math.max(
    SCORE_REVEAL_MIN_DURATION_SEC,
    climbDistance / SCORE_REVEAL_POINTS_PER_SEC,
  );
}

// Écarts en points autour de la note, et non en pourcentage : deux allers-
// retours amortis qui se terminent en montant, quelle que soit la note. Un
// ressort n'y arrive pas, son amplitude étant liée à son nombre d'oscillations.
const SCORE_REVEAL_SWINGS: readonly number[] = [6, -4, 2.5, -1.2];

const SCORE_REVEAL_SWING_MS: readonly number[] = [300, 240, 190, 160];

// En deçà, il ne reste plus assez de place sous 0 ou au-dessus de 100 pour que
// le balancement se voie : la note monte alors d'un trait.
const SCORE_REVEAL_MIN_SWING_SCALE = 0.4;

const SCORE_REVEAL_PULSE_MS = 460;

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

const MAX_SWING_UP = Math.max(...SCORE_REVEAL_SWINGS);
const MAX_SWING_DOWN = Math.abs(Math.min(...SCORE_REVEAL_SWINGS));

/**
 * Réduit les écarts quand la note est trop haute ou trop basse pour les
 * contenir, et renvoie 0 quand il n'y a plus assez de place pour balancer.
 */
export function swingScaleFor(target: number): number {
  const room = Math.min(
    (SCORE_REVEAL_CEILING - target) / MAX_SWING_UP,
    target / MAX_SWING_DOWN,
  );
  const scale = Math.min(1, Math.max(0, room));
  return scale < SCORE_REVEAL_MIN_SWING_SCALE ? 0 : scale;
}

function easeInOut(progress: number): number {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

/**
 * Valeur affichée à un instant donné du parcours, segment par segment. On
 * interpole nous-mêmes plutôt que de confier les images-clés au moteur : la
 * montée part ainsi toujours de zéro, sans dépendre de sa lecture des bornes.
 */
export function valueAt(path: RevealPath, progress: number): number {
  const { keyframes, times } = path;
  if (progress <= 0) {
    return keyframes[0];
  }
  if (progress >= 1) {
    return keyframes[keyframes.length - 1];
  }
  const index = times.findIndex((time, at) => at > 0 && progress <= time);
  const upper = index === -1 ? keyframes.length - 1 : index;
  const spanStart = times[upper - 1];
  const span = times[upper] - spanStart;
  const local = span === 0 ? 1 : (progress - spanStart) / span;
  const from = keyframes[upper - 1];
  return from + (keyframes[upper] - from) * easeInOut(local);
}

interface RevealPath {
  keyframes: number[];
  times: number[];
  durationSec: number;
}

export function revealPathFor(target: number): RevealPath {
  const scale = swingScaleFor(target);
  const swings = scale === 0 ? [] : SCORE_REVEAL_SWINGS;
  const firstPeak = target + (swings[0] ?? 0) * scale;
  const climbMs = visualDurationFor(firstPeak) * 1000;
  const stepsMs = swings.map((_, index) => SCORE_REVEAL_SWING_MS[index]);
  const totalMs = climbMs + stepsMs.reduce((sum, step) => sum + step, 0);

  const keyframes = [0];
  const times = [0];
  let elapsed = climbMs;
  keyframes.push(target + (swings[0] ?? 0) * scale);
  times.push(elapsed / totalMs);
  swings.slice(1).forEach((swing, index) => {
    elapsed += stepsMs[index];
    keyframes.push(target + swing * scale);
    times.push(elapsed / totalMs);
  });
  if (swings.length > 0) {
    keyframes.push(target);
    times.push(1);
  }

  return { keyframes, times, durationSec: totalMs / 1000 };
}

@Injectable()
export class ScoreReveal {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  private readonly animatedValue = signal(0);
  private readonly stampShown = signal(true);
  private readonly stampStruck = signal(false);
  private readonly settlePulsing = signal(false);

  private started = false;
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
      const path = revealPathFor(target);
      const controls = animate(0, 1, {
        duration: path.durationSec,
        ease: 'linear',
        onUpdate: (progress: number) =>
          this.animatedValue.set(valueAt(path, progress)),
        onComplete: () => this.finish(target),
      });
      this.stopAnimation = () => controls.stop();
    } catch {
      this.settle(target);
    }
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
