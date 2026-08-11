import {
  DestroyRef,
  Directive,
  ElementRef,
  afterNextRender,
  inject,
  input,
} from '@angular/core';

const ARMED_CLASS = 'landing-reveal--armed';
const REVEALED_CLASS = 'landing-reveal--in';
const OBSERVER_HANDSHAKE_MS = 1000;

type BrowserWindow = Window & typeof globalThis;

@Directive({
  selector: '[appLandingReveal]',
  host: { class: 'landing-reveal' },
})
export class LandingReveal {
  readonly appLandingReveal = input('');

  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      const element = this.elementRef.nativeElement;
      const view = element.ownerDocument.defaultView;
      if (!view || !this.canAnimate(element, view)) {
        return;
      }
      const delay = this.appLandingReveal();
      if (delay) {
        element.style.transitionDelay = delay;
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
