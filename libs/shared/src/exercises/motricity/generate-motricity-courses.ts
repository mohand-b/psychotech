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

const COURSE_START_WIDTHS = [68, 58, 50];

const MARGIN_X = 30;
const MARGIN_TOP = 70;
const MARGIN_BOTTOM = 70;
const GARAGE_WIDTH_FACTOR = 1.35;
const GARAGE_DEPTH_FACTOR = 1.4;
const END_ZONE_WIDTH_FACTOR = 1.35;
const END_ZONE_DEPTH_FACTOR = 1.2;

const ZIGZAG_SEGMENT_RANGE: [number, number] = [10, 11];
const VERTICAL_MIN_LENGTH = 60;
const VERTICAL_MAX_LENGTH = 130;
const DENSE_TAIL_RATIO = 2 / 3;
const DENSE_DX_FACTOR = 0.6;
const MAX_SEGMENT_DX = 240;

const SIMPLE_JOG_MIN = 80;
const SIMPLE_JOG_SPAN = 70;
const SIMPLE_EDGE_CLEARANCE = 60;

const SERPENTINE_LANE_BOTTOM_MIN = 495;
const SERPENTINE_LANE_MID_MIN = 310;
const SERPENTINE_LANE_TOP_MIN = 120;
const SERPENTINE_LANE_JITTER = 15;
const SERPENTINE_RISE_MIN = 60;
const SERPENTINE_RISE_SPAN = 15;
const SERPENTINE_RIGHT_MIN = 830;
const SERPENTINE_RIGHT_SPAN = 40;
const SERPENTINE_LEFT_MIN = 430;
const SERPENTINE_LEFT_SPAN = 40;
const SERPENTINE_RUN_A1_MIN = 120;
const SERPENTINE_RUN_A1_SPAN = 60;
const SERPENTINE_RUN_A2_MIN = 150;
const SERPENTINE_RUN_A2_SPAN = 60;
const SERPENTINE_RETURN_TAIL_MIN = 90;
const SERPENTINE_RETURN_TAIL_SPAN = 40;
const SERPENTINE_FINAL_JOG_X_MIN = 800;
const SERPENTINE_FINAL_JOG_X_SPAN = 40;
const SERPENTINE_FINAL_JOG_RISE_MIN = 50;
const SERPENTINE_FINAL_JOG_RISE_SPAN = 15;

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

function courseStartX(startWidth: number): number {
  return MARGIN_X + startWidth * GARAGE_DEPTH_FACTOR;
}

function courseEndX(): number {
  return MOTRICITY_CANVAS_WIDTH - MARGIN_X;
}

function simpleJogTarget(
  rng: SeededRng,
  fromY: number,
  yMin: number,
  yMax: number,
): number {
  const magnitude = SIMPLE_JOG_MIN + rng.next() * SIMPLE_JOG_SPAN;
  const up = rng.next() < 0.5;
  const preferred = up ? fromY - magnitude : fromY + magnitude;
  if (preferred >= yMin && preferred <= yMax) {
    return preferred;
  }
  return up ? fromY + magnitude : fromY - magnitude;
}

function buildCenterlineSimple(
  rng: SeededRng,
  startWidth: number,
): MotricityPoint[] {
  const startX = courseStartX(startWidth);
  const endX = courseEndX();
  const yMin = MARGIN_TOP + SIMPLE_EDGE_CLEARANCE;
  const yMax = MOTRICITY_CANVAS_HEIGHT - MARGIN_BOTTOM - SIMPLE_EDGE_CLEARANCE;
  const startY = 240 + rng.next() * 220;

  const y1 = simpleJogTarget(rng, startY, yMin, yMax);
  const dy1 = Math.abs(startY - y1);
  const y2 = simpleJogTarget(rng, y1, yMin, yMax);
  const dy2 = Math.abs(y1 - y2);

  const straightBudget = endX - startX - dy1 - dy2;
  const firstShare = 0.22 + rng.next() * 0.23;
  const secondShare = 0.22 + rng.next() * 0.23;
  const run1 = straightBudget * firstShare;
  const run2 = straightBudget * secondShare;

  const p0 = { x: startX, y: startY };
  const p1 = { x: p0.x + run1, y: startY };
  const p2 = { x: p1.x + dy1, y: y1 };
  const p3 = { x: p2.x + run2, y: y1 };
  const p4 = { x: p3.x + dy2, y: y2 };
  const p5 = { x: endX, y: y2 };
  return [p0, p1, p2, p3, p4, p5];
}

