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
  imports: [ActionFooter, Button],
  template: `
    <ui-action-footer>
      <ui-button
        color="brand"
        relief="mobile"
        block="mobile"
        [icon]="playIcon"
        (click)="newTraining.emit()"
      >
        Nouvel entraînement
      </ui-button>
      <ui-button
        color="neutral"
        appearance="outlined"
        relief="mobile"
        block="mobile"
        (click)="back.emit()"
      >
        {{ backLabel() }}
      </ui-button>
      <p actionFooterNote class="actions__footnote t-support">
        {{ footnote() }}
      </p>
    </ui-action-footer>
  `,
  styles: `
    :host {
      display: block;
    }
    .actions__footnote {
      margin: 0;
      text-align: center;
      color: var(--label);
    }
  `,
})
export class ResultActions {
  readonly footnote = input.required<string>();
  readonly backLabel = input.required<string>();
  readonly newTraining = output<void>();
  readonly back = output<void>();

  protected readonly playIcon = Play;
}
