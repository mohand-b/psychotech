import {
  MOTRICITY_CANVAS_HEIGHT,
  MOTRICITY_CANVAS_WIDTH,
  MotricityCourse,
  MotricityPoint,
  MotricityRect,
  rectToSegmentDistance,
} from '@psychotech/shared';

export const MOTRICITY_BADGE_WIDTH = 58;
export const MOTRICITY_BADGE_HEIGHT = 24;

const BADGE_GAP = 12;
const CANVAS_EDGE = 8;
const CORRIDOR_PADDING = 6;

function clampBadgeX(x: number): number {
  return Math.min(
    Math.max(x, CANVAS_EDGE),
    MOTRICITY_CANVAS_WIDTH - MOTRICITY_BADGE_WIDTH - CANVAS_EDGE,
  );
}

function clampBadgeY(y: number): number {
  return Math.min(
    Math.max(y, CANVAS_EDGE),
    MOTRICITY_CANVAS_HEIGHT - MOTRICITY_BADGE_HEIGHT - CANVAS_EDGE,
  );
}

function listCandidatePlacements(anchor: MotricityRect): MotricityPoint[] {
  const centeredX = clampBadgeX(
    anchor.x + anchor.width / 2 - MOTRICITY_BADGE_WIDTH / 2,
  );
  const below = anchor.y + anchor.height + BADGE_GAP;
  const above = anchor.y - BADGE_GAP - MOTRICITY_BADGE_HEIGHT;
  const right = anchor.x + anchor.width + BADGE_GAP;
  const left = anchor.x - BADGE_GAP - MOTRICITY_BADGE_WIDTH;
  const centeredY = clampBadgeY(
    anchor.y + anchor.height / 2 - MOTRICITY_BADGE_HEIGHT / 2,
  );
  return [
    { x: centeredX, y: below },
    { x: centeredX, y: above },
    { x: right, y: centeredY },
    { x: left, y: centeredY },
  ];
}

function isBadgeInsideCanvas(placement: MotricityPoint): boolean {
  return (
    placement.x >= CANVAS_EDGE &&
    placement.y >= CANVAS_EDGE &&
    placement.x + MOTRICITY_BADGE_WIDTH <=
      MOTRICITY_CANVAS_WIDTH - CANVAS_EDGE &&
    placement.y + MOTRICITY_BADGE_HEIGHT <=
      MOTRICITY_CANVAS_HEIGHT - CANVAS_EDGE
  );
}

function computeCorridorClearance(
  course: MotricityCourse,
  placement: MotricityPoint,
): number {
  const badgeRect: MotricityRect = {
    x: placement.x,
    y: placement.y,
    width: MOTRICITY_BADGE_WIDTH,
    height: MOTRICITY_BADGE_HEIGHT,
  };
  let clearance = Infinity;
  for (const segment of course.segments) {
    const distance =
      rectToSegmentDistance(badgeRect, segment.start, segment.end) -
      segment.width / 2;
    clearance = Math.min(clearance, distance);
  }
  return clearance;
}

function placeBadge(
  course: MotricityCourse,
  anchor: MotricityRect,
): MotricityPoint {
  const candidates =
    listCandidatePlacements(anchor).filter(isBadgeInsideCanvas);
  let best: MotricityPoint = candidates[0] ?? {
    x: CANVAS_EDGE,
    y: CANVAS_EDGE,
  };
  let bestClearance = -Infinity;
  for (const candidate of candidates) {
    const clearance = computeCorridorClearance(course, candidate);
    if (clearance >= CORRIDOR_PADDING) {
      return candidate;
    }
    if (clearance > bestClearance) {
      bestClearance = clearance;
      best = candidate;
    }
  }
  return best;
}

export function placeMotricityStartBadge(
  course: MotricityCourse,
): MotricityPoint {
  return placeBadge(course, course.garage);
}

export function placeMotricityEndBadge(
  course: MotricityCourse,
): MotricityPoint {
  return placeBadge(course, course.endZone);
}
