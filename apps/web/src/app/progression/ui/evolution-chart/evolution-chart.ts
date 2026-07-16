import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { EvolutionPointDto } from '@psychotech/shared';
import { BAND_COLOR_VARS } from '../../../shared/ui/score-rating';

interface ChartGeometry {
  viewWidth: number;
  viewHeight: number;
  left: number;
  right: number;
  topY: number;
  bottomY: number;
  yLabelX: number;
  yLabelFont: number;
  dateY: number;
  dateFont: number;
  valueFont: number;
  pointRadius: number;
  lastPointRadius: number;
  lastPointStroke: number;
  thresholdWidth: number;
  thresholdDash: string;
  showFirstValue: boolean;
}

const DESKTOP_GEOMETRY: ChartGeometry = {
  viewWidth: 1100,
  viewHeight: 270,
  left: 40,
  right: 1060,
  topY: 38,
  bottomY: 222,
  yLabelX: 30,
  yLabelFont: 11,
  dateY: 252,
  dateFont: 11,
  valueFont: 12,
  pointRadius: 4,
  lastPointRadius: 5.5,
  lastPointStroke: 2,
  thresholdWidth: 1.5,
  thresholdDash: '6 6',
  showFirstValue: true,
};

const COMPACT_GEOMETRY: ChartGeometry = {
  viewWidth: 340,
  viewHeight: 170,
  left: 26,
  right: 330,
  topY: 24,
  bottomY: 138,
  yLabelX: 20,
  yLabelFont: 9,
  dateY: 158,
  dateFont: 9.5,
  valueFont: 10,
  pointRadius: 3.5,
  lastPointRadius: 4.5,
  lastPointStroke: 2,
  thresholdWidth: 1.2,
  thresholdDash: '5 5',
  showFirstValue: false,
};

interface ChartDot {
  sessionId: string;
  x: number;
  y: number;
  colorVar: string;
  radius: number;
  strokeWidth: number;
  title: string;
}

interface ChartValueLabel {
  x: number;
  y: number;
  text: string;
  muted: boolean;
}

