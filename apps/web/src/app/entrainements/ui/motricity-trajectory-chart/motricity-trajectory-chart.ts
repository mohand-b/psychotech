import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { MotorSkillsMetrics } from '@psychotech/shared';
import { formatDuration } from '../../../shared/ui/format-duration';
import {
  CurvePoint,
  TrajectoryExitBand,
  TrajectoryExitWindow,
  buildDisplaySeries,
  courseContactTimes,
  courseExitWindows,
  curveExitRuns,
  monotoneCubicPath,
  trajectoryExitBands,
} from './trajectory-chart.logic';

const Y_DOMAIN_PCT = 120;
const BORDER_PCT = 100;

interface ChartCoord extends CurvePoint {
  tMs: number;
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

  private readonly mergedContactsByCourse = computed(
    () =>
      new Map(
        this.metrics().timeline.map((series) => [
          series.courseIndex,
          courseContactTimes(this.metrics().events, series.courseIndex),
        ]),
      ),
  );

  private readonly mergedWindowsByCourse = computed(
    () =>
      new Map(
        this.metrics().timeline.map((series) => [
          series.courseIndex,
          courseExitWindows(this.metrics().events, series.courseIndex),
        ]),
      ),
  );

  private readonly concatenatedWindows = computed<TrajectoryExitWindow[]>(() => {
    const offsets = this.courseOffsets();
    const windows: TrajectoryExitWindow[] = [];
    for (const series of this.metrics().timeline) {
      const offset = offsets.get(series.courseIndex) ?? 0;
      for (const window of this.mergedWindowsByCourse().get(
        series.courseIndex,
      ) ?? []) {
        windows.push({
          startMs: offset + window.startMs,
          endMs: offset + window.endMs,
        });
      }
    }
    return windows;
  });

  private readonly coords = computed<ChartCoord[]>(() => {
    const offsets = this.courseOffsets();
    const totalMs = this.totalMs();
    const coords: ChartCoord[] = [];
    for (const series of this.metrics().timeline) {
      const offset = offsets.get(series.courseIndex) ?? 0;
      const contacts =
        this.mergedContactsByCourse().get(series.courseIndex) ?? [];
      const windows =
        this.mergedWindowsByCourse().get(series.courseIndex) ?? [];
      for (const point of buildDisplaySeries(
        series.points,
        contacts,
        windows,
        totalMs,
      )) {
        coords.push({
          x: ((offset + point.tMs) / totalMs) * 100,
          y: 100 - (point.deviationPct / Y_DOMAIN_PCT) * 100,
          tMs: offset + point.tMs,
        });
      }
    }
    return coords;
  });

  protected readonly curvePath = computed(() =>
    monotoneCubicPath(this.coords()),
  );

  protected readonly exitCurvePaths = computed<string[]>(() => {
    const coords = this.coords();
    return curveExitRuns(
      coords.map((coord) => coord.tMs),
      this.concatenatedWindows(),
    )
      .map((run) => monotoneCubicPath(coords.slice(run.from, run.to + 1)))
      .filter((path) => path !== '');
  });

  protected readonly exitBands = computed<TrajectoryExitBand[]>(() =>
    trajectoryExitBands(this.concatenatedWindows(), this.totalMs()),
  );

  protected readonly contacts = computed<ContactDot[]>(() => {
    const offsets = this.courseOffsets();
    const totalMs = this.totalMs();
    const dots: ContactDot[] = [];
    for (const series of this.metrics().timeline) {
      const offset = offsets.get(series.courseIndex) ?? 0;
      for (const contactTMs of this.mergedContactsByCourse().get(
        series.courseIndex,
      ) ?? []) {
        const atMs = offset + contactTMs;
        dots.push({
          xPct: (atMs / totalMs) * 100,
          tooltip: `${formatDuration(Math.round(atMs / 1000))} · Contact bord`,
        });
      }
    }
    return dots;
  });

  protected readonly xLabels = computed(() => {
    const totalSec = Math.round(this.totalMs() / 1000);
    return [0, Math.round(totalSec / 2), totalSec].map(formatDuration);
  });

  protected yTickBottom(valuePct: number): number {
    return (valuePct / Y_DOMAIN_PCT) * 100;
  }
}
