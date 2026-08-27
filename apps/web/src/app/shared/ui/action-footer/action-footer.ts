import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';

const MOBILE_QUERY = '(max-width: 767px)';

@Component({
  selector: 'ui-action-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="action-footer__bar" #bar>
      <div class="action-footer__actions"><ng-content /></div>
      <ng-content select="[actionFooterNote]" />
    </div>
    <div
      class="action-footer__spacer"
      [style.height.px]="reservedHeight()"
    ></div>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
    }
    .action-footer__bar {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .action-footer__actions {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
    }
    @media (max-width: 767px) {
      .action-footer__bar {
        position: fixed;
        inset: auto 0 0 0;
        align-items: stretch;
        gap: 8px;
        background: var(--card);
        border-top: 1px solid var(--border);
        padding: 12px calc(16px + var(--safe-right))
          calc(12px + var(--safe-bottom)) calc(16px + var(--safe-left));
        z-index: 30;
      }
      .action-footer__actions {
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
      }
    }
  `,
})
export class ActionFooter {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  private readonly bar = viewChild.required<ElementRef<HTMLElement>>('bar');

  protected readonly reservedHeight = signal(0);

  constructor() {
    afterNextRender(() => {
      const view = this.document.defaultView;
      if (!view) {
        return;
      }
      const media = view.matchMedia(MOBILE_QUERY);
      const measure = () =>
        this.reservedHeight.set(
          media.matches ? this.bar().nativeElement.offsetHeight : 0,
        );
      const observer = new view.ResizeObserver(measure);
      observer.observe(this.bar().nativeElement);
      media.addEventListener('change', measure);
      measure();
      this.destroyRef.onDestroy(() => {
        observer.disconnect();
        media.removeEventListener('change', measure);
      });
    });
  }
}
