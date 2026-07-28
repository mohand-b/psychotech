import { describe, expect, it } from 'vitest';
import {
  MOTRICITY_COURSE_PROFILES,
  MOTRICITY_EDGE_BAND,
  MOTRICITY_MIN_SEGMENT_LENGTH,
  MOTRICITY_MIN_START_END_SPAN_X,
  MOTRICITY_REVERSAL_MIN_SPACING,
  generateMotricityCourses,
} from './generate-motricity-courses';
import {
  MOTRICITY_CANVAS_HEIGHT,
  MOTRICITY_CANVAS_WIDTH,
  MotricityCourse,
  MotricitySegment,
} from './motricity-course';
import { segmentToSegmentDistance } from './motricity-geometry';

const PROPERTY_SEED_COUNT = 500;
const DIVERSITY_SEED_COUNT = 50;
const EPSILON = 1e-6;
const SIGNATURE_GRID = 60;

function propertySeeds(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `motricity-pb-${index}`);
}

function segmentDirection(segment: MotricitySegment): {
  dx: number;
  dy: number;
} {
  const dx = segment.end.x - segment.start.x;
  const dy = segment.end.y - segment.start.y;
  const length = Math.hypot(dx, dy);
  return { dx: dx / length, dy: dy / length };
}

function compassIndex(segment: MotricitySegment): number {
  const { dx, dy } = segmentDirection(segment);
  const angle = Math.atan2(dy, dx);
  return ((Math.round(angle / (Math.PI / 4)) % 8) + 8) % 8;
}

function progressionSign(course: MotricityCourse): number {
  const start = course.centerline[0];
  const end = course.centerline[course.centerline.length - 1];
  return Math.sign(end.x - start.x);
}

function backwardRuns(
  course: MotricityCourse,
): { startArc: number; endArc: number }[] {
  const sign = progressionSign(course);
  const runs: { startArc: number; endArc: number }[] = [];
  let arc = 0;
  let openRun: { startArc: number; endArc: number } | null = null;
  for (const segment of course.segments) {
    const dx = segment.end.x - segment.start.x;
    const backward = dx * sign < -EPSILON;
    if (backward) {
      if (!openRun) {
        openRun = { startArc: arc, endArc: arc + segment.length };
        runs.push(openRun);
      } else {
        openRun.endArc = arc + segment.length;
      }
    } else {
      openRun = null;
    }
    arc += segment.length;
  }
  return runs;
}

function quantize(value: number): number {
  return Math.round(value / SIGNATURE_GRID);
}

function courseSignature(course: MotricityCourse, mirrored: boolean): string {
  const mirrorY = (y: number): number =>
    mirrored ? MOTRICITY_CANVAS_HEIGHT - y : y;
  const mirrorDir = (index: number): number => (mirrored ? (8 - index) % 8 : index);
  const directions = course.segments.map((segment) =>
    mirrorDir(compassIndex(segment)),
  );
  const lengths = course.segments.map((segment) => quantize(segment.length));
  const start = course.centerline[0];
  const end = course.centerline[course.centerline.length - 1];
  const xs = course.centerline.map((point) => point.x);
  const ys = course.centerline.map((point) => mirrorY(point.y));
  return JSON.stringify({
    directions,
    lengths,
    start: [quantize(start.x), quantize(mirrorY(start.y))],
    end: [quantize(end.x), quantize(mirrorY(end.y))],
    box: [
      quantize(Math.min(...xs)),
      quantize(Math.min(...ys)),
      quantize(Math.max(...xs)),
      quantize(Math.max(...ys)),
    ],
  });
}

function nearDuplicatePairCount(courses: MotricityCourse[]): number {
  let pairs = 0;
  const plain = courses.map((course) => courseSignature(course, false));
  const mirrored = courses.map((course) => courseSignature(course, true));
  for (let a = 0; a < courses.length; a += 1) {
    for (let b = a + 1; b < courses.length; b += 1) {
      if (plain[a] === plain[b] || plain[a] === mirrored[b]) {
        pairs += 1;
      }
    }
  }
  return pairs;
}

