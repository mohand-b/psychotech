import { createSeededRng, SeededRng } from '../rng';
import { generateLegacyMotricityCourses } from './generate-motricity-courses-v1';
import {
  MOTRICITY_CANVAS_HEIGHT,
  MOTRICITY_CANVAS_WIDTH,
  MotricityCourse,
  MotricityPoint,
  MotricityRect,
  MotricitySegment,
  MotricityWall,
} from './motricity-course';
import {
  offsetPolyline,
  rectToSegmentDistance,
  segmentToSegmentDistance,
} from './motricity-geometry';

export const MOTRICITY_CONTENT_VERSION_V2 = 5;

export const MOTRICITY_COURSE_COUNT = 3;
export const MOTRICITY_WIDTH_SHRINK = 0.2;

export const MOTRICITY_MIN_SEGMENT_LENGTH = 80;
export const MOTRICITY_MAX_SEGMENT_LENGTH = 230;
export const MOTRICITY_CLEARANCE_MARGIN = 26;
export const MOTRICITY_MIN_START_END_SPAN_X = 480;
export const MOTRICITY_REVERSAL_MIN_SPACING = 220;
export const MOTRICITY_GENERATION_ATTEMPTS = 80;
export const MOTRICITY_GENERATION_DRAW_BUDGET = 3000;

export interface MotricityCourseProfile {
  segmentBounds: readonly [number, number];
  reversalBounds: readonly [number, number];
  minCurvilinearLength: number;
}

export const MOTRICITY_COURSE_PROFILES: readonly MotricityCourseProfile[] = [
  {
    segmentBounds: [5, 8],
    reversalBounds: [0, 0],
    minCurvilinearLength: 900,
  },
  {
    segmentBounds: [7, 11],
    reversalBounds: [0, 1],
    minCurvilinearLength: 1100,
  },
  {
    segmentBounds: [10, 16],
    reversalBounds: [2, 3],
    minCurvilinearLength: 1450,
  },
];

const COURSE_START_WIDTHS = [68, 58, 50];

const GARAGE_WIDTH_FACTOR = 1.35;
const GARAGE_DEPTH_FACTOR = 1.4;
const END_ZONE_WIDTH_FACTOR = 1.35;
const END_ZONE_DEPTH_FACTOR = 1.2;

const EDGE_PADDING = 12;
const STEP_SAMPLE_LIMIT = 24;
const CLOSING_SEGMENT_MAX_LENGTH = 170;
const REVERSAL_RUN_MIN_LENGTH = 140;
const REVERSAL_RUN_MAX_LENGTH = 280;
const EXTRA_REVERSAL_PROBABILITY = 0.25;
const REVERSAL_TRIGGER_JITTER = 0.08;
const ENTRY_BAND_SPAN = 150;
const VERTICAL_FIRST_PROBABILITY = 0.4;

const SQ = Math.SQRT1_2;

const DIR_VECTORS: readonly MotricityPoint[] = [
  { x: 1, y: 0 },
  { x: SQ, y: SQ },
  { x: 0, y: 1 },
  { x: -SQ, y: SQ },
  { x: -1, y: 0 },
  { x: -SQ, y: -SQ },
  { x: 0, y: -1 },
  { x: SQ, y: -SQ },
];

const DIR_EAST = 0;
const DIR_SOUTH = 2;
const DIR_WEST = 4;
const DIR_NORTH = 6;

function turnSteps(a: number, b: number): number {
  const difference = Math.abs(a - b) % 8;
  return Math.min(difference, 8 - difference);
}

interface WalkMove {
  direction: number;
  length: number;
}

interface WalkSnapshot {
  queue: number[];
  queueTag: 'first' | 'reversal' | 'closing' | null;
  reversalsDone: number;
  reversalTriggers: number[];
  curvilinear: number;
}

interface CenterlineResult {
  points: MotricityPoint[];
}

