import { describe, expect, it } from 'vitest';
import { MotricitySampleDto } from '../../dtos/session';
import { AxisType, ControlModality } from '../../enums';
import { generateMotricityCourses } from './generate-motricity-courses';
import { MotricityCourse } from './motricity-course';
import {
  MOTRICITY_TIMELINE_WINDOW_MS,
  deriveMotorSkillsMetrics,
  deriveMotricityTimeline,
  motricitySegmentIndexAtArc,
  motricitySegmentKind,
} from './motricity-timeline';

const FRAME_MS = 1000 / 60;

function centerlineSamples(
  course: MotricityCourse,
  durationMs: number,
  offsetFromCenter: (arcRatio: number) => number = () => 0,
): MotricitySampleDto[] {
  const sampleCount = Math.round(durationMs / FRAME_MS);
  const samples: MotricitySampleDto[] = [];
  for (let index = 0; index <= sampleCount; index += 1) {
    const ratio = index / sampleCount;
    let remaining = ratio * course.totalLength;
    let position = { ...course.centerline[0] };
    let normal = { x: 0, y: 1 };
    for (const segment of course.segments) {
      const dx = segment.end.x - segment.start.x;
      const dy = segment.end.y - segment.start.y;
      if (remaining <= segment.length) {
        const t = remaining / segment.length;
        position = {
          x: segment.start.x + dx * t,
          y: segment.start.y + dy * t,
        };
        normal = { x: -dy / segment.length, y: dx / segment.length };
        break;
      }
      remaining -= segment.length;
      position = { ...segment.end };
    }
    const offset = offsetFromCenter(ratio);
    samples.push({
      t: Math.round(index * FRAME_MS),
      x: position.x + normal.x * offset,
      y: position.y + normal.y * offset,
    });
  }
  return samples;
}

describe('deriveMotricityTimeline', () => {
  const seed = 'timeline';
  const courses = generateMotricityCourses(seed);

  it('normalizes the deviation by the local half width so the shrinking corridor is accounted for', () => {
    const course = courses[0];
    const firstHalf = course.segments[0].width / 2;
    const lastHalf = course.segments[course.segments.length - 1].width / 2;
    const offset = lastHalf * 0.9;
    const trajectory = {
      index: 0,
      samples: centerlineSamples(course, 45_000, () => offset),
    };
    const { timeline } = deriveMotricityTimeline([trajectory], seed);
    const points = timeline[0].points;
    const early = points[1].deviationPct;
    const late = points[points.length - 2].deviationPct;
    expect(early).toBeCloseTo((offset / firstHalf) * 100, -1);
    expect(late).toBeCloseTo((offset / lastHalf) * 100, -1);
    expect(late).toBeGreaterThan(early);
  });

  it('averages each 200 ms window so a brief spike is softened while its event remains', () => {
    const course = courses[0];
    const contactStartMs = 10_000;
    const contactEndMs = 10_100;
    const halfWidth = course.segments[0].width / 2;
    const trajectory = {
      index: 0,
      samples: centerlineSamples(course, 45_000, () => 0).map((sample) =>
        sample.t >= contactStartMs && sample.t <= contactEndMs
          ? { ...sample, y: sample.y + halfWidth - 1 }
          : sample,
      ),
    };
    const { timeline, events } = deriveMotricityTimeline([trajectory], seed);
    const windowIndex = Math.floor(contactStartMs / MOTRICITY_TIMELINE_WINDOW_MS);
    const windowPoint = timeline[0].points.find(
      (point) => point.tMs === windowIndex * MOTRICITY_TIMELINE_WINDOW_MS,
    );
    expect(windowPoint).toBeDefined();
    expect(windowPoint?.deviationPct).toBeGreaterThan(30);
    expect(windowPoint?.deviationPct).toBeLessThan(80);
    expect(
      events.some(
        (event) =>
          event.type === 'CONTACT' &&
          Math.abs(event.tMs - contactStartMs) < 50,
      ),
    ).toBe(true);
  });

  it('attributes each error event to the nearest centerline segment kind', () => {
    const course = courses[0];
    const diagonalIndex = course.segments.findIndex((segment) => {
      const dx = Math.abs(segment.end.x - segment.start.x);
      const dy = Math.abs(segment.end.y - segment.start.y);
      return dx > 1e-6 && Math.abs(dx - dy) < 1e-6;
    });
    expect(diagonalIndex).toBeGreaterThan(-1);
    const arcBefore = course.segments
      .slice(0, diagonalIndex)
      .reduce((sum, segment) => sum + segment.length, 0);
    const midDiagonalArc = arcBefore + course.segments[diagonalIndex].length / 2;
    const ratio = midDiagonalArc / course.totalLength;
    const halfWidth = course.segments[diagonalIndex].width / 2;
    const trajectory = {
      index: 0,
      samples: centerlineSamples(course, 45_000, (arcRatio) =>
        Math.abs(arcRatio - ratio) < 0.02 ? halfWidth - 1 : 0,
      ),
    };
    const { events } = deriveMotricityTimeline([trajectory], seed);
    const contacts = events.filter((event) => event.type === 'CONTACT');
    expect(contacts.length).toBeGreaterThan(0);
    expect(contacts[0].segment).toBe('DIAG');
    expect(
      motricitySegmentKind(
        course,
        motricitySegmentIndexAtArc(course, midDiagonalArc),
      ),
    ).toBe('DIAG');
  });

  it('records complete exits with their duration', () => {
    const course = courses[0];
    const exitStartMs = 12_000;
    const exitEndMs = 13_500;
    const halfWidth = course.segments[0].width / 2;
    const trajectory = {
      index: 0,
      samples: centerlineSamples(course, 45_000, () => 0).map((sample) =>
        sample.t >= exitStartMs && sample.t <= exitEndMs
          ? { ...sample, y: sample.y + halfWidth + 40 }
          : sample,
      ),
    };
    const { events } = deriveMotricityTimeline([trajectory], seed);
    const exit = events.find((event) => event.type === 'EXIT');
    expect(exit).toBeDefined();
    expect(exit?.durationMs).toBeGreaterThanOrEqual(1400);
    expect(exit?.durationMs).toBeLessThanOrEqual(1700);
  });
});

describe('deriveMotorSkillsMetrics', () => {
  const seed = 'metrics';
  const courses = generateMotricityCourses(seed);
  const trajectories = courses.map((course) => ({
    index: course.index,
    samples: centerlineSamples(course, 40_000 + course.index * 5_000),
    avgLatencyMs: 20,
    jitterMs: 4,
  }));

  it('aggregates totals, recaps and modality with hand independence for two sticks only', () => {
    const gamepad = deriveMotorSkillsMetrics(
      trajectories,
      seed,
      ControlModality.PHONE_GAMEPAD,
    );
    expect(gamepad.axis).toBe(AxisType.MOTOR_SKILLS);
    expect(gamepad.coursesCompleted).toBe(3);
    expect(gamepad.courses).toHaveLength(3);
    expect(gamepad.courses[0].avgLatencyMs).toBe(20);
    expect(gamepad.totalTimeMs).toBeGreaterThan(0);
    expect(gamepad.controlModality).toBe(ControlModality.PHONE_GAMEPAD);
    expect(gamepad.handIndependence).toBeDefined();
    expect(gamepad.timeline).toHaveLength(3);

    const keyboard = deriveMotorSkillsMetrics(
      trajectories,
      seed,
      ControlModality.KEYBOARD,
    );
    expect(keyboard.handIndependence).toBeUndefined();
  });
});
