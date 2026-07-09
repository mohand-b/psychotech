import { createSeededRng, SeededRng } from '../rng';
import {
  MOTRICITY_CANVAS_HEIGHT,
  MOTRICITY_CANVAS_WIDTH,
  MotricityCourse,
  MotricityPoint,
  MotricityRect,
  MotricitySegment,
  MotricityWall,
} from './motricity-course';

export const MOTRICITY_COURSE_COUNT = 3;
export const MOTRICITY_WIDTH_SHRINK = 0.2;

const COURSE_SEGMENT_RANGES: [number, number][] = [
  [8, 9],
  [10, 11],
  [11, 12],
];
const COURSE_START_WIDTHS = [64, 58, 52];

const MARGIN_X = 30;
const MARGIN_TOP = 70;
const MARGIN_BOTTOM = 70;
const GARAGE_WIDTH_FACTOR = 1.35;
const GARAGE_DEPTH_FACTOR = 1.4;
const END_ZONE_WIDTH_FACTOR = 1.35;
const END_ZONE_DEPTH_FACTOR = 1.2;
const VERTICAL_MIN_LENGTH = 60;
const VERTICAL_MAX_LENGTH = 130;
const DENSE_TAIL_RATIO = 2 / 3;
const DENSE_DX_FACTOR = 0.6;
const MAX_SEGMENT_DX = 240;

type Direction = 'E' | 'NE' | 'SE' | 'N' | 'S';

const DIRECTION_VECTORS: Record<Direction, MotricityPoint> = {
  E: { x: 1, y: 0 },
  NE: { x: Math.SQRT1_2, y: -Math.SQRT1_2 },
  SE: { x: Math.SQRT1_2, y: Math.SQRT1_2 },
  N: { x: 0, y: -1 },
  S: { x: 0, y: 1 },
};

const TURNS: Record<Direction, Direction[]> = {
  E: ['NE', 'SE', 'N', 'S'],
  NE: ['E', 'N', 'SE'],
  SE: ['E', 'S', 'NE'],
  N: ['E', 'NE'],
  S: ['E', 'SE'],
};

function segmentLength(
  direction: Direction,
  dx: number,
  verticalLength: number,
): number {
  if (direction === 'N' || direction === 'S') {
    return verticalLength;
  }
  return direction === 'E' ? dx : dx * Math.SQRT2;
}

function buildCenterline(
  rng: SeededRng,
  segmentCount: number,
  startWidth: number,
): MotricityPoint[] {
  const garageDepth = startWidth * GARAGE_DEPTH_FACTOR;
  const endDepth = startWidth * END_ZONE_DEPTH_FACTOR;
  const startX = MARGIN_X + garageDepth;
  const startY = MOTRICITY_CANVAS_HEIGHT - MARGIN_BOTTOM - startWidth;
  const goalY = MARGIN_TOP + startWidth;
  const yMin = MARGIN_TOP;
  const yMax = MOTRICITY_CANVAS_HEIGHT - MARGIN_BOTTOM;
  const baseDx = startWidth;
  const denseFrom = Math.floor(segmentCount * DENSE_TAIL_RATIO);

  const points: MotricityPoint[] = [{ x: startX, y: startY }];
  const directions: Direction[] = [];
  let current = points[0];
  let spanLeft = MOTRICITY_CANVAS_WIDTH - MARGIN_X - endDepth - startX;

  for (let index = 0; index < segmentCount; index += 1) {
    const remaining = segmentCount - index;
    const denseFactor = index >= denseFrom ? DENSE_DX_FACTOR : 1;
    const jitter = 0.75 + rng.next() * 0.6;
    const dx = Math.min(
      MAX_SEGMENT_DX,
      Math.max(baseDx, (spanLeft / remaining) * jitter * denseFactor),
    );
    const verticalLength =
      VERTICAL_MIN_LENGTH +
      rng.next() * (VERTICAL_MAX_LENGTH - VERTICAL_MIN_LENGTH);

    let direction: Direction;
    if (index === 0 || index === segmentCount - 1) {
      direction = 'E';
    } else {
      let candidates = TURNS[directions[index - 1]];
      if (index === segmentCount - 2) {
        candidates = candidates.filter((candidate) => candidate !== 'E');
      }
      const fits = (candidate: Direction): boolean => {
        const length = segmentLength(candidate, dx, verticalLength);
        const endY = current.y + DIRECTION_VECTORS[candidate].y * length;
        return endY >= yMin && endY <= yMax;
      };
      const feasible = candidates.filter(fits);
      const pool = feasible.length > 0 ? feasible : candidates;
      const weighted: Direction[] = [];
      for (const candidate of pool) {
        weighted.push(candidate);
        const dy = DIRECTION_VECTORS[candidate].y;
        const towardGoal =
          (current.y > goalY && dy < 0) || (current.y < goalY && dy > 0);
        if (towardGoal) {
          weighted.push(candidate, candidate);
        }
      }
      direction = rng.pick(weighted);
    }
    directions.push(direction);

    const length = segmentLength(direction, dx, verticalLength);
    const vector = DIRECTION_VECTORS[direction];
    const clampedY = Math.min(
      yMax,
      Math.max(yMin, current.y + vector.y * length),
    );
    const actualLength =
      vector.y === 0
        ? length
        : Math.max(VERTICAL_MIN_LENGTH / 2, Math.abs((clampedY - current.y) / vector.y));
    const next: MotricityPoint = {
      x: current.x + vector.x * actualLength,
      y: current.y + vector.y * actualLength,
    };
    points.push(next);
    current = next;
    if (vector.x > 0) {
      spanLeft = Math.max(0, spanLeft - vector.x * actualLength);
    }
  }
  return points;
}

