import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'ui-result-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content select="[panelStart]" />
    <ng-content select="[panelEnd]" />
    <ng-content select="[panelFull]" />
  `,
  styles: `
    :host {
      display: grid;
      grid-template-columns: 22rem 1fr;
      column-gap: 40px;
      row-gap: 14px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius-panel);
      box-shadow: var(--shadow-card);
      padding: 32px;
    }
    @media (max-width: 767px) {
      :host {
        grid-template-columns: 1fr;
        gap: 16px;
        background: transparent;
        border: none;
        box-shadow: none;
        padding: 0;
      }
    }
  `,
})
export class ResultPanel {}
