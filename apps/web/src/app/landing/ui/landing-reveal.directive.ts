import {
  DestroyRef,
  Directive,
  ElementRef,
  afterNextRender,
  inject,
  input,
  numberAttribute,
} from '@angular/core';

const ARMED_CLASS = 'landing-reveal--armed';
const REVEALED_CLASS = 'landing-reveal--in';
const OBSERVER_HANDSHAKE_MS = 1000;
const CASCADE_STEP_MS = 80;
const CASCADE_MAX_INDEX = 4;

type BrowserWindow = Window & typeof globalThis;

function cascadeIndex(value: unknown): number {
  return numberAttribute(value, 0);
}

@Directive({
  selector: '[appLandingReveal]',
  host: { class: 'landing-reveal' },
})
export class LandingReveal {
  readonly appLandingReveal = input(0, { transform: cascadeIndex });

  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      const element = this.elementRef.nativeElement;
      const view = element.ownerDocument.defaultView;
      if (!view || !this.canAnimate(element, view)) {
        return;
      }
      const index = Math.min(this.appLandingReveal(), CASCADE_MAX_INDEX);
      if (index > 0) {
        element.style.transitionDelay = `${index * CASCADE_STEP_MS}ms`;
      }
      element.classList.add(ARMED_CLASS);
      this.revealOnIntersection(element, view);
    });
  }

  private canAnimate(element: HTMLElement, view: BrowserWindow): boolean {
    if (typeof view.IntersectionObserver !== 'function') {
      return false;
    }
    if (view.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return false;
    }
    return element.getBoundingClientRect().top > view.innerHeight;
  }

  private revealOnIntersection(
    element: HTMLElement,
    view: BrowserWindow,
  ): void {
    let handshake = 0;
    let answered = false;

    const observer = new view.IntersectionObserver(
      (entries: IntersectionObserverEntry[]) => {
        answered = true;
        if (entries.some((entry) => entry.isIntersecting)) {
          reveal();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    );

    function stop(): void {
      observer.disconnect();
      view.clearTimeout(handshake);
    }

    function reveal(): void {
      element.classList.add(REVEALED_CLASS);
      stop();
    }

    handshake = view.setTimeout(() => {
      if (!answered) {
        reveal();
      }
    }, OBSERVER_HANDSHAKE_MS);

    observer.observe(element);
    this.destroyRef.onDestroy(stop);
  }
}
