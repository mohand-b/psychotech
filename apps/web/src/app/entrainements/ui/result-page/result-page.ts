import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'ui-result-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content />`,
  host: { class: 'page-shell' },
  styles: `
    @media (max-width: 767px) {
      :host {
        padding-bottom: calc(9rem + var(--safe-bottom));
      }
    }
  `,
})
export class ResultPage {}