function buildCenterlineZigzag(
  rng: SeededRng,
  segmentCount: number,
  startWidth: number,
): MotricityPoint[] {
  const startX = courseStartX(startWidth);
  const startY = MOTRICITY_CANVAS_HEIGHT - MARGIN_BOTTOM - startWidth;
  const goalY = MARGIN_TOP + startWidth;
  const yMin = MARGIN_TOP;
  const yMax = MOTRICITY_CANVAS_HEIGHT - MARGIN_BOTTOM;
  const baseDx = startWidth;
  const denseFrom = Math.floor(segmentCount * DENSE_TAIL_RATIO);

  const points: MotricityPoint[] = [{ x: startX, y: startY }];
  const directions: Direction[] = [];
  let current = points[0];
  let spanLeft = MOTRICITY_CANVAS_WIDTH - MARGIN_X - startX;

  for (let index = 0; index < segmentCount; index += 1) {
    const remaining = segmentCount - index;
    const denseFactor = index >= denseFrom ? DENSE_DX_FACTOR : 1;
    const jitter = 0.75 + rng.next() * 0.6;
    const dx =
      index === segmentCount - 1
        ? Math.max(baseDx, spanLeft)
        : Math.min(
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
        if (candidate === 'NE' || candidate === 'SE') {
          weighted.push(candidate);
        }
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

function buildCenterlineSerpentine(
  rng: SeededRng,
  startWidth: number,
): MotricityPoint[] {
  const startX = courseStartX(startWidth);
  const endX = courseEndX();
  const laneBottom = SERPENTINE_LANE_BOTTOM_MIN + rng.next() * SERPENTINE_LANE_JITTER;
  const laneMid = SERPENTINE_LANE_MID_MIN + rng.next() * SERPENTINE_LANE_JITTER;
  const laneTop = SERPENTINE_LANE_TOP_MIN + rng.next() * SERPENTINE_LANE_JITTER;
  const rise = SERPENTINE_RISE_MIN + rng.next() * SERPENTINE_RISE_SPAN;
  const xRight = SERPENTINE_RIGHT_MIN + rng.next() * SERPENTINE_RIGHT_SPAN;
  const xLeft = SERPENTINE_LEFT_MIN + rng.next() * SERPENTINE_LEFT_SPAN;
  const runA1 = SERPENTINE_RUN_A1_MIN + rng.next() * SERPENTINE_RUN_A1_SPAN;
  const runA2 = SERPENTINE_RUN_A2_MIN + rng.next() * SERPENTINE_RUN_A2_SPAN;
  const returnTail = SERPENTINE_RETURN_TAIL_MIN + rng.next() * SERPENTINE_RETURN_TAIL_SPAN;
  const finalJogX = SERPENTINE_FINAL_JOG_X_MIN + rng.next() * SERPENTINE_FINAL_JOG_X_SPAN;
  const finalJogRise =
    SERPENTINE_FINAL_JOG_RISE_MIN + rng.next() * SERPENTINE_FINAL_JOG_RISE_SPAN;

  const upperOutbound = laneBottom - rise;
  const upperReturn = laneMid - rise;

  const p0 = { x: startX, y: laneBottom };
  const p1 = { x: p0.x + runA1, y: laneBottom };
  const p2 = { x: p1.x + rise, y: upperOutbound };
  const p3 = { x: p2.x + runA2, y: upperOutbound };
  const p4 = { x: p3.x + rise, y: laneBottom };
  const p5 = { x: xRight - rise, y: laneBottom };
  const p6 = { x: xRight, y: upperOutbound };
  const p7 = { x: xRight, y: laneMid };
  const p8 = { x: xLeft + returnTail + rise, y: laneMid };
  const p9 = { x: xLeft + returnTail, y: upperReturn };
  const p10 = { x: xLeft, y: upperReturn };
  const p11 = { x: xLeft, y: laneTop };
  const p12 = { x: finalJogX, y: laneTop };
  const p13 = { x: finalJogX + finalJogRise, y: laneTop + finalJogRise };
  const p14 = { x: endX, y: laneTop + finalJogRise };
  return [p0, p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11, p12, p13, p14];
}

function mirrorVertically(points: MotricityPoint[]): MotricityPoint[] {
  return points.map((point) => ({
    x: point.x,
    y: MOTRICITY_CANVAS_HEIGHT - point.y,
  }));
}

function recenterVertically(
  points: MotricityPoint[],
  startWidth: number,
): MotricityPoint[] {
  const allowance = startWidth * GARAGE_WIDTH_FACTOR;
  const ys = points.map((point) => point.y);
  const contentMin = Math.min(...ys) - allowance;
  const contentMax = Math.max(...ys) + allowance;
  const centered =
    (MOTRICITY_CANVAS_HEIGHT - (contentMax - contentMin)) / 2 - contentMin;
  const offset = Math.max(
    Math.min(centered, MOTRICITY_CANVAS_HEIGHT - contentMax),
    -contentMin,
  );
  return points.map((point) => ({ x: point.x, y: point.y + offset }));
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

function buildCenterline(
  rng: SeededRng,
  index: number,
  startWidth: number,
): MotricityPoint[] {
  if (index === 0) {
    return buildCenterlineSimple(rng, startWidth);
  }
  const points =
    index === 1
      ? buildCenterlineZigzag(
          rng,
          rng.nextInt(ZIGZAG_SEGMENT_RANGE[0], ZIGZAG_SEGMENT_RANGE[1]),
          startWidth,
        )
      : buildCenterlineSerpentine(rng, startWidth);
  return rng.next() < 0.5 ? mirrorVertically(points) : points;
}

function buildCourse(seed: string, index: number): MotricityCourse {
  const rng = createSeededRng(`${seed}:motricity:${index}`);
  const startWidth = COURSE_START_WIDTHS[index];

  const points = recenterVertically(
    buildCenterline(rng, index, startWidth),
    startWidth,
  );
  const segmentCount = points.length - 1;

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
    width: Math.min(
      endWidthValue * END_ZONE_DEPTH_FACTOR,
      MOTRICITY_CANVAS_WIDTH - endPoint.x,
    ),
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
