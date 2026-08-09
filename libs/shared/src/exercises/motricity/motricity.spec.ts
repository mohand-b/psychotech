import { describe, expect, it } from 'vitest';
import { MotricitySampleDto } from '../../dtos/session';
import {
  MOTRICITY_COURSE_COUNT,
  MOTRICITY_COURSE_PROFILES,
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
  motricityAnchoredArc,
  motricityArcAdvanceBudget,
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

function centerlinePositionAtPct(
  course: MotricityCourse,
  pct: number,
): MotricityPoint {
  let remaining = (pct / 100) * course.totalLength;
  let position = course.centerline[0];
  for (const segment of course.segments) {
    if (remaining <= segment.length) {
      const ratio = remaining / segment.length;
      return {
        x: segment.start.x + (segment.end.x - segment.start.x) * ratio,
        y: segment.start.y + (segment.end.y - segment.start.y) * ratio,
      };
    }
    remaining -= segment.length;
    position = segment.end;
  }
  return position;
}

function walkCenterline(
  course: MotricityCourse,
  durationMs: number,
  untilPct = 100,
): MotricitySampleDto[] {
  const sampleCount = Math.round(durationMs / FRAME_MS);
  const samples: MotricitySampleDto[] = [];
  for (let index = 0; index <= sampleCount; index += 1) {
    const position = centerlinePositionAtPct(
      course,
      (index / sampleCount) * untilPct,
    );
    samples.push({
      t: Math.round(index * FRAME_MS),
      x: position.x,
      y: position.y,
    });
  }
  return samples;
}

function outsidePointNear(
  course: MotricityCourse,
  target: MotricityPoint,
): MotricityPoint {
  const directions = [
    { x: 0, y: 1 },
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: -1, y: 0 },
  ];
  for (let radius = 40; radius <= 400; radius += 20) {
    for (const direction of directions) {
      const candidate = {
        x: target.x + direction.x * radius,
        y: target.y + direction.y * radius,
      };
      if (motricityCursorZone(course, candidate) === 'OUTSIDE') {
        return candidate;
      }
    }
  }
  throw new Error('No outside point found near target');
}

function cheatingTrajectory(course: MotricityCourse): MotricitySampleDto[] {
  const samples: MotricitySampleDto[] = [];
  let t = 0;
  const push = (position: MotricityPoint) => {
    samples.push({ t: Math.round(t), x: position.x, y: position.y });
    t += FRAME_MS;
  };
  for (let step = 0; step <= 600; step += 1) {
    push(centerlinePositionAtPct(course, (step / 600) * 30));
  }
  const outside = outsidePointNear(course, centerlinePositionAtPct(course, 50));
  for (let step = 0; step < 150; step += 1) {
    push(outside);
  }
  for (let step = 0; step <= 600; step += 1) {
    push(centerlinePositionAtPct(course, 70 + (step / 600) * 30));
  }
  return samples;
}

