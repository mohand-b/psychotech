import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { ArrowUp } from 'lucide-angular';
import { Icon } from '../../../shared/ui/icon/icon';

const VISIBLE_AFTER_PX = 480;

@Component({
  selector: 'app-guide-scroll-top',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  host: { '(window:scroll)': 'onScroll()' },
  template: `
    <button
      type="button"
      class="scroll-top"
      [class.scroll-top--visible]="visible()"
      [tabindex]="visible() ? null : -1"
      (click)="scrollToTop()"
      aria-label="Remonter en haut de page"
    >
      <ui-icon [img]="icon" [size]="18" [strokeWidth]="2.2" />
    </button>
  `,
  styles: `
    .scroll-top {
      position: fixed;
      right: 24px;
      bottom: calc(24px + var(--safe-bottom));
      z-index: 30;
      width: 44px;
      height: 44px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--border);
      border-radius: var(--radius-button);
      background: var(--card);
      color: var(--text-secondary);
      box-shadow: var(--shadow-card);
      cursor: pointer;
      opacity: 0;
      visibility: hidden;
      transform: translateY(8px);
      transition:
        opacity 0.2s ease,
        transform 0.2s ease,
        visibility 0.2s;
    }

    .scroll-top--visible {
      opacity: 1;
      visibility: visible;
      transform: none;
    }

    .scroll-top:hover {
      color: var(--ink);
      border-color: var(--border-hover);
    }

    @media (max-width: 767px) {
      .scroll-top {
        right: 16px;
        bottom: calc(16px + var(--safe-bottom));
      }
    }
  `,
})
export class GuideScrollTop {
  private readonly document = inject(DOCUMENT);

  protected readonly icon = ArrowUp;
  protected readonly visible = signal(false);

  protected onScroll(): void {
    this.visible.set(
      (this.document.defaultView?.scrollY ?? 0) > VISIBLE_AFTER_PX,
    );
  }

  protected scrollToTop(): void {
    const view = this.document.defaultView;
    if (!view) {
      return;
    }
    const reducedMotion = view.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    view.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
  }
}