function offsetPolyline(
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

function buildCourse(seed: string, index: number): MotricityCourse {
  const rng = createSeededRng(`${seed}:motricity:${index}`);
  const [minSegments, maxSegments] = COURSE_SEGMENT_RANGES[index];
  const segmentCount = rng.nextInt(minSegments, maxSegments);
  const startWidth = COURSE_START_WIDTHS[index];

  const points = buildCenterline(rng, segmentCount, startWidth);

  const widths = points.slice(0, -1).map(
    (_, segmentIndex) =>
      startWidth *
      (1 - MOTRICITY_WIDTH_SHRINK * (segmentIndex / (segmentCount - 1))),
  );

  const segments: MotricitySegment[] = points.slice(0, -1).map(
    (start, segmentIndex) => ({
      start,
      end: points[segmentIndex + 1],
      width: widths[segmentIndex],
      length: Math.hypot(
        points[segmentIndex + 1].x - start.x,
        points[segmentIndex + 1].y - start.y,
      ),
    }),
  );
  const totalLength = segments.reduce(
    (sum, segment) => sum + segment.length,
    0,
  );

  const leftSide = offsetPolyline(points, widths, -1);
  const rightSide = offsetPolyline(points, widths, 1);
  const polygon = [...leftSide, ...[...rightSide].reverse()];

  const startPoint = points[0];
  const garageWidth = startWidth * GARAGE_WIDTH_FACTOR;
  const garageDepth = startWidth * GARAGE_DEPTH_FACTOR;
  const garage: MotricityRect = {
    x: startPoint.x - garageDepth,
    y: startPoint.y - garageWidth / 2,
    width: garageDepth,
    height: garageWidth,
  };
  const garageWalls: MotricityWall[] = [
    {
      start: { x: garage.x, y: garage.y },
      end: { x: garage.x, y: garage.y + garage.height },
    },
    {
      start: { x: garage.x, y: garage.y },
      end: { x: garage.x + garage.width, y: garage.y },
    },
    {
      start: { x: garage.x, y: garage.y + garage.height },
      end: { x: garage.x + garage.width, y: garage.y + garage.height },
    },
    {
      start: { x: startPoint.x, y: garage.y },
      end: { x: startPoint.x, y: startPoint.y - widths[0] / 2 },
    },
    {
      start: { x: startPoint.x, y: garage.y + garage.height },
      end: { x: startPoint.x, y: startPoint.y + widths[0] / 2 },
    },
  ];

  const endPoint = points[points.length - 1];
  const endWidthValue = widths[widths.length - 1];
  const endZoneWidth = endWidthValue * END_ZONE_WIDTH_FACTOR;
  const endZone: MotricityRect = {
    x: endPoint.x,
    y: endPoint.y - endZoneWidth / 2,
    width: endWidthValue * END_ZONE_DEPTH_FACTOR,
    height: endZoneWidth,
  };

  return {
    index,
    centerline: points,
    segments,
    leftSide,
    rightSide,
    polygon,
    garage,
    garageWalls,
    startPosition: {
      x: garage.x + garage.width / 2,
      y: garage.y + garage.height / 2,
    },
    endZone,
    totalLength,
  };
}

export function generateMotricityCourses(seed: string): MotricityCourse[] {
  return Array.from({ length: MOTRICITY_COURSE_COUNT }, (_, index) =>
    buildCourse(seed, index),
  );
}
