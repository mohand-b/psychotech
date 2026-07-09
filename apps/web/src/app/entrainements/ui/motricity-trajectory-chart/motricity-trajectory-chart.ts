import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { MotorSkillsMetrics } from '@psychotech/shared';
import { formatDuration } from '../../../shared/ui/format-duration';

const Y_MIN_DOMAIN_PCT = 125;
const Y_HEADROOM_PCT = 10;
const Y_MAX_DOMAIN_PCT = 170;
const BORDER_PCT = 100;

interface ChartCoord {
  x: number;
  y: number;
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

  private readonly yMax = computed(() => {
    const maxDeviation = Math.max(
      0,
      ...this.metrics().timeline.flatMap((series) =>
        series.points.map((point) => point.deviationPct),
      ),
    );
    return Math.min(
      Y_MAX_DOMAIN_PCT,
      Math.max(Y_MIN_DOMAIN_PCT, maxDeviation + Y_HEADROOM_PCT),
    );
  });

  protected readonly borderBottomPct = computed(
    () => (BORDER_PCT / this.yMax()) * 100,
  );

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

  private readonly coords = computed<ChartCoord[]>(() => {
    const offsets = this.courseOffsets();
    const totalMs = this.totalMs();
    const yMax = this.yMax();
    const coords: ChartCoord[] = [];
    for (const series of this.metrics().timeline) {
      const offset = offsets.get(series.courseIndex) ?? 0;
      for (const point of series.points) {
        const clamped = Math.min(yMax, point.deviationPct);
        coords.push({
          x: ((offset + point.tMs) / totalMs) * 100,
          y: 100 - (clamped / yMax) * 100,
          deviationPct: point.deviationPct,
        });
      }
    }
    return coords;
  });

  protected readonly curvePath = computed(() => bezierPath(this.coords()));

  protected readonly exitPaths = computed<string[]>(() => {
    const coords = this.coords();
    const paths: string[] = [];
    let run: ChartCoord[] = [];
    for (let position = 1; position < coords.length; position += 1) {
      const previous = coords[position - 1];
      const current = coords[position];
      const isExitPair =
        previous.deviationPct > BORDER_PCT || current.deviationPct > BORDER_PCT;
      if (isExitPair) {
        if (run.length === 0) {
          run = [previous];
        }
        run.push(current);
      } else if (run.length > 1) {
        paths.push(bezierPath(run));
        run = [];
      } else {
        run = [];
      }
    }
    if (run.length > 1) {
      paths.push(bezierPath(run));
    }
    return paths;
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
}
