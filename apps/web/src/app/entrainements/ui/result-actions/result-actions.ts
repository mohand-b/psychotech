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
          relief="mobile"
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
          relief="mobile"
          [block]="true"
          (click)="back.emit()"
        >
          {{ backLabel() }}
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
        position: fixed;
        inset: auto 0 0 0;
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
        background: var(--bg);
        border-top: 1px solid var(--border);
        padding: 12px 16px calc(16px + var(--safe-bottom));
        z-index: 30;
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
  readonly backLabel = input.required<string>();
  readonly newTraining = output<void>();
  readonly back = output<void>();

  protected readonly playIcon = Play;
}