function segmentEnd(point: MotricityPoint, move: WalkMove): MotricityPoint {
  const vector = DIR_VECTORS[move.direction];
  return {
    x: point.x + vector.x * move.length,
    y: point.y + vector.y * move.length,
  };
}

function tryBuildCenterline(
  rng: SeededRng,
  startWidth: number,
  profile: MotricityCourseProfile,
): CenterlineResult | null {
  const bound = startWidth / 2 + EDGE_PADDING;
  const xLo = bound;
  const xHi = MOTRICITY_CANVAS_WIDTH - bound;
  const yLo = bound;
  const yHi = MOTRICITY_CANVAS_HEIGHT - bound;
  const clearance = startWidth + MOTRICITY_CLEARANCE_MARGIN;
  const minSegment = Math.max(MOTRICITY_MIN_SEGMENT_LENGTH, clearance + 4);
  const garageCross = startWidth * GARAGE_WIDTH_FACTOR;
  const garageDepth = startWidth * GARAGE_DEPTH_FACTOR;

  const forwardSign: 1 | -1 = rng.next() < 0.5 ? 1 : -1;
  const dirForward = forwardSign === 1 ? DIR_EAST : DIR_WEST;
  const dirBackward = forwardSign === 1 ? DIR_WEST : DIR_EAST;
  const forwardDiagonals =
    forwardSign === 1 ? [1, 7] : [3, 5];
  const forwardSet = new Set<number>([
    dirForward,
    ...forwardDiagonals,
    DIR_NORTH,
    DIR_SOUTH,
  ]);

  const reversalSpan = profile.reversalBounds[1] - profile.reversalBounds[0];
  const reversalCount =
    profile.reversalBounds[0] +
    (reversalSpan > 0 && rng.next() < EXTRA_REVERSAL_PROBABILITY
      ? rng.nextInt(1, reversalSpan)
      : 0);
  const reversalTriggers = Array.from({ length: reversalCount }, (_, k) => {
    const fraction =
      (k + 1) / (reversalCount + 1) +
      (rng.next() * 2 - 1) * REVERSAL_TRIGGER_JITTER;
    return fraction * profile.minCurvilinearLength;
  });

  const courseEscape =
    reversalCount > 0 ? (rng.next() < 0.5 ? DIR_NORTH : DIR_SOUTH) : null;

  const verticalFirst = rng.next() < VERTICAL_FIRST_PROBABILITY;
  const firstDir = verticalFirst
    ? rng.next() < 0.5
      ? DIR_NORTH
      : DIR_SOUTH
    : dirForward;

  const entryLo = forwardSign === 1 ? xLo : xHi - ENTRY_BAND_SPAN;
  const entryHi = forwardSign === 1 ? xLo + ENTRY_BAND_SPAN : xHi;
  let startX = entryLo + rng.next() * (entryHi - entryLo);
  const startBandLo =
    courseEscape === DIR_NORTH
      ? yLo + garageCross / 2 + (yHi - yLo - garageCross) * 0.55
      : yLo + garageCross / 2;
  const startBandHi =
    courseEscape === DIR_SOUTH
      ? yLo + garageCross / 2 + (yHi - yLo - garageCross) * 0.45
      : yHi - garageCross / 2;
  let startY = startBandLo + rng.next() * (startBandHi - startBandLo);
  if (!verticalFirst) {
    const behind = garageDepth + EDGE_PADDING;
    startX =
      forwardSign === 1
        ? Math.max(startX, xLo + behind)
        : Math.min(startX, xHi - behind);
  } else {
    const behind = garageDepth + EDGE_PADDING;
    startY =
      firstDir === DIR_NORTH
        ? Math.min(Math.max(startY, yLo + MOTRICITY_MIN_SEGMENT_LENGTH + 40), yHi - behind)
        : Math.max(Math.min(startY, yHi - MOTRICITY_MIN_SEGMENT_LENGTH - 40), yLo + behind);
    startX =
      forwardSign === 1
        ? Math.max(startX, xLo + garageCross / 2)
        : Math.min(startX, xHi - garageCross / 2);
  }
  const start: MotricityPoint = { x: startX, y: startY };

  const garageBack = ((): MotricityRect => {
    const vector = DIR_VECTORS[firstDir];
    const along = { x: -vector.x * garageDepth, y: -vector.y * garageDepth };
    const isHorizontal = vector.y === 0;
    return isHorizontal
      ? {
          x: Math.min(start.x, start.x + along.x),
          y: start.y - garageCross / 2,
          width: garageDepth,
          height: garageCross,
        }
      : {
          x: start.x - garageCross / 2,
          y: Math.min(start.y, start.y + along.y),
          width: garageCross,
          height: garageDepth,
        };
  })();

  const points: MotricityPoint[] = [start];
  const moves: WalkMove[] = [];
  const snapshots: WalkSnapshot[] = [];
  let queue: number[] = [firstDir];
  let queueTag: WalkSnapshot['queueTag'] = 'first';
  let reversalsDone = 0;
  let triggers = [...reversalTriggers];
  let curvilinear = 0;
  let budget = MOTRICITY_GENERATION_DRAW_BUDGET;
  let failStreak = 0;

  const currentPoint = (): MotricityPoint => points[points.length - 1];
  const currentDir = (): number | null =>
    moves.length === 0 ? null : moves[moves.length - 1].direction;

  const snapshotState = (): WalkSnapshot => ({
    queue: [...queue],
    queueTag,
    reversalsDone,
    reversalTriggers: [...triggers],
    curvilinear,
  });

  const restoreState = (snapshot: WalkSnapshot): void => {
    queue = [...snapshot.queue];
    queueTag = snapshot.queueTag;
    reversalsDone = snapshot.reversalsDone;
    triggers = [...snapshot.reversalTriggers];
    curvilinear = snapshot.curvilinear;
  };

  const isMoveValid = (from: MotricityPoint, move: WalkMove): boolean => {
    const end = segmentEnd(from, move);
    if (end.x < xLo || end.x > xHi || end.y < yLo || end.y > yHi) {
      return false;
    }
    for (let index = 0; index < moves.length - 1; index += 1) {
      const distance = segmentToSegmentDistance(
        from,
        end,
        points[index],
        points[index + 1],
      );
      if (distance < clearance) {
        return false;
      }
    }
    if (moves.length >= 1) {
      const garageDistance = rectToSegmentDistance(garageBack, from, end);
      if (garageDistance < MOTRICITY_CLEARANCE_MARGIN) {
        return false;
      }
    }
    return true;
  };

  const acceptMove = (move: WalkMove): void => {
    snapshots.push(snapshotState());
    const end = segmentEnd(currentPoint(), move);
    points.push(end);
    moves.push(move);
    curvilinear += move.length;
    if (queue.length > 0) {
      queue.shift();
      if (queue.length === 0) {
        if (queueTag === 'reversal') {
          reversalsDone += 1;
          for (let index = 0; index < triggers.length; index += 1) {
            triggers[index] = Math.max(
              triggers[index],
              curvilinear + MOTRICITY_REVERSAL_MIN_SPACING,
            );
          }
        }
        queueTag = null;
      }
    }
    failStreak = 0;
  };

  const popMove = (): boolean => {
    if (moves.length === 0) {
      return false;
    }
    const move = moves.pop();
    points.pop();
    const snapshot = snapshots.pop();
    if (!move || !snapshot) {
      return false;
    }
    restoreState(snapshot);
    return true;
  };

  const spanReached = (): boolean =>
    Math.abs(currentPoint().x - start.x) >= MOTRICITY_MIN_START_END_SPAN_X;

  const requirementsMet = (): boolean =>
    queue.length === 0 &&
    reversalsDone === reversalCount &&
    curvilinear >= profile.minCurvilinearLength &&
    spanReached() &&
    moves.length >= profile.segmentBounds[0];

  const isCardinalExit = (direction: number): boolean =>
    direction === dirForward ||
    direction === DIR_NORTH ||
    direction === DIR_SOUTH;

  while (budget > 0) {
    budget -= 1;

    const lastDir = currentDir();
    if (
      requirementsMet() &&
      lastDir !== null &&
      isCardinalExit(lastDir) &&
      moves.length <= profile.segmentBounds[1]
    ) {
      return { points };
    }
    if (
      requirementsMet() &&
      queue.length === 0 &&
      lastDir !== null &&
      !isCardinalExit(lastDir) &&
      moves.length < profile.segmentBounds[1]
    ) {
      const exits = [dirForward, DIR_NORTH, DIR_SOUTH].filter(
        (candidate) => turnSteps(lastDir, candidate) <= 2,
      );
      if (exits.length > 0) {
        queue = [rng.pick(exits)];
        queueTag = 'closing';
      }
    }

    if (moves.length >= profile.segmentBounds[1]) {
      if (!popMove()) {
        return null;
      }
      continue;
    }

    let move: WalkMove | null = null;

    if (queue.length > 0) {
      const direction = queue[0];
      const vertical = DIR_VECTORS[direction].y !== 0;
      const length =
        queueTag === 'reversal'
          ? vertical
            ? Math.max(minSegment, clearance + 10) + rng.next() * 40
            : REVERSAL_RUN_MIN_LENGTH +
              rng.next() * (REVERSAL_RUN_MAX_LENGTH - REVERSAL_RUN_MIN_LENGTH)
          : queueTag === 'closing'
            ? minSegment +
              rng.next() *
                Math.max(0, CLOSING_SEGMENT_MAX_LENGTH - minSegment)
            : minSegment +
              rng.next() * (MOTRICITY_MAX_SEGMENT_LENGTH - minSegment);
      move = { direction, length };
    } else {
      const direction = currentDir();
      const shouldStartReversal =
        direction !== null &&
        courseEscape !== null &&
        reversalsDone < reversalCount &&
        curvilinear >= (triggers[reversalsDone] ?? Infinity) &&
        turnSteps(direction, dirForward) <= 1;
      if (shouldStartReversal && courseEscape !== null) {
        const roomTowardEscape =
          courseEscape === DIR_NORTH
            ? currentPoint().y - yLo
            : yHi - currentPoint().y;
        const escape =
          roomTowardEscape < 2 * clearance + 60
            ? courseEscape === DIR_NORTH
              ? DIR_SOUTH
              : DIR_NORTH
            : courseEscape;
        if (turnSteps(direction, escape) <= 2) {
          queue = [escape, dirBackward, escape];
          queueTag = 'reversal';
          continue;
        }
      }
      const from = direction ?? dirForward;
      const pendingReversals =
        courseEscape !== null && reversalsDone < reversalCount;
      const candidates: number[] = [];
      for (const candidate of forwardSet) {
        if (turnSteps(from, candidate) === 0 || turnSteps(from, candidate) > 2) {
          continue;
        }
        const vector = DIR_VECTORS[candidate];
        if (pendingReversals && vector.x === 0) {
          continue;
        }
        candidates.push(candidate);
        if (vector.x !== 0 && vector.y !== 0) {
          candidates.push(candidate);
        }
      }
      if (candidates.length === 0) {
        if (!popMove()) {
          return null;
        }
        continue;
      }
      move = {
        direction: rng.pick(candidates),
        length:
          minSegment + rng.next() * (MOTRICITY_MAX_SEGMENT_LENGTH - minSegment),
      };
    }

    if (move && isMoveValid(currentPoint(), move)) {
      acceptMove(move);
    } else {
      failStreak += 1;
      if (failStreak > STEP_SAMPLE_LIMIT) {
        failStreak = 0;
        if (queueTag !== null) {
          queue = [];
          queueTag = null;
          if (!popMove()) {
            return null;
          }
        } else if (!popMove()) {
          return null;
        }
      }
    }
  }
  return null;
}

