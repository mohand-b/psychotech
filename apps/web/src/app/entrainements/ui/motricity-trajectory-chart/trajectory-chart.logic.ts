import {
  MotricityErrorEvent,
  MotricityTimelinePoint,
} from '@psychotech/shared';

export const TRAJECTORY_BASELINE_BUCKET_MS = 500;
export const TRAJECTORY_BASELINE_SMOOTH_HALF_MS = 1500;
export const TRAJECTORY_CONTACT_BELL_HALF_MS = 1000;
export const TRAJECTORY_CONTACT_BELL_MIN_SPAN_RATIO = 0.01;
export const TRAJECTORY_EXIT_EASE_MS = 1000;
export const TRAJECTORY_EXIT_CEILING_PCT = 108;
export const TRAJECTORY_EXIT_DOME_FLOOR_RATIO = 0.25;
export const TRAJECTORY_CONTACT_MERGE_MS = 1500;
export const TRAJECTORY_EXIT_MERGE_MS = 1000;
export const TRAJECTORY_BORDER_PCT = 100;
export const TRAJECTORY_DISPLAY_CLAMP_PCT = 110;

export interface TrajectoryExitWindow {
  startMs: number;
  endMs: number;
}

export function clampDeviation(
  deviationPct: number,
  clampPct: number = TRAJECTORY_DISPLAY_CLAMP_PCT,
): number {
  return Math.min(clampPct, deviationPct);
}

export function bucketTimelinePoints(
  points: MotricityTimelinePoint[],
  bucketMs: number = TRAJECTORY_BASELINE_BUCKET_MS,
): MotricityTimelinePoint[] {
  if (points.length === 0) {
    return [];
  }
  const buckets = new Map<number, { sum: number; count: number }>();
  for (const point of points) {
    const bucket = Math.floor(point.tMs / bucketMs);
    const entry = buckets.get(bucket) ?? { sum: 0, count: 0 };
    entry.sum += point.deviationPct;
    entry.count += 1;
    buckets.set(bucket, entry);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a - b)
    .map(([bucket, entry]) => ({
      tMs: bucket * bucketMs + bucketMs / 2,
      deviationPct: entry.sum / entry.count,
    }));
}

