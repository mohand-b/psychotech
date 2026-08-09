import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { Play } from 'lucide-angular';
import { ActionFooter } from '../../../shared/ui/action-footer/action-footer';
import { Button } from '../../../shared/ui/button/button';

@Component({
  selector: 'ui-result-actions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'motion-fade motion-delay-4' },
  imports: [ActionFooter, Button],
  template: `
    <ui-action-footer>
      <ui-button
        color="brand"
        block="mobile"
        [icon]="playIcon"
        (click)="newTraining.emit()"
      >
        Nouvel entraînement
      </ui-button>
      <ui-button
        color="neutral"
        appearance="outlined"
        block="mobile"
        (click)="back.emit()"
      >
        {{ backLabel() }}
      </ui-button>
    </ui-action-footer>
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class ResultActions {
  readonly backLabel = input.required<string>();
  readonly newTraining = output<void>();
  readonly back = output<void>();

  protected readonly playIcon = Play;
}