function formatGlobalScore(value: number): string {
  return value.toLocaleString('fr-FR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

@Component({
  selector: 'ui-evolution-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      class="chart"
      [attr.viewBox]="'0 0 ' + g.viewWidth + ' ' + g.viewHeight"
      role="img"
      aria-label="Évolution du score global"
    >
      <line
        class="chart__grid"
        [attr.x1]="g.left"
        [attr.y1]="g.topY"
        [attr.x2]="g.right"
        [attr.y2]="g.topY"
      />
      <line
        class="chart__grid"
        [attr.x1]="g.left"
        [attr.y1]="g.bottomY"
        [attr.x2]="g.right"
        [attr.y2]="g.bottomY"
      />
      <text
        class="chart__y-label"
        [attr.x]="g.yLabelX"
        [attr.y]="g.topY + 4"
        [attr.font-size]="g.yLabelFont"
        text-anchor="end"
      >
        {{ domain().hi }}
      </text>
      <text
        class="chart__y-label"
        [attr.x]="g.yLabelX"
        [attr.y]="thresholdY() + 4"
        [attr.font-size]="g.yLabelFont"
        text-anchor="end"
      >
        {{ threshold() }}
      </text>
      <text
        class="chart__y-label"
        [attr.x]="g.yLabelX"
        [attr.y]="g.bottomY + 4"
        [attr.font-size]="g.yLabelFont"
        text-anchor="end"
      >
        {{ domain().lo }}
      </text>
      <line
        class="chart__threshold"
        [attr.x1]="g.left"
        [attr.y1]="thresholdY()"
        [attr.x2]="g.right"
        [attr.y2]="thresholdY()"
        [attr.stroke-width]="g.thresholdWidth"
        [attr.stroke-dasharray]="g.thresholdDash"
      />
      @if (linePoints(); as line) {
        <polyline class="chart__line" [attr.points]="line" />
      }
      @for (dot of dots(); track dot.sessionId) {
        <circle
          class="chart__dot"
          [attr.cx]="dot.x"
          [attr.cy]="dot.y"
          [attr.r]="dot.radius"
          [attr.fill]="dot.colorVar"
          [attr.stroke-width]="dot.strokeWidth"
          (click)="pointSelected.emit(dot.sessionId)"
        >
          <title>{{ dot.title }}</title>
        </circle>
      }
      @for (label of valueLabels(); track label.text + label.x) {
        <text
          class="chart__value"
          [class.chart__value--muted]="label.muted"
          [attr.x]="label.x"
          [attr.y]="label.y"
          [attr.font-size]="g.valueFont"
          text-anchor="middle"
        >
          {{ label.text }}
        </text>
      }
      @if (firstDateLabel(); as first) {
        <text
          class="chart__date"
          [attr.x]="g.left"
          [attr.y]="g.dateY"
          [attr.font-size]="g.dateFont"
          [attr.text-anchor]="compact() ? 'start' : 'middle'"
        >
          {{ first }}
        </text>
      }
      @if (lastDateLabel(); as last) {
        <text
          class="chart__date"
          [attr.x]="g.right"
          [attr.y]="g.dateY"
          [attr.font-size]="g.dateFont"
          [attr.text-anchor]="compact() ? 'end' : 'middle'"
        >
          {{ last }}
        </text>
      }
    </svg>
  `,
  styles: `
    :host {
      display: block;
    }
    .chart {
      display: block;
      width: 100%;
      height: auto;
      overflow: visible;
    }
    .chart__grid {
      stroke: var(--divider-soft);
      stroke-width: 1;
    }
    .chart__y-label {
      font-family: var(--font-mono);
      fill: var(--label);
    }
    .chart__threshold {
      stroke: var(--ink);
      opacity: 0.55;
    }
    .chart__line {
      fill: none;
      stroke: var(--brand);
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .chart__dot {
      stroke: var(--card);
      cursor: pointer;
    }
    .chart__value {
      font-family: var(--font-mono);
      font-weight: 600;
      fill: var(--ink);
    }
    .chart__value--muted {
      font-weight: 400;
      fill: var(--label);
    }
    .chart__date {
      font-family: var(--font-ui);
      fill: var(--label);
    }
  `,
})
export class EvolutionChart {
  readonly points = input.required<EvolutionPointDto[]>();
  readonly threshold = input.required<number>();
  readonly compact = input(false);
  readonly pointSelected = output<string>();

  protected get g(): ChartGeometry {
    return this.compact() ? COMPACT_GEOMETRY : DESKTOP_GEOMETRY;
  }

  protected readonly domain = computed(() => {
    const scores = this.points().map((point) => point.globalScore);
    const min = scores.length ? Math.min(...scores) : this.threshold();
    const max = scores.length ? Math.max(...scores) : this.threshold();
    return {
      lo: Math.min(Math.floor(min / 10) * 10, this.threshold() - 10),
      hi: Math.max(Math.ceil(max / 10) * 10, this.threshold() + 10),
    };
  });

  private yFor(score: number): number {
    const { lo, hi } = this.domain();
    const geometry = this.g;
    const ratio = (hi - score) / (hi - lo);
    return (
      Math.round(
        (geometry.topY + ratio * (geometry.bottomY - geometry.topY)) * 10,
      ) / 10
    );
  }

  private xFor(index: number): number {
    const geometry = this.g;
    const count = this.points().length;
    if (count <= 1) {
      return geometry.right;
    }
    return (
      Math.round(
        (geometry.left +
          (index * (geometry.right - geometry.left)) / (count - 1)) *
          10,
      ) / 10
    );
  }

  protected readonly thresholdY = computed(() => this.yFor(this.threshold()));

  protected readonly linePoints = computed(() => {
    const points = this.points();
    if (points.length < 2) {
      return null;
    }
    return points
      .map(
        (point, index) => `${this.xFor(index)},${this.yFor(point.globalScore)}`,
      )
      .join(' ');
  });

  protected readonly dots = computed<ChartDot[]>(() => {
    const geometry = this.g;
    const points = this.points();
    return points.map((point, index) => {
      const last = index === points.length - 1;
      return {
        sessionId: point.sessionId,
        x: this.xFor(index),
        y: this.yFor(point.globalScore),
        colorVar: BAND_COLOR_VARS[point.band],
        radius: last ? geometry.lastPointRadius : geometry.pointRadius,
        strokeWidth: last ? geometry.lastPointStroke : 1.5,
        title: `${formatGlobalScore(point.globalScore)} · ouvrir le bilan`,
      };
    });
  });

  protected readonly valueLabels = computed<ChartValueLabel[]>(() => {
    const points = this.points();
    if (points.length === 0) {
      return [];
    }
    const labels: ChartValueLabel[] = [];
    const lastIndex = points.length - 1;
    const maxIndex = points.reduce(
      (best, point, index) =>
        point.globalScore > points[best].globalScore ? index : best,
      0,
    );
    if (maxIndex !== lastIndex) {
      labels.push({
        x: this.xFor(maxIndex),
        y: this.yFor(points[maxIndex].globalScore) - 15,
        text: formatGlobalScore(points[maxIndex].globalScore),
        muted: false,
      });
    }
    labels.push({
      x: this.xFor(lastIndex),
      y: this.yFor(points[lastIndex].globalScore) - 15,
      text: formatGlobalScore(points[lastIndex].globalScore),
      muted: false,
    });
    if (this.g.showFirstValue && points.length > 1 && maxIndex !== 0) {
      labels.push({
        x: this.xFor(0),
        y: this.yFor(points[0].globalScore) + 22,
        text: formatGlobalScore(points[0].globalScore),
        muted: true,
      });
    }
    return labels;
  });

  protected readonly firstDateLabel = computed(() => {
    const first = this.points()[0];
    return first && this.points().length > 1
      ? formatChartDate(first.date)
      : null;
  });

  protected readonly lastDateLabel = computed(() => {
    const points = this.points();
    const last = points[points.length - 1];
    return last ? formatChartDate(last.date) : null;
  });
}

function formatChartDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const dayMs = 86_400_000;
  const startOfDay = (value: Date) =>
    new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const diff = Math.round((startOfDay(now) - startOfDay(date)) / dayMs);
  if (diff === 0) {
    return "Aujourd'hui";
  }
  if (diff === 1) {
    return 'Hier';
  }
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}
