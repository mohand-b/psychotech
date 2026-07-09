import {
  MotorSkillsMetrics,
  MotricityCourseTimeline,
  MotricityErrorEvent,
  MotricitySegmentKind,
  MotricityTimelinePoint,
} from '../../domain/axis-metrics';
import {
  MotricityCourseTrajectoryDto,
  MotricitySampleDto,
} from '../../dtos/session';
import { AxisType, ControlModality } from '../../enums';
import { generateMotricityCourses } from './generate-motricity-courses';
import {
  MotricityCourse,
  MotricityCursorZone,
  distanceToSegment,
  motricityAdvanceArc,
  motricityArcAdvanceBudget,
  motricityCursorZone,
} from './motricity-course';
import { scoreMotricitySession } from './motricity-scoring';

export const MOTRICITY_TIMELINE_WINDOW_MS = 200;

export function motricitySegmentKind(
  course: MotricityCourse,
  segmentIndex: number,
): MotricitySegmentKind {
  const segment = course.segments[segmentIndex];
  const dx = Math.abs(segment.end.x - segment.start.x);
  const dy = Math.abs(segment.end.y - segment.start.y);
  if (dy < 1e-6) {
    return 'H';
  }
  return dx < 1e-6 ? 'V' : 'DIAG';
}

export function motricitySegmentIndexAtArc(
  course: MotricityCourse,
  arc: number,
): number {
  let accumulated = 0;
  for (let index = 0; index < course.segments.length; index += 1) {
    accumulated += course.segments[index].length;
    if (arc <= accumulated) {
      return index;
    }
  }
  return course.segments.length - 1;
}

function deviationPct(
  course: MotricityCourse,
  sample: MotricitySampleDto,
  segmentIndex: number,
): number {
  const segment = course.segments[segmentIndex];
  const halfWidth = segment.width / 2;
  const distance = distanceToSegment(sample, segment.start, segment.end);
  return (distance / halfWidth) * 100;
}

function isSafeZone(zone: MotricityCursorZone): boolean {
  return zone === 'GARAGE' || zone === 'END' || zone === 'INSIDE';
}

interface CourseDerivation {
  timeline: MotricityCourseTimeline;
  events: MotricityErrorEvent[];
}

function deriveCourse(
  course: MotricityCourse,
  trajectory: MotricityCourseTrajectoryDto,
): CourseDerivation {
  const points: MotricityTimelinePoint[] = [];
  const events: MotricityErrorEvent[] = [];
  let arc = 0;
  let previousT = 0;
  let windowIndex = -1;
  let windowSum = 0;
  let windowCount = 0;
  let inErrorEpisode = false;
  let exitStart: { tMs: number; segment: MotricitySegmentKind } | null = null;

  const flushWindow = () => {
    if (windowIndex >= 0 && windowCount > 0) {
      points.push({
        tMs: windowIndex * MOTRICITY_TIMELINE_WINDOW_MS,
        deviationPct: Math.round(windowSum / windowCount),
      });
    }
  };

  for (const sample of trajectory.samples) {
    arc = motricityAdvanceArc(
      course,
      sample,
      arc,
      motricityArcAdvanceBudget(sample.t - previousT),
    );
    previousT = sample.t;
    const segmentIndex = motricitySegmentIndexAtArc(course, arc);
    const deviation = deviationPct(course, sample, segmentIndex);
    const sampleWindow = Math.floor(sample.t / MOTRICITY_TIMELINE_WINDOW_MS);
    if (sampleWindow !== windowIndex) {
      flushWindow();
      windowIndex = sampleWindow;
      windowSum = deviation;
      windowCount = 1;
    } else {
      windowSum += deviation;
      windowCount += 1;
    }

    const zone = motricityCursorZone(course, sample);
    const segment = motricitySegmentKind(course, segmentIndex);
    if (isSafeZone(zone)) {
      if (exitStart !== null) {
        events.push({
          courseIndex: trajectory.index,
          tMs: exitStart.tMs,
          type: 'EXIT',
          segment: exitStart.segment,
          durationMs: Math.max(0, sample.t - exitStart.tMs),
        });
        exitStart = null;
      }
      inErrorEpisode = false;
    } else {
      if (!inErrorEpisode) {
        inErrorEpisode = true;
        events.push({
          courseIndex: trajectory.index,
          tMs: sample.t,
          type: 'CONTACT',
          segment,
        });
      }
      if (zone === 'OUTSIDE') {
        if (exitStart === null) {
          exitStart = { tMs: sample.t, segment };
        }
      } else if (exitStart !== null) {
        events.push({
          courseIndex: trajectory.index,
          tMs: exitStart.tMs,
          type: 'EXIT',
          segment: exitStart.segment,
          durationMs: Math.max(0, sample.t - exitStart.tMs),
        });
        exitStart = null;
      }
    }
  }
  if (exitStart !== null) {
    events.push({
      courseIndex: trajectory.index,
      tMs: exitStart.tMs,
      type: 'EXIT',
      segment: exitStart.segment,
      durationMs: Math.max(0, previousT - exitStart.tMs),
    });
  }
  flushWindow();

  return {
    timeline: { courseIndex: trajectory.index, points },
    events,
  };
}

