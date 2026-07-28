import {
  MotricityPoint,
  MotricityRect,
  distanceToSegment,
} from './motricity-course';

export function offsetPolyline(
  points: MotricityPoint[],
  widths: number[],
  side: -1 | 1,
): MotricityPoint[] {
  const normals = points.slice(0, -1).map((point, index) => {
    const dx = points[index + 1].x - point.x;
    const dy = points[index + 1].y - point.y;
    const length = Math.hypot(dx, dy);
    return { x: (-dy / length) * side, y: (dx / length) * side };
  });
  const result: MotricityPoint[] = [
    {
      x: points[0].x + normals[0].x * (widths[0] / 2),
      y: points[0].y + normals[0].y * (widths[0] / 2),
    },
  ];
  for (let joint = 1; joint < points.length - 1; joint += 1) {
    const before = joint - 1;
    const a1 = {
      x: points[before].x + normals[before].x * (widths[before] / 2),
      y: points[before].y + normals[before].y * (widths[before] / 2),
    };
    const d1 = {
      x: points[joint].x - points[before].x,
      y: points[joint].y - points[before].y,
    };
    const a2 = {
      x: points[joint].x + normals[joint].x * (widths[joint] / 2),
      y: points[joint].y + normals[joint].y * (widths[joint] / 2),
    };
    const d2 = {
      x: points[joint + 1].x - points[joint].x,
      y: points[joint + 1].y - points[joint].y,
    };
    const denominator = d1.x * d2.y - d1.y * d2.x;
    const t = ((a2.x - a1.x) * d2.y - (a2.y - a1.y) * d2.x) / denominator;
    result.push({ x: a1.x + d1.x * t, y: a1.y + d1.y * t });
  }
  const last = points.length - 2;
  result.push({
    x: points[points.length - 1].x + normals[last].x * (widths[last] / 2),
    y: points[points.length - 1].y + normals[last].y * (widths[last] / 2),
  });
  return result;
}

function orientation(
  a: MotricityPoint,
  b: MotricityPoint,
  c: MotricityPoint,
): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function segmentsIntersect(
  a1: MotricityPoint,
  a2: MotricityPoint,
  b1: MotricityPoint,
  b2: MotricityPoint,
): boolean {
  const o1 = orientation(a1, a2, b1);
  const o2 = orientation(a1, a2, b2);
  const o3 = orientation(b1, b2, a1);
  const o4 = orientation(b1, b2, a2);
  return o1 * o2 < 0 && o3 * o4 < 0;
}

export function segmentToSegmentDistance(
  a1: MotricityPoint,
  a2: MotricityPoint,
  b1: MotricityPoint,
  b2: MotricityPoint,
): number {
  if (segmentsIntersect(a1, a2, b1, b2)) {
    return 0;
  }
  return Math.min(
    distanceToSegment(a1, b1, b2),
    distanceToSegment(a2, b1, b2),
    distanceToSegment(b1, a1, a2),
    distanceToSegment(b2, a1, a2),
  );
}

export function rectToSegmentDistance(
  rect: MotricityRect,
  a: MotricityPoint,
  b: MotricityPoint,
): number {
  const corners: MotricityPoint[] = [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.height },
    { x: rect.x, y: rect.y + rect.height },
  ];
  const inside = (point: MotricityPoint): boolean =>
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height;
  if (inside(a) || inside(b)) {
    return 0;
  }
  let min = Infinity;
  for (let index = 0; index < corners.length; index += 1) {
    const next = corners[(index + 1) % corners.length];
    min = Math.min(
      min,
      segmentToSegmentDistance(a, b, corners[index], next),
    );
  }
  return min;
}
