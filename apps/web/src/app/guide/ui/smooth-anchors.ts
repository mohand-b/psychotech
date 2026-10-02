import { DOCUMENT } from '@angular/common';
import { Directive, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, Scroll } from '@angular/router';

const SMOOTH_SCROLL_CLASS = 'smooth-anchor-scroll';

@Directive({
  selector: '[appSmoothAnchors]',
  host: { '(click)': 'onClick($event)' },
})
export class SmoothAnchors {
  private readonly document = inject(DOCUMENT);

  constructor() {
    inject(Router)
      .events.pipe(takeUntilDestroyed())
      .subscribe((event) => {
        if (event instanceof Scroll) {
          const view = this.document.defaultView;
          view?.requestAnimationFrame(() =>
            view.requestAnimationFrame(() =>
              this.document.documentElement.classList.remove(
                SMOOTH_SCROLL_CLASS,
              ),
            ),
          );
        }
      });
  }

  protected onClick(event: Event): void {
    const anchor = (event.target as Element).closest('a');
    if (anchor?.getAttribute('href')?.includes('#')) {
      this.document.documentElement.classList.add(SMOOTH_SCROLL_CLASS);
    }
  }
}
