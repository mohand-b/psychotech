import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'ui-result-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content />`,
  host: { class: 'page-shell' },
})
export class ResultPage {}
