import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { Play } from 'lucide-angular';
import { Button } from '../../../shared/ui/button/button';

@Component({
  selector: 'ui-result-actions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button],
  template: `
    <div class="actions">
      <div class="actions__item">
        <ui-button
          color="brand"
          [block]="true"
          [icon]="playIcon"
          (click)="newTraining.emit()"
        >
          Nouvel entraînement
        </ui-button>
      </div>
      <div class="actions__item">
        <ui-button
          color="neutral"
          appearance="outlined"
          [block]="true"
          (click)="backToAxes.emit()"
        >
          Retour aux axes
        </ui-button>
      </div>
    </div>
    <p class="actions__footnote t-support">{{ footnote() }}</p>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .actions {
      display: flex;
      justify-content: center;
      gap: 12px;
    }
    .actions__footnote {
      margin: 0;
      text-align: center;
      color: var(--label);
    }
    @media (max-width: 767px) {
      .actions {
        flex-direction: column;
        gap: 12px;
      }
      .actions__item {
        width: 100%;
      }
      :host {
        gap: 16px;
      }
    }
  `,
})
export class ResultActions {
  readonly footnote = input.required<string>();
  readonly newTraining = output<void>();
  readonly backToAxes = output<void>();

  protected readonly playIcon = Play;
}
