import {
  ChangeDetectionStrategy,
  Component,
  input,
} from '@angular/core';

export interface ResultMetricRow {
  label: string;
  value: string;
  suffix?: string;
  dotVar?: string;
}

@Component({
  selector: 'ui-result-metrics',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="t-label">Métriques</span>
    <ul class="metrics">
      @for (row of rows(); track row.label) {
        <li class="metrics__row">
          @if (row.dotVar) {
            <span class="metrics__dot" [style.background]="row.dotVar"></span>
          }
          <span class="metrics__label">{{ row.label }}</span>
          <span class="metrics__value">
            <span class="metrics__number t-mono">{{ row.value }}</span>
            @if (row.suffix) {
              <span class="metrics__suffix t-mono">{{ row.suffix }}</span>
            }
          </span>
        </li>
      }
    </ul>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-width: 0;
    }
    .metrics {
      margin: 0;
      padding: 0;
      list-style: none;
      display: flex;
      flex-direction: column;
    }
    .metrics__row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 0;
      border-bottom: 1px solid var(--divider-soft);
    }
    .metrics__row:last-child {
      border-bottom: none;
    }
    .metrics__dot {
      width: 9px;
      height: 9px;
      border-radius: var(--radius-pill);
      flex-shrink: 0;
    }
    .metrics__label {
      flex: 1;
      font: 400 14px/20px var(--font-ui);
      color: var(--ink);
    }
    .metrics__value {
      display: inline-flex;
      align-items: baseline;
      gap: 1px;
    }
    .metrics__number {
      font-size: 14px;
      font-weight: 600;
      color: var(--ink);
    }
    .metrics__suffix {
      font-size: 11px;
      font-weight: 500;
      color: var(--label);
    }
    @media (max-width: 767px) {
      :host {
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: var(--radius-panel);
        box-shadow: var(--shadow-card);
        padding: 20px;
      }
    }
  `,
})
export class ResultMetrics {
  readonly rows = input.required<ResultMetricRow[]>();
}
