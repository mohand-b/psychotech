import { describe, expect, it } from 'vitest';
import { MotricitySampleDto } from '../../dtos/session';
import {
  MOTRICITY_COURSE_COUNT,
  MOTRICITY_WIDTH_SHRINK,
  generateMotricityCourses,
} from './generate-motricity-courses';
import {
  MOTRICITY_CANVAS_HEIGHT,
  MOTRICITY_CANVAS_WIDTH,
  MotricityCourse,
  MotricityPoint,
  MotricitySegment,
  motricityAdvanceArc,
  motricityCursorZone,
  motricityProgressionPct,
} from './motricity-course';
import {
  MOTRICITY_FINAL_COURSE_WEIGHT,
  majorErrorsForExitDuration,
  motricityCourseFinished,
  scoreMotricityCourse,
  scoreMotricityRecap,
  scoreMotricitySession,
} from './motricity-scoring';

const SAMPLE_SEEDS = ['alpha', 'bravo', 'charlie', 'delta', 'echo'];
const FRAME_MS = 1000 / 60;

function walkCenterline(
  course: MotricityCourse,
  durationMs: number,
  untilPct = 100,
): MotricitySampleDto[] {
  const targetLength = (untilPct / 100) * course.totalLength;
  const sampleCount = Math.round(durationMs / FRAME_MS);
  const samples: MotricitySampleDto[] = [];
  for (let index = 0; index <= sampleCount; index += 1) {
    const arc = (index / sampleCount) * targetLength;
    let remaining = arc;
    let position = course.centerline[0];
    for (const segment of course.segments) {
      if (remaining <= segment.length) {
        const ratio = remaining / segment.length;
        position = {
          x: segment.start.x + (segment.end.x - segment.start.x) * ratio,
          y: segment.start.y + (segment.end.y - segment.start.y) * ratio,
        };
        break;
      }
      remaining -= segment.length;
      position = segment.end;
    }
    samples.push({
      t: Math.round(index * FRAME_MS),
      x: position.x,
      y: position.y,
    });
  }
  return samples;
}

function insidePoint(course: MotricityCourse): MotricitySampleDto {
  const first = course.segments[0];
  return { t: 0, x: first.start.x + first.length / 2, y: first.start.y };
}

describe('generateMotricityCourses', () => {
  it('is fully deterministic for a given seed', () => {
    expect(generateMotricityCourses('determinism')).toEqual(
      generateMotricityCourses('determinism'),
    );
    expect(generateMotricityCourses('a')).not.toEqual(
      generateMotricityCourses('b'),
    );
  });

  it('produces three courses of straight segments limited to horizontal, vertical and 45 degrees', () => {
    for (const seed of SAMPLE_SEEDS) {
      const courses = generateMotricityCourses(seed);
      expect(courses).toHaveLength(MOTRICITY_COURSE_COUNT);
      expect(courses[0].segments.length).toBe(5);
      expect(courses[1].segments.length).toBeGreaterThanOrEqual(10);
      expect(courses[1].segments.length).toBeLessThanOrEqual(11);
      expect(courses[2].segments.length).toBe(14);
      for (const course of courses) {
        for (const segment of course.segments) {
          const dx = Math.abs(segment.end.x - segment.start.x);
          const dy = Math.abs(segment.end.y - segment.start.y);
          const straight = dx < 1e-6 || dy < 1e-6 || Math.abs(dx - dy) < 1e-6;
          expect(straight).toBe(true);
        }
        for (let index = 1; index < course.segments.length; index += 1) {
          const previous = course.segments[index - 1];
          const current = course.segments[index];
          const previousDir = Math.atan2(
            previous.end.y - previous.start.y,
            previous.end.x - previous.start.x,
          );
          const currentDir = Math.atan2(
            current.end.y - current.start.y,
            current.end.x - current.start.x,
          );
          expect(Math.abs(previousDir - currentDir)).toBeGreaterThan(1e-6);
        }
      }
    }
  });

  it('shrinks the corridor width by twenty percent and stays inside the canvas', () => {
    for (const seed of SAMPLE_SEEDS) {
      for (const course of generateMotricityCourses(seed)) {
        const first = course.segments[0].width;
        const last = course.segments[course.segments.length - 1].width;
        expect(last / first).toBeCloseTo(1 - MOTRICITY_WIDTH_SHRINK, 5);
        for (const point of course.polygon) {
          expect(Number.isFinite(point.x)).toBe(true);
          expect(Number.isFinite(point.y)).toBe(true);
          expect(point.x).toBeGreaterThanOrEqual(-1);
          expect(point.x).toBeLessThanOrEqual(MOTRICITY_CANVAS_WIDTH + 1);
          expect(point.y).toBeGreaterThanOrEqual(0);
          expect(point.y).toBeLessThanOrEqual(MOTRICITY_CANVAS_HEIGHT);
        }
      }
    }
  });

  it('raises the difficulty across courses and makes the third one backtrack', () => {
    for (const seed of SAMPLE_SEEDS) {
      const courses = generateMotricityCourses(seed);
      expect(courses[0].totalLength).toBeLessThan(courses[1].totalLength);
      expect(courses[1].totalLength).toBeLessThan(courses[2].totalLength);
      expect(courses[2].totalLength).toBeGreaterThan(
        courses[0].totalLength * 1.5,
      );
      const goesBackward = (course: MotricityCourse): boolean =>
        course.segments.some((segment) => segment.end.x < segment.start.x - 1);
      expect(goesBackward(courses[0])).toBe(false);
      expect(goesBackward(courses[1])).toBe(false);
      expect(goesBackward(courses[2])).toBe(true);
      const diagonalCount = courses[2].segments.filter((segment) => {
        const dx = Math.abs(segment.end.x - segment.start.x);
        const dy = Math.abs(segment.end.y - segment.start.y);
        return dx > 1e-6 && Math.abs(dx - dy) < 1e-6;
      }).length;
      expect(diagonalCount).toBeGreaterThanOrEqual(5);
    }
  });

  it('builds a closed garage slightly wider than the corridor with the start inside', () => {
    for (const seed of SAMPLE_SEEDS) {
      for (const course of generateMotricityCourses(seed)) {
        expect(course.garage.height).toBeGreaterThan(
          course.segments[0].width,
        );
        expect(course.garageWalls).toHaveLength(5);
        expect(
          motricityCursorZone(course, course.startPosition),
        ).toBe('GARAGE');
      }
    }
  });
});