export interface MotricityTimelineDerivation {
  timeline: MotricityCourseTimeline[];
  events: MotricityErrorEvent[];
}

export function deriveMotricityTimeline(
  trajectories: MotricityCourseTrajectoryDto[],
  seed: string,
): MotricityTimelineDerivation {
  const courses = generateMotricityCourses(seed);
  const sorted = [...trajectories].sort((a, b) => a.index - b.index);
  const timeline: MotricityCourseTimeline[] = [];
  const events: MotricityErrorEvent[] = [];
  for (const trajectory of sorted) {
    const course = courses[trajectory.index];
    if (!course) {
      continue;
    }
    const derived = deriveCourse(course, trajectory);
    timeline.push(derived.timeline);
    events.push(...derived.events);
  }
  return { timeline, events };
}

export function motricityHandIndependence(
  trajectories: MotricityCourseTrajectoryDto[],
): number {
  const horizontal: number[] = [];
  const vertical: number[] = [];
  for (const trajectory of trajectories) {
    for (let index = 1; index < trajectory.samples.length; index += 1) {
      const dx = Math.abs(
        trajectory.samples[index].x - trajectory.samples[index - 1].x,
      );
      const dy = Math.abs(
        trajectory.samples[index].y - trajectory.samples[index - 1].y,
      );
      if (dx > 0 || dy > 0) {
        horizontal.push(dx);
        vertical.push(dy);
      }
    }
  }
  if (horizontal.length < 2) {
    return 0;
  }
  const mean = (values: number[]) =>
    values.reduce((sum, value) => sum + value, 0) / values.length;
  const meanX = mean(horizontal);
  const meanY = mean(vertical);
  let covariance = 0;
  let varianceX = 0;
  let varianceY = 0;
  for (let index = 0; index < horizontal.length; index += 1) {
    const deltaX = horizontal[index] - meanX;
    const deltaY = vertical[index] - meanY;
    covariance += deltaX * deltaY;
    varianceX += deltaX * deltaX;
    varianceY += deltaY * deltaY;
  }
  if (varianceX === 0 || varianceY === 0) {
    return 0;
  }
  const correlation = covariance / Math.sqrt(varianceX * varianceY);
  return Math.round(Math.abs(correlation) * 100) / 100;
}

const TWO_STICK_MODALITIES: ControlModality[] = [
  ControlModality.PHONE_GAMEPAD,
  ControlModality.TOUCH_JOYSTICKS,
];

export function deriveMotorSkillsMetrics(
  trajectories: MotricityCourseTrajectoryDto[],
  seed: string,
  controlModality: ControlModality | null,
): MotorSkillsMetrics {
  const scored = scoreMotricitySession(trajectories, seed);
  const { timeline, events } = deriveMotricityTimeline(trajectories, seed);
  const trajectoryByIndex = new Map(
    trajectories.map((trajectory) => [trajectory.index, trajectory]),
  );
  const courses = scored.courses.map(
    ({ index, minorErrors, majorErrors, progressionPct, tReelMs }) => ({
      index,
      minorErrors,
      majorErrors,
      progressionPct,
      tReelMs,
      avgLatencyMs: trajectoryByIndex.get(index)?.avgLatencyMs ?? null,
      jitterMs: trajectoryByIndex.get(index)?.jitterMs ?? null,
    }),
  );
  const twoSticks =
    controlModality !== null && TWO_STICK_MODALITIES.includes(controlModality);
  return {
    axis: AxisType.MOTOR_SKILLS,
    minorErrors: courses.reduce((sum, course) => sum + course.minorErrors, 0),
    majorErrors: courses.reduce((sum, course) => sum + course.majorErrors, 0),
    totalTimeMs: courses.reduce((sum, course) => sum + course.tReelMs, 0),
    coursesCompleted: courses.filter(
      (course) => course.progressionPct >= 100,
    ).length,
    controlModality,
    ...(twoSticks
      ? { handIndependence: motricityHandIndependence(trajectories) }
      : {}),
    courses,
    timeline,
    events,
  };
}
