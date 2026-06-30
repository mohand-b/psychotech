import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { AxisType } from '@psychotech/shared';
import { Zap } from 'lucide-angular';
import { Button, ButtonColor } from '../../../shared/ui/button/button';
import { Icon } from '../../../shared/ui/icon/icon';
import { AXIS_PRESENTATION } from '../../../shared/ui/axis-presentation';
import { resolveScoreRating } from '../../../shared/ui/score-rating';

const AXIS_BUTTON_COLOR: Partial<Record<AxisType, ButtonColor>> = {
  [AxisType.LOGIC]: 'logic',
  [AxisType.MEMORY]: 'memory',
  [AxisType.VISUAL_DISCRIMINATION]: 'discrimination',
  [AxisType.REACTIVITY]: 'reactivity',
  [AxisType.MOTOR_SKILLS]: 'motor',
};

@Component({
  selector: 'ui-axis-training-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Icon],
  template: `
    <article
      class="axis-card"
      [style.--axis-plain]="presentation().plainVar"
      [style.--axis-pastel]="presentation().pastelVar"
    >
      <header class="axis-card__header">
        <span class="axis-card__tile">
          <ui-icon [img]="presentation().icon" [size]="22" />
        </span>
        @if (badge(); as label) {
          <span class="axis-card__badge">{{ label }}</span>
        }
      </header>

      <div class="axis-card__heading">
        <h3 class="axis-card__name">{{ presentation().label }}</h3>
        <p class="axis-card__description">{{ description() }}</p>
      </div>

      <div class="axis-card__score">
        <div class="axis-card__score-row">
          <span class="axis-card__score-label">Meilleur</span>
          @if (bestScore() !== null) {
            <span class="axis-card__score-value">
              <span
                class="axis-card__dot"
                [style.background]="ratingColor()"
              ></span>
              <span class="axis-card__score-number">{{ bestScore() }}</span>
            </span>
          } @else {
            <span
              class="axis-card__score-number axis-card__score-number--empty"
              >—</span
            >
          }
        </div>
        <div class="axis-card__bar">
          <span
            class="axis-card__bar-fill"
            [style.width.%]="bestScore() ?? 0"
          ></span>
        </div>
      </div>

      <ui-button
        [color]="buttonColor()"
        [relief]="true"
        [block]="true"
        (click)="start.emit()"
      >
        S'entraîner {{ cost() }}
        <ui-icon [img]="costIcon" [size]="15" />
      </ui-button>
    </article>
  `,
  styles: `
    :host {
      display: block;
    }
    .axis-card {
      display: flex;
      flex-direction: column;
      gap: 1.125rem;
      height: 100%;
      background: var(--card);
      border: 1px solid var(--border);
      border-top: 3px solid var(--axis-plain);
      border-radius: var(--radius-card);
      box-shadow: var(--shadow-card);
      padding: 1.375rem;
    }
    .axis-card__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem;
    }
    .axis-card__tile {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 3rem;
      height: 3rem;
      border-radius: 0.8125rem;
      background: var(--axis-pastel);
      color: var(--axis-plain);
    }
    .axis-card__badge {
      display: inline-flex;
      align-items: center;
      padding: 0.3125rem 0.625rem;
      border-radius: var(--radius-badge);
      background: var(--axis-reactivity-pastel);
      border: 1px solid var(--axis-reactivity-pastel-bd);
      color: var(--axis-reactivity-text);
      font: 600 0.6875rem/0.875rem var(--font-ui);
    }
    .axis-card__heading {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }
    .axis-card__name {
      margin: 0;
      font: 600 1.125rem/1.5rem var(--font-ui);
      color: var(--ink);
    }
    .axis-card__description {
      margin: 0;
      font: 400 0.8125rem/1.125rem var(--font-ui);
      color: var(--text-secondary);
    }
    .axis-card__score {
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
      margin-top: auto;
    }
    .axis-card__score-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .axis-card__score-label {
      font: 600 0.6875rem/0.875rem var(--font-ui);
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--label);
    }
    .axis-card__score-value {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }
    .axis-card__dot {
      width: 0.5625rem;
      height: 0.5625rem;
      border-radius: var(--radius-pill);
    }
    .axis-card__score-number {
      font-family: var(--font-mono);
      font-variant-numeric: tabular-nums;
      font-size: 1rem;
      font-weight: 600;
      color: var(--ink);
    }
    .axis-card__score-number--empty {
      color: var(--label);
    }
    .axis-card__bar {
      height: 0.3125rem;
      border-radius: 0.1875rem;
      background: var(--surface-muted);
      overflow: hidden;
    }
    .axis-card__bar-fill {
      display: block;
      height: 100%;
      border-radius: 0.1875rem;
      background: var(--axis-plain);
    }
  `,
})
export class AxisTrainingCard {
  readonly axis = input.required<AxisType>();
  readonly description = input.required<string>();
  readonly cost = input.required<number>();
  readonly bestScore = input<number | null>(null);
  readonly badge = input<string | null>(null);

  readonly start = output<void>();

  protected readonly costIcon = Zap;

  protected readonly presentation = computed(() => AXIS_PRESENTATION[this.axis()]);

  protected readonly buttonColor = computed<ButtonColor>(
    () => AXIS_BUTTON_COLOR[this.axis()] ?? 'brand',
  );

  protected readonly ratingColor = computed(() => {
    const score = this.bestScore();
    return score === null ? '' : resolveScoreRating(score).colorVar;
  });
}
