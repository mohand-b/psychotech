import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { MotorSkillsMetrics } from '@psychotech/shared';
import { formatDuration } from '../../../shared/ui/format-duration';
import {
  TrajectoryExitBand,
  clampDeviation,
  curveExitRuns,
  interpolateDeviationAt,
  smoothTimelinePoints,
  trajectoryExitBands,
  trajectoryExitWindows,
} from './trajectory-chart.logic';

const Y_DOMAIN_PCT = 120;
const BORDER_PCT = 100;

interface ChartCoord {
  x: number;
  y: number;
  tMs: number;
}

interface ContactConnector {
  xPct: number;
  bottomPct: number;
  heightPct: number;
}

interface CourseZone {
  label: string;
  leftPct: number;
  widthPct: number;
  tinted: boolean;
}

interface ContactDot {
  xPct: number;
  tooltip: string;
}

function bezierPath(coords: ChartCoord[]): string {
  if (coords.length < 2) {
    return '';
  }
  let path = `M ${coords[0].x.toFixed(2)} ${coords[0].y.toFixed(2)}`;
  for (let position = 1; position < coords.length; position += 1) {
    const previous = coords[position - 1];
    const current = coords[position];
    const controlX = ((previous.x + current.x) / 2).toFixed(2);
    path += ` C ${controlX} ${previous.y.toFixed(2)}, ${controlX} ${current.y.toFixed(2)}, ${current.x.toFixed(2)} ${current.y.toFixed(2)}`;
  }
  return path;
}

@Component({
  selector: 'ui-motricity-trajectory-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './motricity-trajectory-chart.html',
  styleUrl: './motricity-trajectory-chart.css',
})
export class MotricityTrajectoryChart {
  readonly metrics = input.required<MotorSkillsMetrics>();

  private readonly courseOffsets = computed(() => {
    const offsets = new Map<number, number>();
    let elapsed = 0;
    for (const course of this.metrics().courses) {
      offsets.set(course.index, elapsed);
      elapsed += course.tReelMs;
    }
    return offsets;
  });

  private readonly totalMs = computed(() =>
    Math.max(1, this.metrics().totalTimeMs),
  );

  protected readonly borderBottomPct = (BORDER_PCT / Y_DOMAIN_PCT) * 100;

  protected readonly zones = computed<CourseZone[]>(() => {
    const totalMs = this.totalMs();
    let leftPct = 0;
    return this.metrics().courses.map((course, position) => {
      const widthPct = (course.tReelMs / totalMs) * 100;
      const zone: CourseZone = {
        label: `Parcours ${course.index + 1}`,
        leftPct,
        widthPct,
        tinted: position % 2 === 1,
      };
      leftPct += widthPct;
      return zone;
    });
  });

  private readonly smoothedByCourse = computed(
    () =>
      new Map(
        this.metrics().timeline.map((series) => [
          series.courseIndex,
          smoothTimelinePoints(series.points),
        ]),
      ),
  );

  private readonly coords = computed<ChartCoord[]>(() => {
    const offsets = this.courseOffsets();
    const totalMs = this.totalMs();
    const coords: ChartCoord[] = [];
    for (const series of this.metrics().timeline) {
      const offset = offsets.get(series.courseIndex) ?? 0;
      const smoothed = this.smoothedByCourse().get(series.courseIndex) ?? [];
      for (const point of smoothed) {
        const clamped = clampDeviation(point.deviationPct);
        coords.push({
          x: ((offset + point.tMs) / totalMs) * 100,
          y: 100 - (clamped / Y_DOMAIN_PCT) * 100,
          tMs: offset + point.tMs,
        });
      }
    }
    return coords;
  });

  protected readonly curvePath = computed(() => bezierPath(this.coords()));

  protected readonly exitCurvePaths = computed<string[]>(() => {
    const coords = this.coords();
    const windows = trajectoryExitWindows(
      this.metrics().events,
      this.metrics().courses,
    );
    return curveExitRuns(
      coords.map((coord) => coord.tMs),
      windows,
    )
      .map((run) => bezierPath(coords.slice(run.from, run.to + 1)))
      .filter((path) => path !== '');
  });

  protected readonly exitBands = computed<TrajectoryExitBand[]>(() =>
    trajectoryExitBands(
      this.metrics().events,
      this.metrics().courses,
      this.totalMs(),
    ),
  );

  protected readonly contactConnectors = computed<ContactConnector[]>(() => {
    const offsets = this.courseOffsets();
    const totalMs = this.totalMs();
    const borderBottom = this.borderBottomPct;
    return this.metrics()
      .events.filter((event) => event.type === 'CONTACT')
      .map((event) => {
        const smoothed = this.smoothedByCourse().get(event.courseIndex) ?? [];
        const deviation = clampDeviation(
          interpolateDeviationAt(smoothed, event.tMs),
        );
        const curveBottom = (deviation / Y_DOMAIN_PCT) * 100;
        const atMs = (offsets.get(event.courseIndex) ?? 0) + event.tMs;
        return {
          xPct: (atMs / totalMs) * 100,
          bottomPct: Math.min(borderBottom, curveBottom),
          heightPct: Math.abs(borderBottom - curveBottom),
        };
      });
  });

  protected readonly contacts = computed<ContactDot[]>(() => {
    const offsets = this.courseOffsets();
    const totalMs = this.totalMs();
    return this.metrics()
      .events.filter((event) => event.type === 'CONTACT')
      .map((event) => {
        const atMs = (offsets.get(event.courseIndex) ?? 0) + event.tMs;
        return {
          xPct: (atMs / totalMs) * 100,
          tooltip: `${formatDuration(Math.round(atMs / 1000))} · Contact bord`,
        };
      });
  });

  protected readonly xLabels = computed(() => {
    const totalSec = Math.round(this.totalMs() / 1000);
    return [0, Math.round(totalSec / 2), totalSec].map(formatDuration);
  });

  protected yTickBottom(valuePct: number): number {
    return (valuePct / Y_DOMAIN_PCT) * 100;
  }
}
