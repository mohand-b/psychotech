import {
  MOTRICITY_CANVAS_HEIGHT,
  MOTRICITY_CANVAS_WIDTH,
  MotricityCourse,
  MotricityPoint,
} from '@psychotech/shared';

export const MOTRICITY_BADGE_WIDTH = 58;
export const MOTRICITY_BADGE_HEIGHT = 24;

const BADGE_GAP = 12;
const CANVAS_EDGE = 8;

function clampX(x: number): number {
  return Math.min(
    Math.max(x, CANVAS_EDGE),
    MOTRICITY_CANVAS_WIDTH - MOTRICITY_BADGE_WIDTH - CANVAS_EDGE,
  );
}

export function motricityStartBadgePlacement(
  course: MotricityCourse,
): MotricityPoint {
  const below = course.garage.y + course.garage.height + BADGE_GAP;
  const y =
    below + MOTRICITY_BADGE_HEIGHT > MOTRICITY_CANVAS_HEIGHT - CANVAS_EDGE
      ? course.garage.y - BADGE_GAP - MOTRICITY_BADGE_HEIGHT
      : below;
  return { x: clampX(course.garage.x), y };
}

export function motricityEndBadgePlacement(
  course: MotricityCourse,
): MotricityPoint {
  const above = course.endZone.y - BADGE_GAP - MOTRICITY_BADGE_HEIGHT;
  const y =
    above < CANVAS_EDGE
      ? course.endZone.y + course.endZone.height + BADGE_GAP
      : above;
  return {
    x: clampX(course.endZone.x + course.endZone.width - MOTRICITY_BADGE_WIDTH),
    y,
  };
}
