import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { MotorSkillsMetrics } from '@psychotech/shared';
import { formatDuration } from '../format-duration';
import { ChartTouchTips } from '../chart-touch-tips';
import {
  CurvePoint,
  TrajectoryBorderMarkerKind,
  findBorderMarkers,
  buildDisplaySeries,
  collectCourseContactTimes,
  collectCourseExitWindows,
  findRunsAboveBorder,
  insertBorderCrossings,
  buildMonotoneCubicPath,
  buildMonotoneCubicSubPath,
} from './trajectory-chart.logic';

const Y_DOMAIN_PCT = 120;
const BORDER_PCT = 100;

interface ChartCoord extends CurvePoint {
  tMs: number;
  deviationPct: number;
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

const MARKER_LABELS: Record<TrajectoryBorderMarkerKind, string> = {
  TOUCH: 'Contact bord',
  EXIT_START: 'Sortie de couloir',
  EXIT_END: 'Retour en couloir',
};

@Component({
  selector: 'ui-motricity-trajectory-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ChartTouchTips],
  templateUrl: './motricity-trajectory-chart.html',
  styleUrls: ['../chart-base.css', './motricity-trajectory-chart.css'],
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
          collectCourseContactTimes(this.metrics().events, series.courseIndex),
        ]),
      ),
  );

  private readonly mergedWindowsByCourse = computed(
    () =>
      new Map(
        this.metrics().timeline.map((series) => [
          series.courseIndex,
          collectCourseExitWindows(this.metrics().events, series.courseIndex),
        ]),
      ),
  );

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
      for (const point of insertBorderCrossings(
        buildDisplaySeries(series.points, contacts, windows, totalMs),
      )) {
        coords.push({
          x: ((offset + point.tMs) / totalMs) * 100,
          y: 100 - (point.deviationPct / Y_DOMAIN_PCT) * 100,
          tMs: offset + point.tMs,
          deviationPct: point.deviationPct,
        });
      }
    }
    return coords;
  });

  protected readonly curvePath = computed(() =>
    buildMonotoneCubicPath(this.coords()),
  );

  protected readonly exitCurvePaths = computed<string[]>(() => {
    const coords = this.coords();
    return findRunsAboveBorder(coords.map((coord) => coord.deviationPct))
      .map((run) => buildMonotoneCubicSubPath(coords, run.from, run.to))
      .filter((path) => path !== '');
  });

  protected readonly contacts = computed<ContactDot[]>(() => {
    const totalMs = this.totalMs();
    return findBorderMarkers(this.coords()).map((marker) => ({
      xPct: (marker.tMs / totalMs) * 100,
      tooltip: `${formatDuration(Math.round(marker.tMs / 1000))} · ${MARKER_LABELS[marker.kind]}`,
    }));
  });

  protected readonly xLabels = computed(() => {
    const totalSec = Math.round(this.totalMs() / 1000);
    return [0, Math.round(totalSec / 2), totalSec].map(formatDuration);
  });

  protected computeTickBottomPct(valuePct: number): number {
    return (valuePct / Y_DOMAIN_PCT) * 100;
  }
}
