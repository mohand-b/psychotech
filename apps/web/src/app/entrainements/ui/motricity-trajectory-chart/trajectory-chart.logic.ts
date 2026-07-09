import {
  MotorSkillsCourseRecap,
  MotricityErrorEvent,
  MotricityTimelinePoint,
} from '@psychotech/shared';

export const TRAJECTORY_SMOOTHING_WINDOW_MS = 2000;
export const TRAJECTORY_DISPLAY_CLAMP_PCT = 110;
export const TRAJECTORY_EXIT_BAND_MIN_WIDTH_PCT = 0.4;

export function smoothTimelinePoints(
  points: MotricityTimelinePoint[],
  windowMs: number = TRAJECTORY_SMOOTHING_WINDOW_MS,
): MotricityTimelinePoint[] {
  const halfWindowMs = windowMs / 2;
  return points.map((point) => {
    let sum = 0;
    let count = 0;
    for (const candidate of points) {
      if (Math.abs(candidate.tMs - point.tMs) <= halfWindowMs) {
        sum += candidate.deviationPct;
        count += 1;
      }
    }
    return { tMs: point.tMs, deviationPct: sum / count };
  });
}

export function clampDeviation(
  deviationPct: number,
  clampPct: number = TRAJECTORY_DISPLAY_CLAMP_PCT,
): number {
  return Math.min(clampPct, deviationPct);
}

export interface TrajectoryExitWindow {
  startMs: number;
  endMs: number;
}

export function trajectoryExitWindows(
  events: MotricityErrorEvent[],
  courses: MotorSkillsCourseRecap[],
): TrajectoryExitWindow[] {
  const offsets = new Map<number, number>();
  let elapsed = 0;
  for (const course of courses) {
    offsets.set(course.index, elapsed);
    elapsed += course.tReelMs;
  }
  return events
    .filter((event) => event.type === 'EXIT')
    .map((event) => {
      const startMs = (offsets.get(event.courseIndex) ?? 0) + event.tMs;
      return { startMs, endMs: startMs + (event.durationMs ?? 0) };
    });
}

export interface TrajectoryExitBand {
  leftPct: number;
  widthPct: number;
}

export function trajectoryExitBands(
  events: MotricityErrorEvent[],
  courses: MotorSkillsCourseRecap[],
  totalMs: number,
): TrajectoryExitBand[] {
  return trajectoryExitWindows(events, courses).map((window) => ({
    leftPct: (window.startMs / totalMs) * 100,
    widthPct: Math.max(
      TRAJECTORY_EXIT_BAND_MIN_WIDTH_PCT,
      ((window.endMs - window.startMs) / totalMs) * 100,
    ),
  }));
}

export interface CurveRun {
  from: number;
  to: number;
}

export function curveExitRuns(
  timesMs: number[],
  windows: TrajectoryExitWindow[],
): CurveRun[] {
  const runs: CurveRun[] = [];
  let runStart: number | null = null;
  for (let index = 0; index < timesMs.length - 1; index += 1) {
    const pairStart = timesMs[index];
    const pairEnd = timesMs[index + 1];
    const inWindow = windows.some(
      (window) => pairStart < window.endMs && pairEnd > window.startMs,
    );
    if (inWindow) {
      if (runStart === null) {
        runStart = index;
      }
    } else if (runStart !== null) {
      runs.push({ from: runStart, to: index });
      runStart = null;
    }
  }
  if (runStart !== null) {
    runs.push({ from: runStart, to: timesMs.length - 1 });
  }
  return runs;
}

export function interpolateDeviationAt(
  points: MotricityTimelinePoint[],
  tMs: number,
): number {
  if (points.length === 0) {
    return 0;
  }
  if (tMs <= points[0].tMs) {
    return points[0].deviationPct;
  }
  const last = points[points.length - 1];
  if (tMs >= last.tMs) {
    return last.deviationPct;
  }
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    if (tMs >= current.tMs && tMs <= next.tMs) {
      const ratio = (tMs - current.tMs) / (next.tMs - current.tMs);
      return (
        current.deviationPct +
        (next.deviationPct - current.deviationPct) * ratio
      );
    }
  }
  return last.deviationPct;
}
