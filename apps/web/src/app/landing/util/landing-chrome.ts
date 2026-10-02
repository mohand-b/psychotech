import { DOCUMENT, ViewportScroller } from '@angular/common';
import {
  afterNextRender,
  DestroyRef,
  inject,
  Signal,
  signal,
} from '@angular/core';
import { appAnchorOffset } from '../../core/scroll/anchor-offset';

const LANDING_BODY_CLASS = 'landing-active';
const LANDING_HEADER_SELECTOR = 'app-landing-header';
const HEADER_GLASS_SCROLL_THRESHOLD = 8;

export function injectLandingChrome(): Signal<boolean> {
  const document = inject(DOCUMENT);
  const destroyRef = inject(DestroyRef);
  const scroller = inject(ViewportScroller);
  const scrolled = signal(false);

  scroller.setOffset(() => [
    0,
    document.querySelector(LANDING_HEADER_SELECTOR)?.getBoundingClientRect()
      .height ?? 0,
  ]);
  destroyRef.onDestroy(() => {
    const view = document.defaultView;
    if (typeof view?.matchMedia === 'function') {
      scroller.setOffset(appAnchorOffset(view));
    }
  });

  afterNextRender(() => {
    const view = document.defaultView;
    if (!view) {
      return;
    }
    const sync = (): void =>
      scrolled.set(view.scrollY > HEADER_GLASS_SCROLL_THRESHOLD);
    document.body.classList.add(LANDING_BODY_CLASS);
    sync();
    view.addEventListener('scroll', sync, { passive: true });
    destroyRef.onDestroy(() => {
      view.removeEventListener('scroll', sync);
      document.body.classList.remove(LANDING_BODY_CLASS);
    });
  });

  return scrolled.asReadonly();
}
