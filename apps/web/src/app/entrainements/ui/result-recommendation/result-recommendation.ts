import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { AxisFinding, AxisType } from '@psychotech/shared';
import { AXIS_PRESENTATION } from '../../../shared/ui/axis-presentation';

@Component({
  selector: 'ui-result-recommendation',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="reco">
      <span class="t-label">Recommandations</span>
      <ul class="reco__list">
        @for (finding of findings(); track finding.id) {
          <li class="reco__item">
            <span class="reco__bullet" [style.background]="bulletVar()"></span>
            <p class="reco__text">
              {{ finding.finding }}.
              <span class="reco__action">{{ finding.recommendation }}</span>
            </p>
          </li>
        }
      </ul>
    </aside>
  `,
  styles: `
    :host {
      display: block;
    }
    .reco {
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius-panel);
      box-shadow: var(--shadow-card);
      padding: 20px 32px;
    }
    .reco__list {
      margin: 0;
      padding: 0;
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .reco__item {
      display: flex;
      gap: 10px;
    }
    .reco__bullet {
      flex-shrink: 0;
      width: 6px;
      height: 6px;
      border-radius: var(--radius-pill);
      transform: translateY(7px);
    }
    .reco__text {
      margin: 0;
      font: 400 14px/20px var(--font-ui);
      color: var(--ink);
    }
    .reco__action {
      font-weight: 600;
    }
    @media (max-width: 767px) {
      .reco {
        gap: 8px;
        background: var(--surface-muted);
        box-shadow: none;
        padding: 16px;
      }
    }
  `,
})
export class ResultRecommendation {
  readonly axis = input.required<AxisType>();
  readonly findings = input.required<AxisFinding[]>();

  protected readonly bulletVar = computed(
    () => AXIS_PRESENTATION[this.axis()].plainVar,
  );
}
