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

export interface TrajectoryExitBand {
  leftPct: number;
  widthPct: number;
}

export function trajectoryExitBands(
  events: MotricityErrorEvent[],
  courses: MotorSkillsCourseRecap[],
  totalMs: number,
): TrajectoryExitBand[] {
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
      const widthPct = ((event.durationMs ?? 0) / totalMs) * 100;
      return {
        leftPct: (startMs / totalMs) * 100,
        widthPct: Math.max(TRAJECTORY_EXIT_BAND_MIN_WIDTH_PCT, widthPct),
      };
    });
}
