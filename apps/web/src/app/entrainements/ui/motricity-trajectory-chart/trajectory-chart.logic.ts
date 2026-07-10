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

export const TRAJECTORY_EVENT_EASE_MS = 300;
export const TRAJECTORY_BORDER_PCT = 100;

function exitBlendAt(tMs: number, windows: TrajectoryExitWindow[]): number {
  let blend = 0;
  for (const window of windows) {
    if (tMs >= window.startMs && tMs <= window.endMs) {
      return 1;
    }
    if (tMs >= window.startMs - TRAJECTORY_EVENT_EASE_MS && tMs < window.startMs) {
      blend = Math.max(
        blend,
        (tMs - (window.startMs - TRAJECTORY_EVENT_EASE_MS)) /
          TRAJECTORY_EVENT_EASE_MS,
      );
    }
    if (tMs > window.endMs && tMs <= window.endMs + TRAJECTORY_EVENT_EASE_MS) {
      blend = Math.max(blend, 1 - (tMs - window.endMs) / TRAJECTORY_EVENT_EASE_MS);
    }
  }
  return blend;
}

function contactInfluenceAt(tMs: number, contactsTMs: number[]): number {
  let influence = 0;
  for (const contactTMs of contactsTMs) {
    influence = Math.max(
      influence,
      1 - Math.abs(tMs - contactTMs) / TRAJECTORY_EVENT_EASE_MS,
    );
  }
  return Math.max(0, Math.min(1, influence));
}

export function buildDisplaySeries(
  raw: MotricityTimelinePoint[],
  contactsTMs: number[],
  exitWindows: TrajectoryExitWindow[],
): MotricityTimelinePoint[] {
  if (raw.length === 0) {
    return [];
  }
  const smoothed = smoothTimelinePoints(raw);
  const firstMs = raw[0].tMs;
  const lastMs = raw[raw.length - 1].tMs;
  const times = new Set<number>(raw.map((point) => point.tMs));
  for (const contactTMs of contactsTMs) {
    if (contactTMs >= firstMs && contactTMs <= lastMs) {
      times.add(contactTMs);
    }
  }
  for (const window of exitWindows) {
    for (const bound of [window.startMs, window.endMs]) {
      if (bound >= firstMs && bound <= lastMs) {
        times.add(bound);
      }
    }
  }
  return [...times]
    .sort((a, b) => a - b)
    .map((tMs) => {
      const rawValue = interpolateDeviationAt(raw, tMs);
      const smoothValue = interpolateDeviationAt(smoothed, tMs);
      const influence = contactInfluenceAt(tMs, contactsTMs);
      const anchored =
        smoothValue < TRAJECTORY_BORDER_PCT
          ? smoothValue + influence * (TRAJECTORY_BORDER_PCT - smoothValue)
          : smoothValue;
      const blend = exitBlendAt(tMs, exitWindows);
      return {
        tMs,
        deviationPct: clampDeviation(anchored * (1 - blend) + rawValue * blend),
      };
    });
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
