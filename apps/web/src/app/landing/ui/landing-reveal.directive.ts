import {
  DestroyRef,
  Directive,
  ElementRef,
  afterNextRender,
  inject,
  input,
} from '@angular/core';

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
      const delay = this.appLandingReveal();
      if (delay) {
        element.style.transitionDelay = delay;
      }
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        element.classList.add('landing-reveal--in');
        return;
      }
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              element.classList.add('landing-reveal--in');
              observer.disconnect();
            }
          }
        },
        { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
      );
      observer.observe(element);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}