describe('generateMotricityCourses v2 (property-based)', () => {
  it('holds every hard geometric guarantee over 500 seeds and 3 profiles', { timeout: 120_000 }, () => {
    for (const seed of propertySeeds(PROPERTY_SEED_COUNT)) {
      const courses = generateMotricityCourses(seed);
      expect(courses).toHaveLength(3);
      expect(courses[2].totalLength).toBeGreaterThan(courses[1].totalLength);
      courses.forEach((course, index) => {
        const profile = MOTRICITY_COURSE_PROFILES[index];
        const width = course.segments[0].width;
        const clearance = width + profile.clearanceMargin;

        expect(course.segments.length).toBeGreaterThanOrEqual(
          profile.segmentBounds[0],
        );
        expect(course.segments.length).toBeLessThanOrEqual(
          profile.segmentBounds[1],
        );
        expect(course.totalLength).toBeGreaterThanOrEqual(
          profile.minCurvilinearLength - EPSILON,
        );
        expect(course.totalLength).toBeLessThanOrEqual(
          profile.maxCurvilinearLength + EPSILON,
        );

        const start = course.centerline[0];
        const end = course.centerline[course.centerline.length - 1];
        expect(Math.abs(end.x - start.x)).toBeGreaterThanOrEqual(
          MOTRICITY_MIN_START_END_SPAN_X - EPSILON,
        );

        const sign = Math.sign(end.x - start.x);
        const startEdgeDistance =
          sign > 0 ? start.x : MOTRICITY_CANVAS_WIDTH - start.x;
        const endEdgeDistance =
          sign > 0 ? MOTRICITY_CANVAS_WIDTH - end.x : end.x;
        expect(startEdgeDistance).toBeLessThanOrEqual(
          MOTRICITY_EDGE_BAND + EPSILON,
        );
        expect(endEdgeDistance).toBeLessThanOrEqual(
          MOTRICITY_EDGE_BAND + EPSILON,
        );

        const diagonalSegments = course.segments.filter((segment) => {
          const dx = Math.abs(segment.end.x - segment.start.x);
          const dy = Math.abs(segment.end.y - segment.start.y);
          return dx > 1e-6 && Math.abs(dx - dy) < 1e-6;
        });
        expect(diagonalSegments.length).toBeGreaterThanOrEqual(
          profile.minDiagonalSegments,
        );
        const diagonalLength = diagonalSegments.reduce(
          (sum, segment) => sum + segment.length,
          0,
        );
        expect(diagonalLength).toBeGreaterThanOrEqual(
          profile.minDiagonalShare * course.totalLength - EPSILON,
        );

        for (const segment of course.segments) {
          expect(segment.length).toBeGreaterThanOrEqual(
            MOTRICITY_MIN_SEGMENT_LENGTH - EPSILON,
          );
          const dx = Math.abs(segment.end.x - segment.start.x);
          const dy = Math.abs(segment.end.y - segment.start.y);
          const straight =
            dx < 1e-6 || dy < 1e-6 || Math.abs(dx - dy) < 1e-6;
          expect(straight).toBe(true);
        }

        for (let joint = 1; joint < course.segments.length; joint += 1) {
          const previous = compassIndex(course.segments[joint - 1]);
          const current = compassIndex(course.segments[joint]);
          const difference = Math.abs(previous - current) % 8;
          const turn = Math.min(difference, 8 - difference);
          expect(turn).toBeGreaterThanOrEqual(1);
          expect(turn).toBeLessThanOrEqual(2);
        }

        for (const point of course.centerline) {
          expect(point.x).toBeGreaterThanOrEqual(width / 2 - EPSILON);
          expect(point.x).toBeLessThanOrEqual(
            MOTRICITY_CANVAS_WIDTH - width / 2 + EPSILON,
          );
          expect(point.y).toBeGreaterThanOrEqual(width / 2 - EPSILON);
          expect(point.y).toBeLessThanOrEqual(
            MOTRICITY_CANVAS_HEIGHT - width / 2 + EPSILON,
          );
        }

        for (let a = 0; a < course.segments.length; a += 1) {
          for (let b = a + 2; b < course.segments.length; b += 1) {
            const distance = segmentToSegmentDistance(
              course.segments[a].start,
              course.segments[a].end,
              course.segments[b].start,
              course.segments[b].end,
            );
            expect(distance).toBeGreaterThanOrEqual(clearance - EPSILON);
          }
        }

        const runs = backwardRuns(course);
        expect(runs.length).toBeGreaterThanOrEqual(
          profile.reversalBounds[0],
        );
        expect(runs.length).toBeLessThanOrEqual(profile.reversalBounds[1]);
        for (let run = 1; run < runs.length; run += 1) {
          expect(runs[run].startArc - runs[run - 1].endArc).toBeGreaterThan(
            MOTRICITY_REVERSAL_MIN_SPACING - EPSILON,
          );
        }
      });
    }
  });

  it('is strictly deterministic: same seed, same three courses', { timeout: 60_000 }, () => {
    for (const seed of propertySeeds(10)) {
      expect(generateMotricityCourses(seed)).toEqual(
        generateMotricityCourses(seed),
      );
    }
  });
});

describe('generateMotricityCourses v2 (diversity)', () => {
  const seeds = Array.from(
    { length: DIVERSITY_SEED_COUNT },
    (_, index) => `motricity-div-${index}`,
  );

  it('proves the v1 bug: third courses collapse into near-identical or mirrored twins', () => {
    const thirdCourses = seeds.map(
      (seed) => generateMotricityCourses(seed, { contentVersion: 1 })[2],
    );
    expect(nearDuplicatePairCount(thirdCourses)).toBeGreaterThan(0);
  });

  it('produces no near-identical nor mirrored pair of third courses over 50 seeds', { timeout: 60_000 }, () => {
    const thirdCourses = seeds.map(
      (seed) => generateMotricityCourses(seed)[2],
    );
    expect(nearDuplicatePairCount(thirdCourses)).toBe(0);
  });
});
