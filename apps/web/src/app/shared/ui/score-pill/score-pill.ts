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
}

function resolveScorePresentation(score: number): ScorePresentation {
  if (score >= 80) {
    return {
      band: ScoreBand.EXCELLENT,
      colorVar: 'var(--color-score-excellent)',
      label: 'Très bon',
    };
  }
  if (score >= 70) {
    return {
      band: ScoreBand.ACCEPTABLE,
      colorVar: 'var(--color-score-acceptable)',
      label: 'Acceptable',
    };
  }
  if (score >= 60) {
    return {
      band: ScoreBand.FRAGILE,
      colorVar: 'var(--color-score-fragile)',
      label: 'Fragile',
    };
  }
  return {
    band: ScoreBand.INSUFFICIENT,
    colorVar: 'var(--color-score-insufficient)',
    label: 'Insuffisant',
  };
}

@Component({
  selector: 'ui-score-pill',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="ui-score-pill" [style.--score-color]="presentation().colorVar">
      <span class="ui-score-pill__dot"></span>
      <span class="ui-score-pill__label">{{ presentation().label }}</span>
    </span>
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    .ui-score-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .ui-score-pill__dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--score-color);
    }
    .ui-score-pill__label {
      font: 600 13px/18px var(--font-sans);
      color: var(--score-color);
    }
  `,
})
export class ScorePill {
  readonly score = input.required<number>();

  protected readonly presentation = computed(() =>
    resolveScorePresentation(this.score()),
  );
}
