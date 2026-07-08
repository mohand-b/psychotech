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
  template: `
    <aside class="reco">
      <div class="reco__head">
        <span class="t-label">Recommandation</span>
        <span
          class="reco__badge"
          [style.background]="badge().pastelVar"
          [style.color]="badge().textVar"
          >{{ badge().label }}</span
        >
      </div>
      <p class="reco__text">{{ recommendation().label }}</p>
      <span class="reco__priority">{{ badge().mobileLabel }}</span>
    </aside>
  `,
  styles: `
    :host {
      display: block;
    }
    .reco {
      display: flex;
      flex-direction: column;
      gap: 10px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius-panel);
      box-shadow: var(--shadow-card);
      padding: 20px 32px;
    }
    .reco__head {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .reco__text {
      margin: 0;
      font: 600 14px/20px var(--font-ui);
      color: var(--ink);
    }
    .reco__badge {
      display: inline-flex;
      padding: 4px 10px;
      border-radius: var(--radius-badge);
      font: 600 11px/14px var(--font-ui);
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .reco__priority {
      display: none;
    }
    @media (max-width: 767px) {
      .reco {
        gap: 4px;
        background: var(--surface-muted);
        box-shadow: none;
        padding: 16px;
      }
      .reco__head {
        display: none;
      }
      .reco__priority {
        display: block;
        font: 600 12px/16px var(--font-ui);
        color: var(--brand);
      }
    }
  `,
})
export class ResultRecommendation {
  readonly recommendation = input.required<TrainingRecommendation>();

  protected readonly badge = computed(
    () => PRIORITY_BADGES[this.recommendation().priority],
  );
}