function insidePoint(course: MotricityCourse): MotricitySampleDto {
  const position = centerlinePositionAtPct(course, 10);
  return { t: 0, x: position.x, y: position.y };
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
      courses.forEach((generated, index) => {
        const bounds = MOTRICITY_COURSE_PROFILES[index].segmentBounds;
        expect(generated.segments.length).toBeGreaterThanOrEqual(bounds[0]);
        expect(generated.segments.length).toBeLessThanOrEqual(bounds[1]);
      });
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

  it('raises the difficulty across profiles and makes the third one a serpentine', () => {
    for (const seed of SAMPLE_SEEDS) {
      const courses = generateMotricityCourses(seed);
      courses.forEach((course, index) => {
        expect(course.totalLength).toBeGreaterThanOrEqual(
          MOTRICITY_COURSE_PROFILES[index].minCurvilinearLength,
        );
      });
      const progressionSign = (course: MotricityCourse): number =>
        Math.sign(
          course.centerline[course.centerline.length - 1].x -
            course.centerline[0].x,
        );
      const backwardCount = (course: MotricityCourse): number => {
        const sign = progressionSign(course);
        let runs = 0;
        let inRun = false;
        for (const segment of course.segments) {
          const backward = (segment.end.x - segment.start.x) * sign < -1;
          if (backward && !inRun) {
            runs += 1;
          }
          inRun = backward;
        }
        return runs;
      };
      expect(backwardCount(courses[0])).toBe(0);
      expect(backwardCount(courses[1])).toBeLessThanOrEqual(1);
      expect(backwardCount(courses[2])).toBeGreaterThanOrEqual(2);
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
  const firstDx = first.end.x - first.start.x;
  const firstDy = first.end.y - first.start.y;
  const firstNormal = {
    x: -firstDy / first.length,
    y: firstDx / first.length,
  };
  const midpoint = {
    x: (first.start.x + first.end.x) / 2,
    y: (first.start.y + first.end.y) / 2,
  };
  const offsetPoint = (offset: number): MotricityPoint => ({
    x: midpoint.x + firstNormal.x * offset,
    y: midpoint.y + firstNormal.y * offset,
  });
  const borderPoint = offsetPoint(first.width / 2 - 3);
  const outsidePoint = offsetPoint(first.width / 2 + 12);

  function episode(
    positions: { fromMs: number; toMs: number; point: MotricityPoint }[],
  ): MotricitySampleDto[] {
    const samples: MotricitySampleDto[] = [];
    const endMs = positions[positions.length - 1].toMs;
    for (let t = 0; t <= endMs; t += FRAME_MS) {
      const active = positions.find(
        (position) => t >= position.fromMs && t < position.toMs,
      );
      const point = active ? active.point : midpoint;
      samples.push({ t: Math.round(t), x: point.x, y: point.y });
    }
    return samples;
  }

  it('counts one minor error per continuous border contact episode', () => {
    const grazing = episode([
      { fromMs: 1000, toMs: 1500, point: borderPoint },
      { fromMs: 3000, toMs: 3400, point: borderPoint },
    ]);
    const scored = scoreMotricityCourse(course, grazing);
    expect(scored.minorErrors).toBe(2);
    expect(scored.majorErrors).toBe(0);
  });

  it('grants two major errors for a 2.4 second exit and none for 0.8 second', () => {
    const longExit = scoreMotricityCourse(
      course,
      episode([{ fromMs: 1000, toMs: 3400, point: outsidePoint }]),
    );
    expect(longExit.majorErrors).toBe(2);
    expect(longExit.minorErrors).toBe(1);

    const shortExit = scoreMotricityCourse(
      course,
      episode([{ fromMs: 1000, toMs: 1800, point: outsidePoint }]),
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

  it('scores a perfect completed run at one hundred, whatever the pace', () => {
    const samples = walkCenterline(course, 50_000);
    const scored = scoreMotricityCourse(course, samples);
    expect(scored.progressionPct).toBe(100);
    expect(scored.minorErrors).toBe(0);
    expect(scored.majorErrors).toBe(0);
    expect(scored.score).toBe(100);
  });

  it('gives identical scores to two runs that only differ by their time', () => {
    const fast = scoreMotricityCourse(course, walkCenterline(course, 30_000));
    const slow = scoreMotricityCourse(course, walkCenterline(course, 85_000));
    expect(fast.progressionPct).toBe(100);
    expect(slow.progressionPct).toBe(100);
    expect(fast.tReelMs).toBeLessThan(slow.tReelMs);
    expect(fast.score).toBe(slow.score);
    expect(fast.score).toBe(100);
  });

  it('keeps punishing an unfinished course through its progression', () => {
    const samples = walkCenterline(course, 60_000, 70);
    const scored = scoreMotricityCourse(course, samples);
    expect(scored.progressionPct).toBeGreaterThanOrEqual(69);
    expect(scored.progressionPct).toBeLessThanOrEqual(71);
    expect(scored.score).toBeCloseTo(scored.progressionPct, 0);
  });

  it('completes a cheating run, counts its major errors, and matches the live arc tracking', () => {
    const cheat = cheatingTrajectory(course);
    const scored = scoreMotricityCourse(course, cheat);

    expect(scored.progressionPct).toBe(100);
    expect(scored.minorErrors).toBeGreaterThanOrEqual(1);
    expect(scored.majorErrors).toBeGreaterThanOrEqual(2);

    let liveArc = 0;
    let previousT = 0;
    for (const sample of cheat) {
      liveArc = motricityAnchoredArc(
        course,
        sample,
        liveArc,
        sample.t - previousT,
      );
      previousT = sample.t;
    }
    const liveProgression = Math.min(
      100,
      (liveArc / course.totalLength) * 100,
    );
    expect(scored.progressionPct).toBe(Math.round(liveProgression));
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

  it('scores a clean completed course at one hundred whatever the time within the limit', () => {
    expect(scoreMotricityRecap(recap({ tReelMs: 20_000 }))).toBe(100);
    expect(scoreMotricityRecap(recap({ tReelMs: 43_500 }))).toBe(100);
    expect(scoreMotricityRecap(recap({ tReelMs: 85_000 }))).toBe(100);
  });

  it('never lets the time change a score between two otherwise identical runs', () => {
    const base = { minorErrors: 2, majorErrors: 1, progressionPct: 100 };
    expect(scoreMotricityRecap({ ...base, tReelMs: 25_000 })).toBe(
      scoreMotricityRecap({ ...base, tReelMs: 88_000 }),
    );
  });

  it('deducts twelve points per major error and four per minor error', () => {
    expect(scoreMotricityRecap(recap({ majorErrors: 1 }))).toBe(88);
    expect(scoreMotricityRecap(recap({ minorErrors: 1 }))).toBe(96);
  });

  it('floors a course with twenty-two major errors at zero', () => {
    expect(scoreMotricityRecap(recap({ majorErrors: 22 }))).toBe(0);
    expect(
      scoreMotricityRecap(recap({ minorErrors: 30, majorErrors: 30 })),
    ).toBe(0);
  });

  it('scores the witness session case at one hundred', () => {
    const finishedCourse = {
      minorErrors: 0,
      majorErrors: 0,
      progressionPct: 100,
      tReelMs: 45_000,
    };
    expect(scoreMotricityRecap(finishedCourse)).toBe(100);
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

  it('accepts a trajectory that reenters the corridor at the arrival', () => {
    const start = course.centerline[0];
    const end = course.centerline[course.centerline.length - 1];
    const teleport: MotricitySampleDto[] = [
      { t: 0, x: start.x, y: start.y },
      { t: 17, x: end.x, y: end.y },
      { t: 34, x: end.x, y: end.y },
    ];
    expect(motricityCourseFinished(course, teleport)).toBe(true);
  });

  it('accepts a cheating trajectory that skips a section outside the corridor', () => {
    expect(motricityCourseFinished(course, cheatingTrajectory(course))).toBe(
      true,
    );
  });
});

describe('motricityAnchoredArc', () => {
  const course = generateMotricityCourses('anchor')[0];

  it('anchors the arc to the curvilinear projection when the cursor is inside the corridor', () => {
    const reentry = centerlinePositionAtPct(course, 60);
    expect(motricityCursorZone(course, reentry)).toBe('INSIDE');
    const previousArc = 0.1 * course.totalLength;
    const arc = motricityAnchoredArc(course, reentry, previousArc, 16);
    expect(arc).toBeCloseTo(0.6 * course.totalLength, 0);
  });

  it('keeps the budgeted advance while the cursor stays outside the corridor', () => {
    const target = centerlinePositionAtPct(course, 60);
    const outside = outsidePointNear(course, target);
    const previousArc = 0.1 * course.totalLength;
    const arc = motricityAnchoredArc(course, outside, previousArc, 16);
    expect(arc).toBeLessThanOrEqual(
      previousArc + motricityArcAdvanceBudget(16),
    );
  });

  it('never decreases across a trajectory that exits and reenters', () => {
    let arc = 0;
    let previousT = 0;
    for (const sample of cheatingTrajectory(course)) {
      const next = motricityAnchoredArc(course, sample, arc, sample.t - previousT);
      expect(next).toBeGreaterThanOrEqual(arc);
      arc = next;
      previousT = sample.t;
    }
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
