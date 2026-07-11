import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { ScoreBand } from '@psychotech/shared';
import { BAND_COLOR_VARS } from '../../../shared/ui/score-rating';

@Component({
  selector: 'ui-threshold-gauge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="gauge__fill"
      [style.width.%]="clampedScore()"
      [style.background]="fillVar()"
    ></span>
    @if (eliminatoryThreshold(); as eliminatory) {
      <span
        class="gauge__marker gauge__marker--eliminatory"
        [style.left.%]="eliminatory"
      ></span>
    }
    <span
      class="gauge__marker"
      [style.left.%]="vigilanceThreshold()"
    ></span>
  `,
  styles: `
    :host {
      position: relative;
      display: block;
      width: 5.5rem;
      height: 6px;
      border-radius: 3px;
      background: var(--surface-muted);
      overflow: visible;
    }
    .gauge__fill {
      position: absolute;
      inset: 0 auto 0 0;
      border-radius: 3px;
    }
    .gauge__marker {
      position: absolute;
      top: -2px;
      bottom: -2px;
      width: 2px;
      border-radius: 1px;
      background: var(--label);
    }
    .gauge__marker--eliminatory {
      background: var(--ink);
    }
  `,
})
export class ThresholdGauge {
  readonly score = input.required<number>();
  readonly band = input.required<ScoreBand>();
  readonly eliminatoryThreshold = input<number | null>(null);
  readonly vigilanceThreshold = input.required<number>();

  protected readonly clampedScore = computed(() =>
    Math.min(100, Math.max(0, this.score())),
  );

  protected readonly fillVar = computed(() => BAND_COLOR_VARS[this.band()]);
}
