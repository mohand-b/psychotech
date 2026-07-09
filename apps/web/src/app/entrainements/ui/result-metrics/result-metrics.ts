import {
  ChangeDetectionStrategy,
  Component,
  input,
} from '@angular/core';

export type ResultMetricMarker = 'square' | 'dot' | 'outlined-dot' | 'cross';

export interface ResultMetricRow {
  label: string;
  sublabel?: string;
  value: string;
  suffix?: string;
  dotVar?: string;
  marker?: ResultMetricMarker;
}

@Component({
  selector: 'ui-result-metrics',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="t-label">Métriques</span>
    <ul class="metrics">
      @for (row of rows(); track row.label) {
        <li class="metrics__row">
          @if (row.dotVar; as dotVar) {
            @if (row.marker === 'cross') {
              <span class="metrics__cross" [style.color]="dotVar">×</span>
            } @else if (row.marker === 'outlined-dot') {
              <span
                class="metrics__dot metrics__dot--round metrics__dot--outlined"
                [style.border-color]="dotVar"
              ></span>
            } @else if (row.marker === 'dot') {
              <span
                class="metrics__dot metrics__dot--round"
                [style.background]="dotVar"
              ></span>
            } @else {
              <span class="metrics__dot" [style.background]="dotVar"></span>
            }
          }
          <span class="metrics__label">
            {{ row.label }}
            @if (row.sublabel) {
              <span class="metrics__sublabel">{{ row.sublabel }}</span>
            }
          </span>
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
      width: 10px;
      height: 10px;
      border-radius: 3px;
      flex-shrink: 0;
    }
    .metrics__dot--round {
      border-radius: var(--radius-pill);
    }
    .metrics__dot--outlined {
      background: var(--card);
      border: 1.5px solid;
    }
    .metrics__cross {
      flex-shrink: 0;
      width: 10px;
      text-align: center;
      font: 600 13px/1 var(--font-ui);
    }
    .metrics__label {
      display: flex;
      flex-direction: column;
      flex: 1;
      font: 400 14px/20px var(--font-ui);
      color: var(--ink);
    }
    .metrics__sublabel {
      font: 400 11px/14px var(--font-ui);
      color: var(--label);
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
      white-space: pre;
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
