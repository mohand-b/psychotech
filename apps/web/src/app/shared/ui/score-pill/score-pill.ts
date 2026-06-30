import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { resolveScoreRating } from '../score-rating';

@Component({
  selector: 'ui-score-pill',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ui-score-pill">
      <span
        class="ui-score-pill__dot"
        [style.background]="presentation().colorVar"
      ></span>
      <div class="ui-score-pill__text">
        <span class="ui-score-pill__label">{{ presentation().label }}</span>
        <span class="ui-score-pill__range">{{ presentation().range }}</span>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    .ui-score-pill {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border: 1px solid var(--border);
      border-radius: var(--radius-button);
    }
    .ui-score-pill__dot {
      width: 12px;
      height: 12px;
      border-radius: var(--radius-pill);
      flex-shrink: 0;
    }
    .ui-score-pill__text {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .ui-score-pill__label {
      font: 600 13px/18px var(--font-ui);
      color: var(--ink);
    }
    .ui-score-pill__range {
      font-family: var(--font-mono);
      font-variant-numeric: tabular-nums;
      font-size: 12px;
      color: var(--label);
    }
  `,
})
export class ScorePill {
  readonly score = input.required<number>();

  protected readonly presentation = computed(() =>
    resolveScoreRating(this.score()),
  );
}
