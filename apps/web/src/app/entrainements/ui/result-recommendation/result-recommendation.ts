import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { AxisFinding, AxisType } from '@psychotech/shared';
import { Lightbulb } from 'lucide-angular';
import { AXIS_PRESENTATION } from '../../../shared/ui/axis-presentation';
import { Icon } from '../../../shared/ui/icon/icon';

@Component({
  selector: 'ui-result-recommendation',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <aside class="reco">
      <span class="t-label">Recommandations</span>
      <ul class="reco__list">
        @for (finding of findings(); track finding.id) {
          <li class="reco__item">
            <p class="reco__text">
              <span
                class="reco__marker"
                [style.background]="presentation().pastelVar"
                [style.border-color]="presentation().pastelBorderVar"
                [style.color]="presentation().textVar"
              >
                <ui-icon [img]="markerIcon" [size]="12" />
              </span>
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
    }
    .reco__marker {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      margin-right: 8px;
      border: 1px solid;
      border-radius: var(--radius-badge);
      vertical-align: -5px;
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

  protected readonly markerIcon = Lightbulb;

  protected readonly presentation = computed(
    () => AXIS_PRESENTATION[this.axis()],
  );
}
