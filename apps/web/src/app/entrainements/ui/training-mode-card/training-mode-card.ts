import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { Check, LucideIconData, Zap } from 'lucide-angular';
import { Button, ButtonColor } from '../../../shared/ui/button/button';
import { Icon } from '../../../shared/ui/icon/icon';

export type TrainingModeColor = Extract<ButtonColor, 'brand' | 'green'>;

@Component({
  selector: 'ui-training-mode-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Icon],
  template: `
    <article [class]="classes()">
      <header class="ui-training-mode-card__band">
        <span class="ui-training-mode-card__tile">
          <ui-icon [img]="icon()" [size]="24" />
        </span>
        <span class="ui-training-mode-card__badge">{{ badge() }}</span>
      </header>

      <div class="ui-training-mode-card__body">
        <div class="ui-training-mode-card__heading">
          <h2 class="ui-training-mode-card__title">{{ title() }}</h2>
          <span class="ui-training-mode-card__cost">
            {{ cost() }}
            <ui-icon [img]="costIcon" [size]="15" />
          </span>
        </div>

        <p class="ui-training-mode-card__description">{{ description() }}</p>

        <ul class="ui-training-mode-card__features">
          @for (feature of features(); track feature) {
            <li class="ui-training-mode-card__feature">
              <ui-icon
                class="ui-training-mode-card__check"
                [img]="checkIcon"
                [size]="16"
                [strokeWidth]="2.5"
              />
              <span>{{ feature }}</span>
            </li>
          }
        </ul>

        <ui-button
          [color]="color()"
          size="lg"
          [relief]="true"
          [showArrow]="true"
          [block]="true"
          (click)="launch.emit()"
        >
          {{ ctaLabel() }}
        </ui-button>
      </div>
    </article>
  `,
  styles: `
    :host {
      display: block;
    }
    .ui-training-mode-card {
      display: flex;
      flex-direction: column;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius-panel);
      box-shadow: var(--shadow-card);
      overflow: hidden;
    }
    .ui-training-mode-card--brand {
      --mode-color: var(--brand);
      --mode-deep: var(--brand-relief);
      --mode-pastel: var(--brand-pastel);
      --mode-pastel-bd: var(--brand-pastel-bd);
      --mode-text: var(--brand-hover);
    }
    .ui-training-mode-card--green {
      --mode-color: var(--secondary-dark);
      --mode-deep: var(--secondary-relief);
      --mode-pastel: var(--secondary-pastel);
      --mode-pastel-bd: var(--secondary-pastel-bd);
      --mode-text: var(--secondary-label);
    }
    .ui-training-mode-card__band {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px;
      background: linear-gradient(135deg, var(--mode-color), var(--mode-deep));
    }
    .ui-training-mode-card__tile {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 52px;
      height: 52px;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.18);
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: var(--card);
    }
    .ui-training-mode-card__badge {
      display: inline-flex;
      align-items: center;
      padding: 6px 12px;
      border-radius: var(--radius-badge);
      background: rgba(255, 255, 255, 0.18);
      border: 1px solid rgba(255, 255, 255, 0.35);
      color: var(--card);
      font: 600 11px/14px var(--font-ui);
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .ui-training-mode-card__body {
      display: flex;
      flex-direction: column;
      gap: 18px;
      padding: 24px;
    }
    .ui-training-mode-card__heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .ui-training-mode-card__title {
      margin: 0;
      font: 700 22px/28px var(--font-display);
      color: var(--ink);
    }
    .ui-training-mode-card__cost {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: var(--radius-chip);
      background: var(--mode-pastel);
      border: 1px solid var(--mode-pastel-bd);
      color: var(--mode-text);
      font: 600 14px/18px var(--font-mono);
    }
    .ui-training-mode-card__description {
      margin: 0;
      font: 400 14px/20px var(--font-ui);
      color: var(--text-secondary);
    }
    .ui-training-mode-card__features {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .ui-training-mode-card__feature {
      display: flex;
      align-items: center;
      gap: 12px;
      font: 400 14px/20px var(--font-ui);
      color: var(--ink);
    }
    .ui-training-mode-card__check {
      flex-shrink: 0;
      color: var(--mode-color);
    }
  `,
})
export class TrainingModeCard {
  readonly color = input<TrainingModeColor>('brand');
  readonly icon = input.required<LucideIconData>();
  readonly badge = input.required<string>();
  readonly cost = input.required<number>();
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly features = input.required<readonly string[]>();
  readonly ctaLabel = input.required<string>();

  readonly launch = output<void>();

  protected readonly checkIcon = Check;
  protected readonly costIcon = Zap;

  protected readonly classes = computed(
    () => `ui-training-mode-card ui-training-mode-card--${this.color()}`,
  );
}
