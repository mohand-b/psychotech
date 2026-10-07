import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { EvolutionPointDto } from '@psychotech/shared';
import { resolveFullSessionVerdictColor } from '../../../shared/ui/verdict-appearance';
import { formatNumericDayMonth } from '../../../shared/util/format-day-month-year';
import { formatFrenchDecimal } from '../../../shared/util/format-number';
import { countDaysSince } from '../../../shared/util/format-session-date';

const VIEW_WIDTH = 460;
const VIEW_HEIGHT = 250;
const PLOT_TOP = 12;
const PLOT_BOTTOM = 238;
const DOMAIN_STEP = 10;

interface ChartDot {
  sessionId: string;
  xRatio: number;
  yRatio: number;
  colorVar: string;
  last: boolean;
  title: string;
}

interface ChartTick {
  value: number;
  yRatio: number;
}

@Component({
  selector: 'ui-evolution-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (tick of ticks(); track tick.value) {
      <span class="chart__tick t-mono" [style.--y]="tick.yRatio">{{
        tick.value
      }}</span>
    }
    @if (firstDateLabel(); as first) {
      <span class="chart__date chart__date--start">{{ first }}</span>
    }
    @if (lastDateLabel(); as last) {
      <span class="chart__date chart__date--end">{{ last }}</span>
    }
    @if (lastValue(); as value) {
      <span class="chart__value t-mono" [style.--y]="value.yRatio">{{
        value.label
      }}</span>
    }
    <svg
      class="chart__plot"
      [attr.viewBox]="viewBox"
      preserveAspectRatio="none"
      role="img"
      aria-label="Évolution du score global"
    >
      <line
        class="chart__grid"
        x1="0"
        [attr.y1]="plotTop"
        [attr.x2]="viewWidth"
        [attr.y2]="plotTop"
        vector-effect="non-scaling-stroke"
      />
      <line
        class="chart__grid"
        x1="0"
        [attr.y1]="plotBottom"
        [attr.x2]="viewWidth"
        [attr.y2]="plotBottom"
        vector-effect="non-scaling-stroke"
      />
      <line
        class="chart__threshold"
        x1="0"
        [attr.y1]="thresholdY()"
        [attr.x2]="viewWidth"
        [attr.y2]="thresholdY()"
        vector-effect="non-scaling-stroke"
      />
      @if (linePoints(); as line) {
        <polyline
          class="chart__line"
          [attr.points]="line"
          vector-effect="non-scaling-stroke"
        />
      }
    </svg>
    @for (dot of dots(); track dot.sessionId) {
      <button
        type="button"
        class="chart__dot"
        [class.chart__dot--last]="dot.last"
        [style.--x]="dot.xRatio"
        [style.--y]="dot.yRatio"
        [style.--dot-color]="dot.colorVar"
        [attr.aria-label]="dot.title"
        [title]="dot.title"
        (click)="pointSelected.emit(dot.sessionId)"
      ></button>
    }
  `,
  styles: `
    :host {
      --chart-gutter: 30px;
      --chart-date-band: 18px;
      --chart-tick-offset: 6px;
      --chart-value-offset: 22px;
      position: relative;
      display: block;
      min-height: 214px;
    }
    .chart__plot {
      position: absolute;
      top: 0;
      left: var(--chart-gutter);
      display: block;
      width: calc(100% - var(--chart-gutter));
      height: calc(100% - var(--chart-date-band));
      overflow: visible;
    }
    .chart__grid {
      stroke: var(--divider-soft);
      stroke-width: 1;
    }
    .chart__threshold {
      stroke: var(--ink);
      stroke-width: 1.5;
      stroke-dasharray: 6 6;
      opacity: 0.5;
    }
    .chart__line {
      fill: none;
      stroke: var(--brand);
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .chart__tick {
      position: absolute;
      left: 0;
      top: calc(
        (100% - var(--chart-date-band)) * var(--y) - var(--chart-tick-offset)
      );
      font-size: 11px;
      line-height: 1;
      color: var(--label);
    }
    .chart__date {
      position: absolute;
      bottom: 0;
      font: 400 11px/1 var(--font-ui);
      color: var(--label);
    }
    .chart__date--start {
      left: var(--chart-gutter);
    }
    .chart__date--end {
      right: 0;
    }
    .chart__value {
      position: absolute;
      right: 0;
      top: calc(
        (100% - var(--chart-date-band)) * var(--y) - var(--chart-value-offset)
      );
      font-size: 12px;
      font-weight: 600;
      line-height: 1;
      color: var(--ink);
    }
    .chart__dot {
      position: absolute;
      left: calc(var(--chart-gutter) + (100% - var(--chart-gutter)) * var(--x));
      top: calc((100% - var(--chart-date-band)) * var(--y));
      width: 8px;
      height: 8px;
      padding: 0;
      translate: -50% -50%;
      border: 1.5px solid var(--card);
      border-radius: var(--radius-pill);
      background: var(--dot-color);
      cursor: pointer;
    }
    .chart__dot::before {
      content: '';
      position: absolute;
      inset: -8px;
      border-radius: var(--radius-pill);
    }
    .chart__dot--last {
      width: 11px;
      height: 11px;
      border-width: 2px;
    }
    @media (max-width: 767px) {
      :host {
        --chart-gutter: 28px;
        --chart-tick-offset: 5px;
        min-height: 0;
        height: 170px;
      }
      .chart__tick,
      .chart__date {
        font-size: 10.5px;
      }
    }
  `,
})
export class EvolutionChart {
  readonly points = input.required<EvolutionPointDto[]>();
  readonly threshold = input.required<number>();
  readonly pointSelected = output<string>();

  protected readonly viewWidth = VIEW_WIDTH;
  protected readonly viewBox = `0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`;
  protected readonly plotTop = PLOT_TOP;
  protected readonly plotBottom = PLOT_BOTTOM;

  protected readonly domain = computed(() => {
    const scores = this.points().map((point) => point.globalScore);
    const threshold = this.threshold();
    const min = scores.length ? Math.min(...scores) : threshold;
    const max = scores.length ? Math.max(...scores) : threshold;
    return {
      lo: Math.min(
        Math.floor(min / DOMAIN_STEP) * DOMAIN_STEP,
        threshold - DOMAIN_STEP,
      ),
      hi: Math.max(
        Math.ceil(max / DOMAIN_STEP) * DOMAIN_STEP,
        threshold + DOMAIN_STEP,
      ),
    };
  });

  private computeScoreY(score: number): number {
    const { lo, hi } = this.domain();
    const ratio = (hi - score) / (hi - lo);
    return PLOT_TOP + ratio * (PLOT_BOTTOM - PLOT_TOP);
  }

  private computePointXRatio(index: number): number {
    const count = this.points().length;
    return count <= 1 ? 1 : index / (count - 1);
  }

  protected readonly thresholdY = computed(() =>
    this.computeScoreY(this.threshold()),
  );

  protected readonly ticks = computed<ChartTick[]>(() => {
    const { lo, hi } = this.domain();
    return [hi, this.threshold(), lo].map((value) => ({
      value,
      yRatio: this.computeScoreY(value) / VIEW_HEIGHT,
    }));
  });

  protected readonly linePoints = computed(() => {
    const points = this.points();
    if (points.length < 2) {
      return null;
    }
    return points
      .map(
        (point, index) =>
          `${this.computePointXRatio(index) * VIEW_WIDTH},${this.computeScoreY(point.globalScore)}`,
      )
      .join(' ');
  });

  protected readonly dots = computed<ChartDot[]>(() => {
    const points = this.points();
    return points.map((point, index) => ({
      sessionId: point.sessionId,
      xRatio: this.computePointXRatio(index),
      yRatio: this.computeScoreY(point.globalScore) / VIEW_HEIGHT,
      colorVar: resolveFullSessionVerdictColor(
        point.globalScore,
        point.isEliminated,
      ),
      last: index === points.length - 1,
      title: `${formatFrenchDecimal(point.globalScore)} · ouvrir le bilan`,
    }));
  });

  protected readonly lastValue = computed(() => {
    const points = this.points();
    const last = points[points.length - 1];
    return last
      ? {
          label: formatFrenchDecimal(last.globalScore),
          yRatio: this.computeScoreY(last.globalScore) / VIEW_HEIGHT,
        }
      : null;
  });

  protected readonly firstDateLabel = computed(() => {
    const points = this.points();
    return points.length > 1 ? formatChartDate(points[0].date) : null;
  });

  protected readonly lastDateLabel = computed(() => {
    const points = this.points();
    const last = points[points.length - 1];
    return last ? formatChartDate(last.date) : null;
  });
}

function formatChartDate(iso: string): string {
  const days = countDaysSince(iso);
  if (days === 0) {
    return 'Aujourd’hui';
  }
  if (days === 1) {
    return 'Hier';
  }
  return formatNumericDayMonth(iso);
}
