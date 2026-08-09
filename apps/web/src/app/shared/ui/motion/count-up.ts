import { DOCUMENT } from '@angular/common';
import {
  DestroyRef,
  Directive,
  ElementRef,
  effect,
  inject,
  input,
} from '@angular/core';
import { prefersReducedMotion } from '../../util/reduced-motion';

const FALLBACK_DURATION_MS = 450;

function tokenDurationMs(document: Document): number {
  const raw = document.defaultView
    ?.getComputedStyle(document.documentElement)
    .getPropertyValue('--motion-deliberate');
  const parsed = raw ? Number.parseFloat(raw) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : FALLBACK_DURATION_MS;
}

@Directive({ selector: '[uiCountUp]' })
export class CountUp {
  readonly uiCountUp = input.required<number>();
  readonly countUpFromZero = input(false);

  private readonly element =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  private displayed: number | null = null;
  private frame: number | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.cancel());
    effect(() => {
      const target = this.uiCountUp();
      const from =
        this.displayed ?? (this.countUpFromZero() && target !== 0 ? 0 : target);
      if (from === target || prefersReducedMotion(this.document.defaultView)) {
        this.settle(target);
        return;
      }
      this.animate(from, target);
    });
  }

  private animate(from: number, target: number): void {
    this.cancel();
    const view = this.document.defaultView;
    if (!view) {
      this.settle(target);
      return;
    }
    const duration = tokenDurationMs(this.document);
    const start = view.performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(from + (target - from) * eased);
      this.write(value);
      if (progress < 1) {
        this.frame = view.requestAnimationFrame(step);
      } else {
        this.frame = null;
        this.settle(target);
      }
    };
    this.frame = view.requestAnimationFrame(step);
  }

  private settle(target: number): void {
    this.cancel();
    this.write(target);
  }

  private write(value: number): void {
    this.displayed = value;
    this.element.textContent = String(value);
  }

  private cancel(): void {
    if (this.frame !== null) {
      this.document.defaultView?.cancelAnimationFrame(this.frame);
      this.frame = null;
    }
  }
}
