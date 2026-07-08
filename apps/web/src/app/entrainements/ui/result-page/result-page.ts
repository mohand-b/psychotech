import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'ui-result-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content />`,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 24px;
      width: 100%;
      max-width: 56rem;
      margin: 0 auto;
      padding: 32px 1.5rem 40px;
    }
    @media (max-width: 767px) {
      :host {
        padding: 16px 16px 32px;
        gap: 16px;
      }
    }
  `,
})
export class ResultPage {}
