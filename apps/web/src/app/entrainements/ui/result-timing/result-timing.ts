import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { ListChecks } from 'lucide-angular';
import { Button } from '../../../shared/ui/button/button';

@Component({
  selector: 'ui-result-timing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button],
  template: `
    <span class="t-label">{{ heading() }}</span>
    <ng-content />
    <p class="timing__note t-support">{{ note() }}</p>
    @if (showReview()) {
      <ui-button
        color="neutral"
        appearance="outlined"
        [icon]="reviewIcon"
        (click)="review.emit()"
      >
        Revoir mes réponses
      </ui-button>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-width: 0;
    }
    .timing__note {
      margin: 0;
      color: var(--label);
    }
    @media (max-width: 767px) {
      :host {
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: var(--radius-panel);
        box-shadow: var(--shadow-card);
        padding: 20px;
      }
    }
  `,
})
export class ResultTiming {
  readonly heading = input.required<string>();
  readonly note = input.required<string>();
  readonly showReview = input(true);
  readonly review = output<void>();

  protected readonly reviewIcon = ListChecks;
}