describe('scoreMotricityCourse', () => {
  const course = generateMotricityCourses('scoring')[0];
  const first = course.segments[0];
  const midX = first.start.x + first.length / 2;
  const borderY = first.start.y + first.width / 2 - 3;
  const outsideY = first.start.y + first.width / 2 + 30;

  function episode(
    positions: { fromMs: number; toMs: number; y: number }[],
  ): MotricitySampleDto[] {
    const samples: MotricitySampleDto[] = [];
    const endMs = positions[positions.length - 1].toMs;
    for (let t = 0; t <= endMs; t += FRAME_MS) {
      const active = positions.find(
        (position) => t >= position.fromMs && t < position.toMs,
      );
      samples.push({
        t: Math.round(t),
        x: midX,
        y: active ? active.y : first.start.y,
      });
    }
    return samples;
  }

  it('counts one minor error per continuous border contact episode', () => {
    const grazing = episode([
      { fromMs: 1000, toMs: 1500, y: borderY },
      { fromMs: 3000, toMs: 3400, y: borderY },
    ]);
    const scored = scoreMotricityCourse(course, grazing);
    expect(scored.minorErrors).toBe(2);
    expect(scored.majorErrors).toBe(0);
  });

  it('grants two major errors for a 2.4 second exit and none for 0.8 second', () => {
    const longExit = scoreMotricityCourse(
      course,
      episode([{ fromMs: 1000, toMs: 3400, y: outsideY }]),
    );
    expect(longExit.majorErrors).toBe(2);
    expect(longExit.minorErrors).toBe(1);

    const shortExit = scoreMotricityCourse(
      course,
      episode([{ fromMs: 1000, toMs: 1800, y: outsideY }]),
    );
    expect(shortExit.majorErrors).toBe(0);
    expect(shortExit.minorErrors).toBe(1);
  });

  it('counts nothing inside the garage', () => {
    const nearGarageWall: MotricitySampleDto[] = Array.from(
      { length: 120 },
      (_, index) => ({
        t: Math.round(index * FRAME_MS),
        x: course.garage.x + 2,
        y: course.garage.y + 2,
      }),
    );
    const scored = scoreMotricityCourse(course, nearGarageWall);
    expect(scored.minorErrors).toBe(0);
    expect(scored.majorErrors).toBe(0);
    expect(scored.progressionPct).toBe(0);
  });

  it('scores a clean full run with progression, no errors and a speed bonus', () => {
    const samples = walkCenterline(course, 50_000);
    const scored = scoreMotricityCourse(course, samples);
    expect(scored.progressionPct).toBe(100);
    expect(scored.minorErrors).toBe(0);
    expect(scored.majorErrors).toBe(0);
    expect(scored.tReelMs).toBeLessThanOrEqual(50_010);
    const expectedSpeed = ((90 - scored.tReelMs / 1000) / 70) * 100;
    expect(scored.score).toBeCloseTo(70 + 0.3 * expectedSpeed, 0);
  });

  it('gives no speed points when the course is not fully crossed', () => {
    const samples = walkCenterline(course, 60_000, 70);
    const scored = scoreMotricityCourse(course, samples);
    expect(scored.progressionPct).toBeGreaterThanOrEqual(69);
    expect(scored.progressionPct).toBeLessThanOrEqual(71);
    expect(scored.score).toBeCloseTo(0.7 * scored.progressionPct, 0);
  });
});

