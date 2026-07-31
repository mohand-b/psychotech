import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, Signal, inject, signal } from '@angular/core';
import { animate, spring } from 'motion';

const SCORE_REVEAL_VISUAL_DURATION_SEC = 1.8;

// Aucun dépassement : la note monte vite puis décélère jusqu'à sa valeur.
// Tout dépassement devrait être défait, et ce retour en arrière est à la fois
// une rupture de vitesse à l'écran et une baisse de note pour le candidat.
const SCORE_REVEAL_BOUNCE = 0;

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

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
        bounce: SCORE_REVEAL_BOUNCE,
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
