import {
  MotricityCourseTrajectoryDto,
  MotricitySampleDto,
} from '../../dtos/session';
import { generateMotricityCourses } from './generate-motricity-courses';
import {
  MotricityCourse,
  MotricityCursorZone,
  motricityAnchoredArc,
  motricityCursorZone,
} from './motricity-course';

export const MOTRICITY_SECONDS_PER_COURSE = 90;
export const MOTRICITY_SPEED_BEST_SEC = 20;
export const MOTRICITY_SPEED_WORST_SEC = 90;
export const MOTRICITY_MAJOR_GRACE_MS = 1000;
export const MOTRICITY_PROGRESS_WEIGHT = 0.7;
export const MOTRICITY_SPEED_WEIGHT = 0.3;
export const MOTRICITY_MINOR_DEDUCTION = 4;
export const MOTRICITY_MAJOR_DEDUCTION = 12;
export const MOTRICITY_FINAL_COURSE_WEIGHT = 1.5;
export const MOTRICITY_ARC_COMPLETION_TOLERANCE = 0.5;

export interface MotricityCourseScore {
  index: number;
  minorErrors: number;
  majorErrors: number;
  progressionPct: number;
  tReelMs: number;
  score: number;
}

export interface MotricitySessionScore {
  score: number;
  courses: MotricityCourseScore[];
}

function isSafeZone(zone: MotricityCursorZone): boolean {
  return zone === 'GARAGE' || zone === 'END' || zone === 'INSIDE';
}

export function majorErrorsForExitDuration(durationMs: number): number {
  if (durationMs <= MOTRICITY_MAJOR_GRACE_MS) {
    return 0;
  }
  return Math.floor((durationMs - MOTRICITY_MAJOR_GRACE_MS) / 1000) + 1;
}

function scoreNorm(value: number, best: number, worst: number): number {
  return 100 * Math.min(1, Math.max(0, (worst - value) / (worst - best)));
}

export interface MotricityCourseRecapInput {
  minorErrors: number;
  majorErrors: number;
  progressionPct: number;
  tReelMs: number;
}

export function scoreMotricityRecap(recap: MotricityCourseRecapInput): number {
  const speedScore =
    recap.progressionPct >= 100
      ? scoreNorm(
          recap.tReelMs / 1000,
          MOTRICITY_SPEED_BEST_SEC,
          MOTRICITY_SPEED_WORST_SEC,
        )
      : 0;
  return Math.min(
    100,
    Math.max(
      0,
      MOTRICITY_PROGRESS_WEIGHT * recap.progressionPct +
        MOTRICITY_SPEED_WEIGHT * speedScore -
        MOTRICITY_MINOR_DEDUCTION * recap.minorErrors -
        MOTRICITY_MAJOR_DEDUCTION * recap.majorErrors,
    ),
  );
}

export function scoreMotricityCourse(
  course: MotricityCourse,
  samples: MotricitySampleDto[],
): MotricityCourseScore {
  let minorErrors = 0;
  let majorErrors = 0;
  let maxArc = 0;
  let previousT = 0;
  let reachedAtMs: number | null = null;
  let inErrorEpisode = false;
  let outsideSinceMs: number | null = null;
  const completionArc =
    course.totalLength - MOTRICITY_ARC_COMPLETION_TOLERANCE;

  for (const sample of samples) {
    const zone = motricityCursorZone(course, sample);
    if (isSafeZone(zone)) {
      if (outsideSinceMs !== null) {
        majorErrors += majorErrorsForExitDuration(sample.t - outsideSinceMs);
        outsideSinceMs = null;
      }
      inErrorEpisode = false;
    } else {
      if (!inErrorEpisode) {
        inErrorEpisode = true;
        minorErrors += 1;
      }
      if (zone === 'OUTSIDE') {
        if (outsideSinceMs === null) {
          outsideSinceMs = sample.t;
        }
      } else if (outsideSinceMs !== null) {
        majorErrors += majorErrorsForExitDuration(sample.t - outsideSinceMs);
        outsideSinceMs = null;
      }
    }
    maxArc = motricityAnchoredArc(course, sample, maxArc, sample.t - previousT);
    previousT = sample.t;
    if (reachedAtMs === null && maxArc >= completionArc) {
      reachedAtMs = sample.t;
    }
  }
  const lastSample = samples[samples.length - 1] as
    | MotricitySampleDto
    | undefined;
  if (outsideSinceMs !== null && lastSample) {
    majorErrors += majorErrorsForExitDuration(lastSample.t - outsideSinceMs);
  }

  const completed = reachedAtMs !== null;
  const progression = completed
    ? 100
    : Math.min(100, (maxArc / course.totalLength) * 100);
  const tReelMs = reachedAtMs ?? lastSample?.t ?? 0;
  const score = scoreMotricityRecap({
    minorErrors,
    majorErrors,
    progressionPct: progression,
    tReelMs,
  });

  return {
    index: course.index,
    minorErrors,
    majorErrors,
    progressionPct: Math.round(progression),
    tReelMs: Math.round(tReelMs),
    score,
  };
}

export function motricityCourseFinished(
  course: MotricityCourse,
  samples: MotricitySampleDto[],
): boolean {
  const lastSample = samples[samples.length - 1] as
    | MotricitySampleDto
    | undefined;
  if (!lastSample) {
    return false;
  }
  if (lastSample.t >= MOTRICITY_SECONDS_PER_COURSE * 1000) {
    return true;
  }
  const completionArc =
    course.totalLength - MOTRICITY_ARC_COMPLETION_TOLERANCE;
  let arc = 0;
  let previousT = 0;
  for (const sample of samples) {
    arc = motricityAnchoredArc(course, sample, arc, sample.t - previousT);
    previousT = sample.t;
    if (arc >= completionArc) {
      return true;
    }
  }
  return false;
}

export function scoreMotricitySession(
  trajectories: MotricityCourseTrajectoryDto[],
  seed: string,
): MotricitySessionScore {
  const courses = generateMotricityCourses(seed);
  const samplesByIndex = new Map(
    trajectories.map((trajectory) => [trajectory.index, trajectory.samples]),
  );
  const courseScores = courses.map((course) =>
    scoreMotricityCourse(course, samplesByIndex.get(course.index) ?? []),
  );
  const weightedSum = courseScores.reduce(
    (sum, courseScore, index) =>
      sum +
      courseScore.score *
        (index === courseScores.length - 1 ? MOTRICITY_FINAL_COURSE_WEIGHT : 1),
    0,
  );
  const totalWeight =
    courseScores.length - 1 + MOTRICITY_FINAL_COURSE_WEIGHT;
  return {
    score: Math.round(weightedSum / totalWeight),
    courses: courseScores.map((courseScore) => ({
      ...courseScore,
      score: Math.round(courseScore.score),
    })),
  };
}
