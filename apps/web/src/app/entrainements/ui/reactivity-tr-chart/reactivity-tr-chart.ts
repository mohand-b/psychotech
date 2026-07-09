import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import {
  AXIS_TRAINING,
  AxisType,
  ReactivityClassification,
  ReactivityStimulusPoint,
  ReactivityTrendPoint,
} from '@psychotech/shared';
import { formatDuration } from '../../../shared/ui/format-duration';

const Y_MIN_DOMAIN_MS = 650;
const Y_HEADROOM_MS = 60;
const ANTICIPATION_FLOOR_PCT = 5;

const CLASSIFICATION_LABELS: Record<ReactivityClassification, string> = {
  VALID: 'Valide',
  ANTICIPATION: 'Trop tôt',
  OMISSION: 'Signal manqué',
  WRONG_COMMAND: 'Mauvaise commande',
};

interface ChartDot {
  classification: ReactivityClassification;
  xPct: number;
  bottomPct: number;
  tooltip: string;
}

@Component({
  selector: 'ui-reactivity-tr-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reactivity-tr-chart.html',
  styleUrl: './reactivity-tr-chart.css',
})
export class ReactivityTrChart {
  readonly points = input.required<ReactivityStimulusPoint[]>();
  readonly trend = input.required<ReactivityTrendPoint[]>();
  readonly meanMs = input.required<number | null>();

  private readonly totalMs =
    AXIS_TRAINING[AxisType.REACTIVITY].timer.durationSec * 1000;
  protected readonly xLabels = [0, 60, 120, 180].map((seconds) =>
    formatDuration(seconds),
  );

  private readonly yMax = computed(() => {
    const maxTr = Math.max(
      0,
      ...this.points()
        .map(({ trMs }) => trMs ?? 0)
        .filter((trMs) => trMs > 0),
    );
    return Math.max(Y_MIN_DOMAIN_MS, maxTr + Y_HEADROOM_MS);
  });

  protected yPct(valueMs: number): number {
    return Math.min(100, (valueMs / this.yMax()) * 100);
  }

  protected readonly meanBottomPct = computed(() => {
    const mean = this.meanMs();
    return mean === null ? null : this.yPct(mean);
  });

  protected readonly dots = computed<ChartDot[]>(() =>
    this.points().map((point) => {
      const xPct = (point.appearAtMs / this.totalMs) * 100;
      const time = formatDuration(Math.round(point.appearAtMs / 1000));
      const label = CLASSIFICATION_LABELS[point.classification];
      const bottomPct =
        point.classification === 'OMISSION'
          ? 0
          : point.classification === 'ANTICIPATION'
            ? ANTICIPATION_FLOOR_PCT
            : this.yPct(point.trMs ?? 0);
      const tooltip =
        point.trMs === null
          ? `${time} · ${label}`
          : `${time} · ${label} · ${point.trMs} ms`;
      return { classification: point.classification, xPct, bottomPct, tooltip };
    }),
  );

  protected readonly trendPath = computed(() => {
    const trend = this.trend();
    if (trend.length < 2) {
      return '';
    }
    const coords = trend.map(({ appearAtMs, trMs }) => ({
      x: (appearAtMs / this.totalMs) * 100,
      y: 100 - this.yPct(trMs),
    }));
    let path = `M ${coords[0].x.toFixed(2)} ${coords[0].y.toFixed(2)}`;
    for (let position = 1; position < coords.length; position += 1) {
      const previous = coords[position - 1];
      const current = coords[position];
      const controlX = ((previous.x + current.x) / 2).toFixed(2);
      path += ` C ${controlX} ${previous.y.toFixed(2)}, ${controlX} ${current.y.toFixed(2)}, ${current.x.toFixed(2)} ${current.y.toFixed(2)}`;
    }
    return path;
  });
}
