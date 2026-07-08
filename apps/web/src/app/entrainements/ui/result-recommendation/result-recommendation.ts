import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import {
  RecommendationPriority,
  TrainingRecommendation,
} from '@psychotech/shared';
import { ArrowRight } from 'lucide-angular';
import { Icon } from '../../../shared/ui/icon/icon';

const PRIORITY_BADGES: Record<
  RecommendationPriority,
  { label: string; mobileLabel: string; pastelVar: string; textVar: string }
> = {
  [RecommendationPriority.HIGH]: {
    label: 'Haute',
    mobileLabel: 'Priorité haute',
    pastelVar: 'var(--danger-pastel)',
    textVar: 'var(--danger-text)',
  },
  [RecommendationPriority.MEDIUM]: {
    label: 'Moyenne',
    mobileLabel: 'Priorité moyenne',
    pastelVar: 'var(--warning-pastel)',
    textVar: 'var(--warning-text)',
  },
  [RecommendationPriority.LOW]: {
    label: 'Conseil',
    mobileLabel: 'Conseil',
    pastelVar: 'var(--brand-pastel)',
    textVar: 'var(--brand)',
  },
};

@Component({
  selector: 'ui-result-recommendation',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <aside class="reco">
      <span class="t-label reco__heading">Recommandation</span>
      <p class="reco__text">{{ recommendation().label }}</p>
      <span
        class="reco__badge"
        [style.background]="badge().pastelVar"
        [style.color]="badge().textVar"
        >{{ badge().label }}</span
      >
      <span class="reco__priority">{{ badge().mobileLabel }}</span>
      <ui-icon class="reco__arrow" [img]="arrowIcon" [size]="16" />
    </aside>
  `,
  styles: `
    :host {
      display: block;
    }
    .reco {
      display: flex;
      align-items: center;
      gap: 16px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius-panel);
      box-shadow: var(--shadow-card);
      padding: 20px 32px;
    }
    .reco__text {
      flex: 1;
      margin: 0;
      font: 600 14px/20px var(--font-ui);
      color: var(--ink);
    }
    .reco__badge {
      display: inline-flex;
      padding: 5px 10px;
      border-radius: var(--radius-badge);
      font: 600 11px/14px var(--font-ui);
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .reco__priority {
      display: none;
    }
    .reco__arrow {
      color: var(--label);
    }
    @media (max-width: 767px) {
      .reco {
        position: relative;
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
        background: var(--surface-muted);
        box-shadow: none;
        padding: 16px 44px 16px 16px;
      }
      .reco__heading {
        display: none;
      }
      .reco__badge {
        display: none;
      }
      .reco__priority {
        display: block;
        font: 600 12px/16px var(--font-ui);
        color: var(--brand);
      }
      .reco__arrow {
        position: absolute;
        right: 16px;
        top: 50%;
        transform: translateY(-50%);
      }
    }
  `,
})
export class ResultRecommendation {
  readonly recommendation = input.required<TrainingRecommendation>();

  protected readonly arrowIcon = ArrowRight;

  protected readonly badge = computed(
    () => PRIORITY_BADGES[this.recommendation().priority],
  );
}
