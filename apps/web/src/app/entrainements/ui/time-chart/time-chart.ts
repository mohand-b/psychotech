import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { formatSecondsTenths } from '../../../shared/ui/format-duration';

export interface TimeChartEntry {
  colorVar: string;
  label: string;
  timeMs: number | null;
}

@Component({
  selector: 'ui-time-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="chart">
      <div class="chart__bars">
        @for (entry of entries(); track $index) {
          <div class="chart__slot">
            <span
              class="chart__bar"
              [class.chart__bar--unreached]="entry.timeMs === null"
              [style.height.%]="barHeight(entry)"
              [style.background]="entry.colorVar"
            ></span>
            <span class="chart__tip">{{ tooltip(entry, $index) }}</span>
          </div>
        }
      </div>
      <div class="chart__scale t-mono">
        <span>1</span>
        <span>{{ entries().length }}</span>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .chart {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .chart__bars {
      display: flex;
      align-items: flex-end;
      gap: 3px;
      height: 88px;
    }
    .chart__slot {
      position: relative;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      flex: 1;
      height: 100%;
      min-width: 0;
    }
    .chart__bar {
      display: block;
      width: 100%;
      border-radius: 2px 2px 0 0;
    }
    .chart__bar--unreached {
      height: 4px !important;
      border-radius: 2px;
    }
    .chart__tip {
      position: absolute;
      bottom: calc(100% + 6px);
      left: 50%;
      transform: translateX(-50%);
      display: none;
      padding: 5px 8px;
      border-radius: var(--radius-badge);
      background: var(--ink);
      color: var(--card);
      font: 500 11px/14px var(--font-ui);
      white-space: nowrap;
      pointer-events: none;
      z-index: 10;
    }
    @media (hover: hover) {
      .chart__slot:hover .chart__tip {
        display: block;
      }
      .chart__slot:hover .chart__bar {
        opacity: 0.8;
      }
    }
    .chart__scale {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: var(--label);
    }
  `,
})
export class TimeChart {
  readonly entries = input.required<TimeChartEntry[]>();
  readonly itemLabel = input('Item');

  private readonly maxTimeMs = computed(() =>
    Math.max(
      1,
      ...this.entries()
        .map((entry) => entry.timeMs ?? 0)
        .filter((timeMs) => timeMs > 0),
    ),
  );

  protected barHeight(entry: TimeChartEntry): number {
    if (entry.timeMs === null) {
      return 0;
    }
    return Math.max(6, (entry.timeMs / this.maxTimeMs()) * 100);
  }

  protected tooltip(entry: TimeChartEntry, index: number): string {
    const base = `${this.itemLabel()} ${index + 1} · ${entry.label}`;
    return entry.timeMs === null
      ? base
      : `${base} · ${formatSecondsTenths(entry.timeMs)}`;
  }
}