function buildWidths(startWidth: number, segmentCount: number): number[] {
  return Array.from(
    { length: segmentCount },
    (_, segmentIndex) =>
      startWidth *
      (1 - MOTRICITY_WIDTH_SHRINK * (segmentIndex / (segmentCount - 1))),
  );
}

function cardinalAxis(
  from: MotricityPoint,
  to: MotricityPoint,
): MotricityPoint {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  return { x: Math.round(dx / length), y: Math.round(dy / length) };
}

function buildGarage(
  points: MotricityPoint[],
  firstWidth: number,
  startWidth: number,
): { garage: MotricityRect; walls: MotricityWall[] } {
  const start = points[0];
  const along = cardinalAxis(points[0], points[1]);
  const normal = { x: -along.y, y: along.x };
  const cross = startWidth * GARAGE_WIDTH_FACTOR;
  const depth = startWidth * GARAGE_DEPTH_FACTOR;

  const back = { x: start.x - along.x * depth, y: start.y - along.y * depth };
  const cornerA = {
    x: back.x + normal.x * (cross / 2),
    y: back.y + normal.y * (cross / 2),
  };
  const cornerB = {
    x: back.x - normal.x * (cross / 2),
    y: back.y - normal.y * (cross / 2),
  };
  const mouthA = {
    x: start.x + normal.x * (cross / 2),
    y: start.y + normal.y * (cross / 2),
  };
  const mouthB = {
    x: start.x - normal.x * (cross / 2),
    y: start.y - normal.y * (cross / 2),
  };
  const corridorA = {
    x: start.x + normal.x * (firstWidth / 2),
    y: start.y + normal.y * (firstWidth / 2),
  };
  const corridorB = {
    x: start.x - normal.x * (firstWidth / 2),
    y: start.y - normal.y * (firstWidth / 2),
  };

  const xs = [cornerA.x, cornerB.x, mouthA.x, mouthB.x];
  const ys = [cornerA.y, cornerB.y, mouthA.y, mouthB.y];
  const garage: MotricityRect = {
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
  const walls: MotricityWall[] = [
    { start: cornerA, end: cornerB },
    { start: cornerA, end: mouthA },
    { start: cornerB, end: mouthB },
    { start: mouthA, end: corridorA },
    { start: mouthB, end: corridorB },
  ];
  return { garage, walls };
}

function buildEndZone(
  points: MotricityPoint[],
  lastWidth: number,
): MotricityRect {
  const end = points[points.length - 1];
  const along = cardinalAxis(points[points.length - 2], end);
  const normal = { x: -along.y, y: along.x };
  const cross = lastWidth * END_ZONE_WIDTH_FACTOR;
  const roomAlong =
    along.x > 0
      ? MOTRICITY_CANVAS_WIDTH - end.x
      : along.x < 0
        ? end.x
        : along.y > 0
          ? MOTRICITY_CANVAS_HEIGHT - end.y
          : end.y;
  const depth = Math.min(lastWidth * END_ZONE_DEPTH_FACTOR, roomAlong);
  const tip = { x: end.x + along.x * depth, y: end.y + along.y * depth };
  const sideA = {
    x: end.x + normal.x * (cross / 2),
    y: end.y + normal.y * (cross / 2),
  };
  const sideB = {
    x: end.x - normal.x * (cross / 2),
    y: end.y - normal.y * (cross / 2),
  };
  const xs = [sideA.x, sideB.x, tip.x + normal.x * (cross / 2), tip.x - normal.x * (cross / 2)];
  const ys = [sideA.y, sideB.y, tip.y + normal.y * (cross / 2), tip.y - normal.y * (cross / 2)];
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
}

function assembleCourse(
  index: number,
  points: MotricityPoint[],
  startWidth: number,
): MotricityCourse {
  const segmentCount = points.length - 1;
  const widths = buildWidths(startWidth, segmentCount);

  const segments: MotricitySegment[] = points
    .slice(0, -1)
    .map((start, segmentIndex) => ({
      start,
      end: points[segmentIndex + 1],
      width: widths[segmentIndex],
      length: Math.hypot(
        points[segmentIndex + 1].x - start.x,
        points[segmentIndex + 1].y - start.y,
      ),
    }));
  const totalLength = segments.reduce(
    (sum, segment) => sum + segment.length,
    0,
  );

  const leftSide = offsetPolyline(points, widths, -1);
  const rightSide = offsetPolyline(points, widths, 1);
  const polygon = [...leftSide, ...[...rightSide].reverse()];

  const { garage, walls } = buildGarage(points, widths[0], startWidth);
  const endZone = buildEndZone(points, widths[widths.length - 1]);

  return {
    index,
    centerline: points,
    segments,
    leftSide,
    rightSide,
    polygon,
    garage,
    garageWalls: walls,
    startPosition: {
      x: garage.x + garage.width / 2,
      y: garage.y + garage.height / 2,
    },
    endZone,
    totalLength,
  };
}

function courseIsSane(course: MotricityCourse): boolean {
  const inCanvas = (rect: MotricityRect): boolean =>
    rect.x >= 0 &&
    rect.y >= 0 &&
    rect.x + rect.width <= MOTRICITY_CANVAS_WIDTH &&
    rect.y + rect.height <= MOTRICITY_CANVAS_HEIGHT;
  if (!inCanvas(course.garage) || !inCanvas(course.endZone)) {
    return false;
  }
  for (let index = 0; index < course.segments.length - 2; index += 1) {
    const segment = course.segments[index];
    const distance = rectToSegmentDistance(
      course.endZone,
      segment.start,
      segment.end,
    );
    if (distance < MOTRICITY_CLEARANCE_MARGIN) {
      return false;
    }
  }
  return course.polygon.every(
    (point) => Number.isFinite(point.x) && Number.isFinite(point.y),
  );
}

function buildCourseV2(
  seed: string,
  index: number,
  startWidth: number,
): MotricityCourse {
  const profile =
    MOTRICITY_COURSE_PROFILES[
      Math.min(index, MOTRICITY_COURSE_PROFILES.length - 1)
    ];
  for (
    let attempt = 0;
    attempt < MOTRICITY_GENERATION_ATTEMPTS;
    attempt += 1
  ) {
    const rng = createSeededRng(`${seed}:motricity:v2:${index}#${attempt}`);
    const centerline = tryBuildCenterline(rng, startWidth, profile);
    if (!centerline) {
      continue;
    }
    const course = assembleCourse(index, centerline.points, startWidth);
    if (courseIsSane(course)) {
      return course;
    }
  }
  throw new Error(
    `Motricity course generation exhausted its ${MOTRICITY_GENERATION_ATTEMPTS} attempts for seed "${seed}" course ${index}`,
  );
}

export interface MotricityGenerationOptions {
  courseCount?: number;
  startWidths?: readonly number[];
  contentVersion?: number;
}

export function generateMotricityCourses(
  seed: string,
  options: MotricityGenerationOptions = {},
): MotricityCourse[] {
  const startWidths = options.startWidths ?? COURSE_START_WIDTHS;
  const courseCount = options.courseCount ?? MOTRICITY_COURSE_COUNT;
  const contentVersion =
    options.contentVersion ?? MOTRICITY_CONTENT_VERSION_V2;
  if (contentVersion < MOTRICITY_CONTENT_VERSION_V2) {
    return generateLegacyMotricityCourses(seed, startWidths, courseCount);
  }
  return Array.from({ length: courseCount }, (_, index) =>
    buildCourseV2(seed, index, startWidths[index]),
  );
}
