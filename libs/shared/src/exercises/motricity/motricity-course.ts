export interface MotricityPoint {
  x: number;
  y: number;
}

export interface MotricityWall {
  start: MotricityPoint;
  end: MotricityPoint;
}

export interface MotricityRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MotricitySegment {
  start: MotricityPoint;
  end: MotricityPoint;
  width: number;
  length: number;
}

export interface MotricityCourse {
  index: number;
  centerline: MotricityPoint[];
  segments: MotricitySegment[];
  leftSide: MotricityPoint[];
  rightSide: MotricityPoint[];
  polygon: MotricityPoint[];
  garage: MotricityRect;
  garageWalls: MotricityWall[];
  startPosition: MotricityPoint;
  endZone: MotricityRect;
  totalLength: number;
}

export const MOTRICITY_CANVAS_WIDTH = 1000;
export const MOTRICITY_CANVAS_HEIGHT = 620;
export const MOTRICITY_CURSOR_RADIUS = 9;
export const MOTRICITY_CURSOR_SPEED_UNITS_PER_SEC = 30;
export const MOTRICITY_SAMPLE_INTERVAL_MS = 1000 / 60;

export type MotricityCursorZone =
  | 'GARAGE'
  | 'END'
  | 'INSIDE'
  | 'TOUCHING'
  | 'OUTSIDE';

function inRect(rect: MotricityRect, point: MotricityPoint): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

function pointInPolygon(
  polygon: MotricityPoint[],
  point: MotricityPoint,
): boolean {
  let inside = false;
  for (
    let current = 0, previous = polygon.length - 1;
    current < polygon.length;
    previous = current, current += 1
  ) {
    const a = polygon[current];
    const b = polygon[previous];
    const crosses =
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
    if (crosses) {
      inside = !inside;
    }
  }
  return inside;
}

export function distanceToSegment(
  point: MotricityPoint,
  start: MotricityPoint,
  end: MotricityPoint,
): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSq = dx * dx + dy * dy;
  const t =
    lengthSq === 0
      ? 0
      : Math.min(
          1,
          Math.max(
            0,
            ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq,
          ),
        );
  const px = start.x + t * dx;
  const py = start.y + t * dy;
  return Math.hypot(point.x - px, point.y - py);
}

function distanceToBorder(
  course: MotricityCourse,
  point: MotricityPoint,
): number {
  let min = Infinity;
  const sides = [course.leftSide, course.rightSide];
  for (const side of sides) {
    for (let index = 0; index < side.length - 1; index += 1) {
      min = Math.min(
        min,
        distanceToSegment(point, side[index], side[index + 1]),
      );
    }
  }
  return min;
}

export function motricityCursorZone(
  course: MotricityCourse,
  point: MotricityPoint,
  radius: number = MOTRICITY_CURSOR_RADIUS,
): MotricityCursorZone {
  if (inRect(course.garage, point)) {
    return 'GARAGE';
  }
  if (inRect(course.endZone, point)) {
    return 'END';
  }
  if (!pointInPolygon(course.polygon, point)) {
    return 'OUTSIDE';
  }
  return distanceToBorder(course, point) < radius ? 'TOUCHING' : 'INSIDE';
}

export function motricityArcLength(
  course: MotricityCourse,
  point: MotricityPoint,
): number {
  let bestDistance = Infinity;
  let bestArc = 0;
  let accumulated = 0;
  for (const segment of course.segments) {
    const dx = segment.end.x - segment.start.x;
    const dy = segment.end.y - segment.start.y;
    const lengthSq = dx * dx + dy * dy;
    const t =
      lengthSq === 0
        ? 0
        : Math.min(
            1,
            Math.max(
              0,
              ((point.x - segment.start.x) * dx +
                (point.y - segment.start.y) * dy) /
                lengthSq,
            ),
          );
    const px = segment.start.x + t * dx;
    const py = segment.start.y + t * dy;
    const distance = Math.hypot(point.x - px, point.y - py);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestArc = accumulated + t * segment.length;
    }
    accumulated += segment.length;
  }
  return bestArc;
}

export function motricityProgressionPct(
  course: MotricityCourse,
  point: MotricityPoint,
): number {
  return Math.min(
    100,
    Math.max(0, (motricityArcLength(course, point) / course.totalLength) * 100),
  );
}
