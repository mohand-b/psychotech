import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, Signal, inject, signal } from '@angular/core';
import { animate } from 'motion';

export const SCORE_REVEAL_CEILING = 100;

const SCORE_REVEAL_POINTS_PER_SEC = 45;

const SCORE_REVEAL_MIN_DURATION_SEC = 0.5;

export function visualDurationFor(climbDistance: number): number {
  return Math.max(
    SCORE_REVEAL_MIN_DURATION_SEC,
    climbDistance / SCORE_REVEAL_POINTS_PER_SEC,
  );
}

const SCORE_REVEAL_SWINGS: readonly number[] = [6, -4, 2.5, -1.2];

const SCORE_REVEAL_MIN_SWING_SEC = 0.24;

const SCORE_REVEAL_SWING_PEAK_FACTOR = 1.5;

const SCORE_REVEAL_MIN_SWING_SCALE = 0.4;

const SCORE_REVEAL_SETTLE_MS = 900;

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

const MAX_SWING_UP = Math.max(...SCORE_REVEAL_SWINGS);
const MAX_SWING_DOWN = Math.abs(Math.min(...SCORE_REVEAL_SWINGS));

export function swingScaleFor(target: number): number {
  const room = Math.min(
    (SCORE_REVEAL_CEILING - target) / MAX_SWING_UP,
    target / MAX_SWING_DOWN,
  );
  const scale = Math.min(1, Math.max(0, room));
  return scale < SCORE_REVEAL_MIN_SWING_SCALE ? 0 : scale;
}

const SCORE_REVEAL_CLIMB_LINEAR_PART = 0.8;

function climbShape(progress: number): number {
  if (progress < SCORE_REVEAL_CLIMB_LINEAR_PART) {
    return progress;
  }
  const rest = 1 - SCORE_REVEAL_CLIMB_LINEAR_PART;
  const local = (progress - SCORE_REVEAL_CLIMB_LINEAR_PART) / rest;
  const eased = local + local * local - local * local * local;
  return SCORE_REVEAL_CLIMB_LINEAR_PART + rest * eased;
}

function swingShape(progress: number): number {
  return progress * progress * (3 - 2 * progress);
}

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
  const shaped = upper === 1 ? climbShape(local) : swingShape(local);
  return from + (keyframes[upper] - from) * shaped;
}

interface RevealPath {
  keyframes: number[];
  times: number[];
  durationSec: number;
}

export function revealPathFor(target: number): RevealPath {
  const scale = swingScaleFor(target);
  const swings = scale === 0 ? [] : SCORE_REVEAL_SWINGS;
  const keyframes = [0, target + (swings[0] ?? 0) * scale];
  swings.slice(1).forEach((swing) => keyframes.push(target + swing * scale));
  if (swings.length > 0) {
    keyframes.push(target);
  }

  const legs = keyframes
    .slice(1)
    .map((value, index) => Math.abs(value - keyframes[index]));
  const climbSec = Math.max(
    SCORE_REVEAL_MIN_DURATION_SEC,
    legs[0] / SCORE_REVEAL_POINTS_PER_SEC,
  );
  const widestSwing = Math.max(0, ...legs.slice(1));
  const swingSec = Math.max(
    SCORE_REVEAL_MIN_SWING_SEC,
    (SCORE_REVEAL_SWING_PEAK_FACTOR * widestSwing) /
      SCORE_REVEAL_POINTS_PER_SEC,
  );
  const legsSec = legs.map((leg, index) =>
    index === 0 ? climbSec : swingSec,
  );
  const totalSec = legsSec.reduce((sum, leg) => sum + leg, 0);

  const times = [0];
  let elapsed = 0;
  legsSec.forEach((leg) => {
    elapsed += leg;
    times.push(elapsed / totalSec);
  });

  return { keyframes, times, durationSec: totalSec };
}

@Injectable()
export class ScoreReveal {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  private readonly animatedValue = signal(0);
  private readonly timelineProgress = signal(0);
  private readonly stampShown = signal(true);
  private readonly stampStruck = signal(false);
  private readonly settlePulsing = signal(false);
  private readonly done = signal(false);

  private started = false;
  private stopAnimation: (() => void) | null = null;

  readonly value: Signal<number> = this.animatedValue.asReadonly();
  readonly timeline: Signal<number> = this.timelineProgress.asReadonly();
  readonly stampVisible: Signal<boolean> = this.stampShown.asReadonly();
  readonly stampStrike: Signal<boolean> = this.stampStruck.asReadonly();
  readonly settlePulse: Signal<boolean> = this.settlePulsing.asReadonly();
  readonly completed: Signal<boolean> = this.done.asReadonly();

  constructor() {
    this.destroyRef.onDestroy(() => this.teardown());
  }

  start(target: number): void {
    if (this.started) {
      return;
    }
    this.started = true;
    this.settle(target);
    if (this.prefersReducedMotion()) {
      this.timelineProgress.set(1);
      this.done.set(true);
      return;
    }
    try {
      this.stampShown.set(false);
      const path = revealPathFor(target);
      const controls = animate(0, 1, {
        duration: path.durationSec,
        ease: 'linear',
        onUpdate: (progress: number) => {
          this.animatedValue.set(valueAt(path, progress));
          this.timelineProgress.set(progress);
        },
        onComplete: () => this.finish(target),
      });
      this.stopAnimation = () => controls.stop();
    } catch {
      this.settle(target);
      this.timelineProgress.set(1);
      this.done.set(true);
    }
  }

  private finish(target: number): void {
    this.animatedValue.set(target);
    this.timelineProgress.set(1);
    this.settlePulsing.set(true);
    const settleId = window.setTimeout(() => {
      this.settlePulsing.set(false);
      this.settle(target);
      this.stampStruck.set(true);
      this.done.set(true);
    }, SCORE_REVEAL_SETTLE_MS);
    this.destroyRef.onDestroy(() => window.clearTimeout(settleId));
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