export function smoothTimelinePoints(
  points: MotricityTimelinePoint[],
  halfWindowMs: number = TRAJECTORY_BASELINE_SMOOTH_HALF_MS,
): MotricityTimelinePoint[] {
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

export function mergeContactTimes(
  timesMs: number[],
  gapMs: number = TRAJECTORY_CONTACT_MERGE_MS,
): number[] {
  if (timesMs.length === 0) {
    return [];
  }
  const sorted = [...timesMs].sort((a, b) => a - b);
  const clusters: number[][] = [[sorted[0]]];
  for (let index = 1; index < sorted.length; index += 1) {
    const cluster = clusters[clusters.length - 1];
    if (sorted[index] - cluster[cluster.length - 1] < gapMs) {
      cluster.push(sorted[index]);
    } else {
      clusters.push([sorted[index]]);
    }
  }
  return clusters.map((cluster) =>
    Math.round(cluster.reduce((sum, value) => sum + value, 0) / cluster.length),
  );
}

export function mergeExitWindows(
  windows: TrajectoryExitWindow[],
  gapMs: number = TRAJECTORY_EXIT_MERGE_MS,
): TrajectoryExitWindow[] {
  if (windows.length === 0) {
    return [];
  }
  const sorted = [...windows].sort((a, b) => a.startMs - b.startMs);
  const merged: TrajectoryExitWindow[] = [{ ...sorted[0] }];
  for (let index = 1; index < sorted.length; index += 1) {
    const last = merged[merged.length - 1];
    const current = sorted[index];
    if (current.startMs - last.endMs < gapMs) {
      last.endMs = Math.max(last.endMs, current.endMs);
    } else {
      merged.push({ ...current });
    }
  }
  return merged;
}

export function courseContactTimes(
  events: MotricityErrorEvent[],
  courseIndex: number,
): number[] {
  return mergeContactTimes(
    events
      .filter(
        (event) => event.type === 'CONTACT' && event.courseIndex === courseIndex,
      )
      .map((event) => event.tMs),
  );
}

export function courseExitWindows(
  events: MotricityErrorEvent[],
  courseIndex: number,
): TrajectoryExitWindow[] {
  return mergeExitWindows(
    events
      .filter(
        (event) => event.type === 'EXIT' && event.courseIndex === courseIndex,
      )
      .map((event) => ({
        startMs: event.tMs,
        endMs: event.tMs + (event.durationMs ?? 0),
      })),
  );
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

function cosineBell(distanceMs: number, halfWidthMs: number): number {
  if (Math.abs(distanceMs) >= halfWidthMs) {
    return 0;
  }
  return 0.5 * (1 + Math.cos((Math.PI * Math.abs(distanceMs)) / halfWidthMs));
}

function exitTarget(tMs: number, window: TrajectoryExitWindow): number {
  const span = Math.max(1, window.endMs - window.startMs);
  const inside = Math.min(Math.max(tMs, window.startMs), window.endMs);
  const dome =
    TRAJECTORY_EXIT_DOME_FLOOR_RATIO +
    (1 - TRAJECTORY_EXIT_DOME_FLOOR_RATIO) *
      Math.sin((Math.PI * (inside - window.startMs)) / span);
  return (
    TRAJECTORY_BORDER_PCT +
    (TRAJECTORY_EXIT_CEILING_PCT - TRAJECTORY_BORDER_PCT) * dome
  );
}

function exitRamp(tMs: number, window: TrajectoryExitWindow): number {
  if (tMs >= window.startMs && tMs <= window.endMs) {
    return 1;
  }
  const distance =
    tMs < window.startMs ? window.startMs - tMs : tMs - window.endMs;
  return cosineBell(distance, TRAJECTORY_EXIT_EASE_MS);
}

export function contactBellHalfMs(totalMs: number): number {
  return Math.max(
    TRAJECTORY_CONTACT_BELL_HALF_MS,
    totalMs * TRAJECTORY_CONTACT_BELL_MIN_SPAN_RATIO,
  );
}

export function buildDisplaySeries(
  raw: MotricityTimelinePoint[],
  contactsTMs: number[],
  exitWindows: TrajectoryExitWindow[],
  totalMs: number,
): MotricityTimelinePoint[] {
  if (raw.length === 0) {
    return [];
  }
  const baseline = smoothTimelinePoints(bucketTimelinePoints(raw));
  const firstMs = raw[0].tMs;
  const lastMs = raw[raw.length - 1].tMs;
  const bellHalfMs = contactBellHalfMs(totalMs);

  const times = new Set<number>(baseline.map((point) => point.tMs));
  times.add(firstMs);
  times.add(lastMs);
  const addTime = (tMs: number) => {
    if (tMs >= firstMs && tMs <= lastMs) {
      times.add(tMs);
    }
  };
  for (const contactTMs of contactsTMs) {
    addTime(contactTMs);
    addTime(contactTMs - bellHalfMs);
    addTime(contactTMs + bellHalfMs);
  }
  for (const window of exitWindows) {
    addTime(window.startMs);
    addTime(window.endMs);
    addTime(window.startMs - TRAJECTORY_EXIT_EASE_MS);
    addTime(window.endMs + TRAJECTORY_EXIT_EASE_MS);
    addTime((window.startMs + window.endMs) / 2);
  }

  return [...times]
    .sort((a, b) => a - b)
    .map((tMs) => {
      const base = interpolateDeviationAt(baseline, tMs);
      let lift = 0;
      for (const contactTMs of contactsTMs) {
        lift = Math.max(lift, cosineBell(tMs - contactTMs, bellHalfMs));
      }
      const anchored =
        base < TRAJECTORY_BORDER_PCT
          ? base + lift * (TRAJECTORY_BORDER_PCT - base)
          : base;
      let value = anchored;
      for (const window of exitWindows) {
        const ramp = exitRamp(tMs, window);
        if (ramp > 0) {
          const target = exitTarget(tMs, window);
          value = Math.max(value, anchored + ramp * (target - anchored));
        }
      }
      return { tMs, deviationPct: clampDeviation(value) };
    });
}

export interface CurveRun {
  from: number;
  to: number;
}

export function curveAboveBorderRuns(
  deviationsPct: number[],
  borderPct: number = TRAJECTORY_BORDER_PCT,
): CurveRun[] {
  const runs: CurveRun[] = [];
  let runStart: number | null = null;
  for (let index = 0; index < deviationsPct.length - 1; index += 1) {
    const isAbove =
      deviationsPct[index] > borderPct || deviationsPct[index + 1] > borderPct;
    if (isAbove) {
      if (runStart === null) {
        runStart = index;
      }
    } else if (runStart !== null) {
      runs.push({ from: runStart, to: index });
      runStart = null;
    }
  }
  if (runStart !== null) {
    runs.push({ from: runStart, to: deviationsPct.length - 1 });
  }
  return runs;
}

export interface CurvePoint {
  x: number;
  y: number;
}

export function monotoneCubicPath(coords: CurvePoint[]): string {
  if (coords.length < 2) {
    return '';
  }
  const count = coords.length;
  const slopes: number[] = [];
  for (let index = 0; index < count - 1; index += 1) {
    const dx = coords[index + 1].x - coords[index].x;
    slopes.push(
      dx === 0 ? 0 : (coords[index + 1].y - coords[index].y) / dx,
    );
  }
  const tangents: number[] = [slopes[0]];
  for (let index = 1; index < count - 1; index += 1) {
    if (slopes[index - 1] * slopes[index] <= 0) {
      tangents.push(0);
    } else {
      tangents.push((slopes[index - 1] + slopes[index]) / 2);
    }
  }
  tangents.push(slopes[count - 2]);
  for (let index = 0; index < count - 1; index += 1) {
    if (slopes[index] === 0) {
      tangents[index] = 0;
      tangents[index + 1] = 0;
      continue;
    }
    const a = tangents[index] / slopes[index];
    const b = tangents[index + 1] / slopes[index];
    const norm = a * a + b * b;
    if (norm > 9) {
      const tau = 3 / Math.sqrt(norm);
      tangents[index] = tau * a * slopes[index];
      tangents[index + 1] = tau * b * slopes[index];
    }
  }
  let path = `M ${coords[0].x.toFixed(2)} ${coords[0].y.toFixed(2)}`;
  for (let index = 0; index < count - 1; index += 1) {
    const current = coords[index];
    const next = coords[index + 1];
    const h = (next.x - current.x) / 3;
    path += ` C ${(current.x + h).toFixed(2)} ${(current.y + tangents[index] * h).toFixed(2)}, ${(next.x - h).toFixed(2)} ${(next.y - tangents[index + 1] * h).toFixed(2)}, ${next.x.toFixed(2)} ${next.y.toFixed(2)}`;
  }
  return path;
}
