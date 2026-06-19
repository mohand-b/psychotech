import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { ScoreBand } from '@psychotech/shared';

interface ScorePresentation {
  band: ScoreBand;
  colorVar: string;
  label: string;
  range: string;
}

function resolveScorePresentation(score: number): ScorePresentation {
  if (score >= 80) {
    return {
      band: ScoreBand.EXCELLENT,
      colorVar: 'var(--rating-good)',
      label: 'Très bon',
      range: '80 – 100',
    };
  }
  if (score >= 70) {
    return {
      band: ScoreBand.ACCEPTABLE,
      colorVar: 'var(--rating-ok)',
      label: 'Acceptable',
      range: '70 – 79',
    };
  }
  if (score >= 60) {
    return {
      band: ScoreBand.FRAGILE,
      colorVar: 'var(--rating-weak)',
      label: 'Fragile',
      range: '60 – 69',
    };
  }
  return {
    band: ScoreBand.INSUFFICIENT,
    colorVar: 'var(--rating-bad)',
    label: 'Insuffisant',
    range: '0 – 59',
  };
}

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
    resolveScorePresentation(this.score()),
  );
}
