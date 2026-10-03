import {
  MOTRICITY_CANVAS_HEIGHT,
  MOTRICITY_CANVAS_WIDTH,
  MotricityCourse,
  MotricityPoint,
  MotricityRect,
  generateMotricityCourses,
  rectToSegmentDistance,
} from '@psychotech/shared';
import {
  MOTRICITY_BADGE_HEIGHT,
  MOTRICITY_BADGE_WIDTH,
  placeMotricityEndBadge,
  placeMotricityStartBadge,
} from './motricity-badge-placement';

function badgeRect(placement: MotricityPoint): MotricityRect {
  return {
    x: placement.x,
    y: placement.y,
    width: MOTRICITY_BADGE_WIDTH,
    height: MOTRICITY_BADGE_HEIGHT,
  };
}

function computeCorridorClearance(
  course: MotricityCourse,
  placement: MotricityPoint,
): number {
  return Math.min(
    ...course.segments.map(
      (segment) =>
        rectToSegmentDistance(
          badgeRect(placement),
          segment.start,
          segment.end,
        ) -
        segment.width / 2,
    ),
  );
}

function rectsOverlap(a: MotricityRect, b: MotricityRect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

describe('motricity badge placement', () => {
  let seededCourses: MotricityCourse[] = [];

  beforeAll(() => {
    seededCourses = Array.from({ length: 30 }, (_, index) =>
      generateMotricityCourses(`badges-${index}`),
    ).flat();
  }, 60_000);

  it('keeps both badges fully inside the canvas over varied seeded courses', () => {
    for (const course of seededCourses) {
      for (const badge of [
        placeMotricityStartBadge(course),
        placeMotricityEndBadge(course),
      ]) {
        expect(badge.x).toBeGreaterThanOrEqual(0);
        expect(badge.y).toBeGreaterThanOrEqual(0);
        expect(badge.x + MOTRICITY_BADGE_WIDTH).toBeLessThanOrEqual(
          MOTRICITY_CANVAS_WIDTH,
        );
        expect(badge.y + MOTRICITY_BADGE_HEIGHT).toBeLessThanOrEqual(
          MOTRICITY_CANVAS_HEIGHT,
        );
      }
    }
  });

  it('never lets a badge intrude on the corridor over varied seeded courses', () => {
    for (const course of seededCourses) {
      expect(
        computeCorridorClearance(course, placeMotricityStartBadge(course)),
      ).toBeGreaterThan(0);
      expect(
        computeCorridorClearance(course, placeMotricityEndBadge(course)),
      ).toBeGreaterThan(0);
    }
  });

  it('never overlaps a badge with its own anchor zone', () => {
    for (const course of seededCourses) {
      expect(
        rectsOverlap(
          badgeRect(placeMotricityStartBadge(course)),
          course.garage,
        ),
      ).toBe(false);
      expect(
        rectsOverlap(badgeRect(placeMotricityEndBadge(course)), course.endZone),
      ).toBe(false);
    }
  });

  it('keeps the start badge in canvas for a garage stuck to the bottom edge', () => {
    const course = generateMotricityCourses('badges-flip')[0];
    const grounded = {
      ...course,
      garage: {
        ...course.garage,
        y: MOTRICITY_CANVAS_HEIGHT - course.garage.height - 2,
      },
    };
    const badge = placeMotricityStartBadge(grounded);
    expect(badge.y + MOTRICITY_BADGE_HEIGHT).toBeLessThanOrEqual(
      MOTRICITY_CANVAS_HEIGHT,
    );
    expect(rectsOverlap(badgeRect(badge), grounded.garage)).toBe(false);
  });

  it('keeps the end badge in canvas for an end zone stuck to the top edge', () => {
    const course = generateMotricityCourses('badges-flip')[0];
    const raised = {
      ...course,
      endZone: { ...course.endZone, y: 2 },
    };
    const badge = placeMotricityEndBadge(raised);
    expect(badge.y).toBeGreaterThanOrEqual(0);
    expect(rectsOverlap(badgeRect(badge), raised.endZone)).toBe(false);
  });
});
