import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'ui-action-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="action-footer__actions"><ng-content /></div>
    <ng-content select="[actionFooterNote]" />
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      width: 100%;
    }
    .action-footer__actions {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
    }
    @media (max-width: 767px) {
      :host {
        position: fixed;
        inset: auto 0 0 0;
        width: auto;
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
export class ActionFooter {}
