import {
  MOTRICITY_CANVAS_HEIGHT,
  MOTRICITY_CANVAS_WIDTH,
  generateMotricityCourses,
} from '@psychotech/shared';
import {
  MOTRICITY_BADGE_HEIGHT,
  MOTRICITY_BADGE_WIDTH,
  motricityEndBadgePlacement,
  motricityStartBadgePlacement,
} from './motricity-badge-placement';

describe('motricity badge placement', () => {
  it('keeps both badges fully inside the canvas over varied seeded courses', () => {
    for (let index = 0; index < 30; index += 1) {
      for (const course of generateMotricityCourses(`badges-${index}`)) {
        for (const badge of [
          motricityStartBadgePlacement(course),
          motricityEndBadgePlacement(course),
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
    }
  });

  it('flips the start badge above a garage stuck to the bottom edge', () => {
    const course = generateMotricityCourses('badges-flip')[0];
    const grounded = {
      ...course,
      garage: {
        ...course.garage,
        y: MOTRICITY_CANVAS_HEIGHT - course.garage.height - 2,
      },
    };
    const badge = motricityStartBadgePlacement(grounded);
    expect(badge.y + MOTRICITY_BADGE_HEIGHT).toBeLessThan(grounded.garage.y);
  });

  it('flips the end badge below an end zone stuck to the top edge', () => {
    const course = generateMotricityCourses('badges-flip')[0];
    const raised = {
      ...course,
      endZone: { ...course.endZone, y: 2 },
    };
    const badge = motricityEndBadgePlacement(raised);
    expect(badge.y).toBeGreaterThan(raised.endZone.y + raised.endZone.height);
  });
});
