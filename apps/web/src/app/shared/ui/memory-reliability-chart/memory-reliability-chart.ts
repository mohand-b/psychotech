import { ChangeDetectionStrategy, Component, input } from '@angular/core';

const WEAK_POSITION_THRESHOLD = 60;
const BAR_MAX_HEIGHT_PX = 156;
const BAR_MIN_HEIGHT_PX = 5;

@Component({
  selector: 'ui-memory-reliability-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="chart">
      <div class="chart__bars">
        @for (reliability of reliabilities(); track $index) {
          <div class="chart__slot">
            <span
              class="chart__value t-mono"
              [class.chart__value--weak]="isWeak(reliability)"
              >{{ reliability }} %</span
            >
            <span
              class="chart__bar"
              [class.chart__bar--weak]="isWeak(reliability)"
              [style.height.px]="barHeight(reliability)"
            ></span>
          </div>
        }
      </div>
      <div class="chart__positions">
        @for (reliability of reliabilities(); track $index) {
          <span class="chart__position t-mono">{{ $index + 1 }}</span>
        }
      </div>
      <p class="chart__axis">Position dans la séquence</p>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .chart {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .chart__bars {
      display: flex;
      align-items: flex-end;
      gap: 12px;
      height: 180px;
    }
    .chart__slot {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      gap: 4px;
      flex: 1;
      min-width: 0;
    }
    .chart__value {
      font-size: 11px;
      font-weight: 600;
      color: var(--axis-memory-text);
      white-space: nowrap;
    }
    .chart__value--weak {
      color: var(--danger-text);
    }
    .chart__bar {
      display: block;
      width: 100%;
      max-width: 44px;
      background: var(--axis-memory);
      border-radius: 6px 6px 2px 2px;
    }
    .chart__bar--weak {
      background: var(--danger);
    }
    .chart__positions {
      display: flex;
      gap: 12px;
    }
    .chart__position {
      flex: 1;
      text-align: center;
      font-size: 11px;
      color: var(--label);
    }
    .chart__axis {
      margin: 0;
      text-align: center;
      font: 400 12px/16px var(--font-ui);
      color: var(--label);
    }
  `,
})
export class MemoryReliabilityChart {
  readonly reliabilities = input.required<number[]>();

  protected isWeak(reliability: number): boolean {
    return reliability < WEAK_POSITION_THRESHOLD;
  }

  protected barHeight(reliability: number): number {
    return Math.max(BAR_MIN_HEIGHT_PX, (reliability / 100) * BAR_MAX_HEIGHT_PX);
  }
}