describe('scoreMotricityRecap calibration', () => {
  function recap(
    overrides: Partial<Parameters<typeof scoreMotricityRecap>[0]>,
  ): Parameters<typeof scoreMotricityRecap>[0] {
    return {
      minorErrors: 0,
      majorErrors: 0,
      progressionPct: 100,
      tReelMs: 20_000,
      ...overrides,
    };
  }

  it('scores a clean fast course around ninety', () => {
    expect(scoreMotricityRecap(recap({ tReelMs: 43_500 }))).toBeCloseTo(90, 0);
  });

  it('scores a clean course finished at eighty-five seconds around seventy-two', () => {
    expect(scoreMotricityRecap(recap({ tReelMs: 85_000 }))).toBeCloseTo(72, 0);
  });

  it('scores one major error at a good pace at seventy-five', () => {
    expect(
      scoreMotricityRecap(recap({ majorErrors: 1, tReelMs: 50_333 })),
    ).toBeCloseTo(75, 0);
  });

  it('floors a course with twenty-two major errors at zero', () => {
    expect(scoreMotricityRecap(recap({ majorErrors: 22 }))).toBe(0);
    expect(
      scoreMotricityRecap(recap({ minorErrors: 30, majorErrors: 30 })),
    ).toBe(0);
  });
});

describe('motricityCourseFinished', () => {
  const course = generateMotricityCourses('finish')[0];

  it('accepts a fully crossed course and a course played to the timer', () => {
    expect(motricityCourseFinished(course, walkCenterline(course, 45_000))).toBe(
      true,
    );
    const timedOut = walkCenterline(course, 90_000, 60);
    expect(motricityCourseFinished(course, timedOut)).toBe(true);
  });

  it('rejects a course neither crossed nor played to the timer', () => {
    expect(
      motricityCourseFinished(course, walkCenterline(course, 30_000, 60)),
    ).toBe(false);
    expect(motricityCourseFinished(course, [])).toBe(false);
  });

  it('rejects a trajectory that jumps to the arrival without traversing the path', () => {
    const start = course.centerline[0];
    const end = course.centerline[course.centerline.length - 1];
    const teleport: MotricitySampleDto[] = [
      { t: 0, x: start.x, y: start.y },
      { t: 17, x: end.x, y: end.y },
      { t: 34, x: end.x, y: end.y },
    ];
    expect(motricityCourseFinished(course, teleport)).toBe(false);
  });
});

describe('scoreMotricitySession', () => {
  it('weights the third course at one and a half and rounds the aggregate', () => {
    const courses = generateMotricityCourses('aggregate');
    const trajectories = courses.map((course) => ({
      index: course.index,
      samples: walkCenterline(course, 45_000 + course.index * 5_000),
    }));
    const session = scoreMotricitySession(trajectories, 'aggregate');
    const [s1, s2, s3] = session.courses.map(({ score }) => score);
    const expected =
      (s1 + s2 + MOTRICITY_FINAL_COURSE_WEIGHT * s3) /
      (2 + MOTRICITY_FINAL_COURSE_WEIGHT);
    expect(Math.abs(session.score - expected)).toBeLessThanOrEqual(1);
    expect(session.courses.map(({ progressionPct }) => progressionPct)).toEqual(
      [100, 100, 100],
    );
  });

  it('exposes the exit duration to major errors mapping', () => {
    expect(majorErrorsForExitDuration(800)).toBe(0);
    expect(majorErrorsForExitDuration(1000)).toBe(0);
    expect(majorErrorsForExitDuration(1001)).toBe(1);
    expect(majorErrorsForExitDuration(2400)).toBe(2);
    expect(majorErrorsForExitDuration(3400)).toBe(3);
  });
});

describe('motricityProgressionPct', () => {
  it('is zero at the garage exit and one hundred at the arrival zone', () => {
    for (const seed of SAMPLE_SEEDS) {
      const course = generateMotricityCourses(seed)[0];
      expect(motricityProgressionPct(course, course.centerline[0])).toBe(0);
      expect(
        motricityProgressionPct(
          course,
          course.centerline[course.centerline.length - 1],
        ),
      ).toBe(100);
      expect(
        motricityProgressionPct(course, insidePoint(course)),
      ).toBeGreaterThan(0);
    }
  });
});

describe('motricityAdvanceArc', () => {
  function segment(
    start: MotricityPoint,
    end: MotricityPoint,
  ): MotricitySegment {
    return {
      start,
      end,
      width: 24,
      length: Math.hypot(end.x - start.x, end.y - start.y),
    };
  }

  it('keeps advancing when the cursor is offset toward an earlier fold-back segment', () => {
    const foldBack = {
      segments: [
        segment({ x: 0, y: 0 }, { x: 100, y: 0 }),
        segment({ x: 100, y: 0 }, { x: 100, y: 12 }),
        segment({ x: 100, y: 12 }, { x: 0, y: 12 }),
      ],
    } as unknown as MotricityCourse;
    const previousArc = 160;
    const offsetCursor = { x: 50, y: 4 };

    const arc = motricityAdvanceArc(foldBack, offsetCursor, previousArc, 5);

    expect(arc).toBeGreaterThan(previousArc);
    expect(arc).toBeCloseTo(162, 0);
  });
});
