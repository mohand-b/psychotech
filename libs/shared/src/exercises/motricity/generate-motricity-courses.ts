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
export const MOTRICITY_SIMPLE_COURSE_MAX_SEGMENT_LENGTH = 460;
export const MOTRICITY_CLEARANCE_MARGIN = 26;
export const MOTRICITY_MIN_START_END_SPAN_X = 480;
export const MOTRICITY_EDGE_BAND = 250;
export const MOTRICITY_REVERSAL_MIN_SPACING = 220;
export const MOTRICITY_GENERATION_ATTEMPTS = 80;
export const MOTRICITY_GENERATION_DRAW_BUDGET = 6000;

export interface MotricityCourseProfile {
  segmentBounds: readonly [number, number];
  reversalBounds: readonly [number, number];
  minCurvilinearLength: number;
  maxCurvilinearLength: number;
  maxSegmentLength: number;
  clearanceMargin: number;
  minDiagonalSegments: number;
  minDiagonalShare: number;
  maxDiagonalShare: number;
}

export const MOTRICITY_COURSE_PROFILES: readonly MotricityCourseProfile[] = [
  {
    segmentBounds: [3, 4],
    reversalBounds: [0, 0],
    minCurvilinearLength: 700,
    maxCurvilinearLength: 1050,
    maxSegmentLength: MOTRICITY_SIMPLE_COURSE_MAX_SEGMENT_LENGTH,
    clearanceMargin: MOTRICITY_CLEARANCE_MARGIN,
    minDiagonalSegments: 1,
    minDiagonalShare: 0,
    maxDiagonalShare: 1,
  },
  {
    segmentBounds: [7, 11],
    reversalBounds: [0, 1],
    minCurvilinearLength: 1100,
    maxCurvilinearLength: 1350,
    maxSegmentLength: MOTRICITY_MAX_SEGMENT_LENGTH,
    clearanceMargin: 70,
    minDiagonalSegments: 2,
    minDiagonalShare: 0,
    maxDiagonalShare: 1,
  },
  {
    segmentBounds: [10, 18],
    reversalBounds: [2, 2],
    minCurvilinearLength: 1450,
    maxCurvilinearLength: 2800,
    maxSegmentLength: MOTRICITY_MAX_SEGMENT_LENGTH,
    clearanceMargin: 52,
    minDiagonalSegments: 4,
    minDiagonalShare: 1 / 3,
    maxDiagonalShare: 0.6,
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
const REVERSAL_RUN_MAX_LENGTH = 240;
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
  const clearance = startWidth + profile.clearanceMargin;
  const minSegment = Math.max(
    MOTRICITY_MIN_SEGMENT_LENGTH,
    startWidth + MOTRICITY_CLEARANCE_MARGIN + 4,
  );
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

  const verticalFirst =
    profile.segmentBounds[1] > 4 && rng.next() < VERTICAL_FIRST_PROBABILITY;
  const verticalDraw = rng.next() < 0.5 ? DIR_NORTH : DIR_SOUTH;
  const firstDir = verticalFirst
    ? courseEscape === DIR_NORTH
      ? DIR_SOUTH
      : courseEscape === DIR_SOUTH
        ? DIR_NORTH
        : verticalDraw
    : dirForward;

  const entryLo = forwardSign === 1 ? xLo : xHi - ENTRY_BAND_SPAN;
  const entryHi = forwardSign === 1 ? xLo + ENTRY_BAND_SPAN : xHi;
  let startX = entryLo + rng.next() * (entryHi - entryLo);
  const startBandLo =
    courseEscape !== null
      ? yLo + garageCross / 2 + (yHi - yLo - garageCross) * 0.2
      : yLo + garageCross / 2;
  const startBandHi =
    courseEscape !== null
      ? yLo + garageCross / 2 + (yHi - yLo - garageCross) * 0.5
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
    if (curvilinear + move.length > profile.maxCurvilinearLength) {
      return false;
    }
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

  const farBandBoundary =
    forwardSign === 1
      ? MOTRICITY_CANVAS_WIDTH - MOTRICITY_EDGE_BAND
      : MOTRICITY_EDGE_BAND;
  const endAtExtremity = (): boolean =>
    forwardSign === 1
      ? currentPoint().x >= farBandBoundary
      : currentPoint().x <= farBandBoundary;

  const isDiagonalMove = (move: WalkMove): boolean => {
    const vector = DIR_VECTORS[move.direction];
    return vector.x !== 0 && vector.y !== 0;
  };
  const diagonalCount = (): number => moves.filter(isDiagonalMove).length;
  const diagonalLength = (): number =>
    moves.reduce(
      (sum, move) => sum + (isDiagonalMove(move) ? move.length : 0),
      0,
    );

  const requirementsMet = (): boolean =>
    queue.length === 0 &&
    reversalsDone === reversalCount &&
    curvilinear >= profile.minCurvilinearLength &&
    spanReached() &&
    endAtExtremity() &&
    diagonalCount() >= profile.minDiagonalSegments &&
    diagonalLength() >= profile.minDiagonalShare * curvilinear &&
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

    const outboundRunLength = (): number =>
      Math.max(
        minSegment,
        (triggers[reversalsDone] ?? 0) - curvilinear + 20 + rng.next() * 50,
      );

    if (queue.length > 0) {
      const direction = queue[0];
      const vertical = DIR_VECTORS[direction].y !== 0;
      const verticalLegBase = Math.max(minSegment, clearance + 8);
      const verticalLegsAhead =
        queue.filter((queued) => DIR_VECTORS[queued].y !== 0).length +
        Math.max(0, reversalCount - reversalsDone - 1) * 2;
      const roomLeft =
        courseEscape === DIR_NORTH
          ? currentPoint().y - yLo
          : yHi - currentPoint().y;
      const verticalLegSlack = Math.max(
        0,
        Math.min(
          8,
          roomLeft -
            (verticalLegsAhead - 1) * (verticalLegBase + 8) -
            verticalLegBase -
            4,
        ),
      );
      const length =
        queueTag === 'reversal'
          ? vertical
            ? verticalLegBase + rng.next() * verticalLegSlack
            : REVERSAL_RUN_MIN_LENGTH +
              rng.next() * (REVERSAL_RUN_MAX_LENGTH - REVERSAL_RUN_MIN_LENGTH)
          : queueTag === 'closing'
            ? minSegment +
              rng.next() *
                Math.max(0, CLOSING_SEGMENT_MAX_LENGTH - minSegment)
            : queueTag === 'first' && reversalCount > 0 && !vertical
              ? minSegment + rng.next() * 40
              : minSegment +
                rng.next() * (profile.maxSegmentLength - minSegment);
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
        const roomNeeded =
          (reversalCount - reversalsDone) * 2 * (clearance + 16) + 20;
        if (
          roomTowardEscape >= roomNeeded &&
          turnSteps(direction, courseEscape) <= 2
        ) {
          queue = [courseEscape, dirBackward, courseEscape];
          queueTag = 'reversal';
          continue;
        }
      }
      const from = direction ?? dirForward;
      const pendingReversals =
        courseEscape !== null && reversalsDone < reversalCount;
      if (pendingReversals && courseEscape !== null) {
        const stepsToForward = turnSteps(from, dirForward);
        const forwardAllowed =
          direction === null || (stepsToForward >= 1 && stepsToForward <= 2);
        const diagonalMin = Math.max(minSegment, (clearance + 6) * Math.SQRT2);
        const awayDiagonal = forwardDiagonals.find((candidate) =>
          courseEscape === DIR_NORTH
            ? DIR_VECTORS[candidate].y > 0
            : DIR_VECTORS[candidate].y < 0,
        );
        const diagonalAllowed =
          reversalsDone === 0 &&
          awayDiagonal !== undefined &&
          direction !== null &&
          turnSteps(from, awayDiagonal) >= 1 &&
          turnSteps(from, awayDiagonal) <= 2;
        const roomTowardEscape =
          courseEscape === DIR_NORTH
            ? currentPoint().y - yLo
            : yHi - currentPoint().y;
        const roomNeeded =
          (reversalCount - reversalsDone) * 2 * (clearance + 16) + 20;
        const pendingMoves: WalkMove[] = [];
        if (roomTowardEscape < roomNeeded && reversalsDone === 0) {
          if (diagonalAllowed && awayDiagonal !== undefined) {
            pendingMoves.push({
              direction: awayDiagonal,
              length:
                diagonalMin +
                rng.next() *
                  Math.max(0, profile.maxSegmentLength - diagonalMin),
            });
          } else if (forwardAllowed) {
            pendingMoves.push({
              direction: dirForward,
              length: diagonalMin + rng.next() * 40,
            });
          }
        } else {
          if (forwardAllowed) {
            pendingMoves.push({
              direction: dirForward,
              length:
                reversalsDone === 0
                  ? minSegment +
                    rng.next() * (profile.maxSegmentLength - minSegment)
                  : outboundRunLength(),
            });
            if (reversalsDone === 0) {
              pendingMoves.push({
                direction: dirForward,
                length: outboundRunLength(),
              });
            }
          }
          if (diagonalAllowed && awayDiagonal !== undefined) {
            pendingMoves.push({
              direction: awayDiagonal,
              length:
                diagonalMin +
                rng.next() *
                  Math.max(0, profile.maxSegmentLength - diagonalMin),
            });
          }
        }
        if (pendingMoves.length === 0) {
          if (!popMove()) {
            return null;
          }
          continue;
        }
        move = rng.pick(pendingMoves);
      } else {
        const candidates: number[] = [];
        for (const candidate of forwardSet) {
          if (
            turnSteps(from, candidate) === 0 ||
            turnSteps(from, candidate) > 2
          ) {
            continue;
          }
          candidates.push(candidate);
          const vector = DIR_VECTORS[candidate];
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
        const picked = rng.pick(candidates);
        const pickedVector = DIR_VECTORS[picked];
        const pickedMin =
          pickedVector.x !== 0 && pickedVector.y !== 0
            ? Math.max(minSegment, (clearance + 6) * Math.SQRT2)
            : minSegment;
        move = {
          direction: picked,
          length:
            pickedMin +
            rng.next() * Math.max(0, profile.maxSegmentLength - pickedMin),
        };
      }
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

function tryBuildTiltedCenterline(
  rng: SeededRng,
  startWidth: number,
  profile: MotricityCourseProfile,
): CenterlineResult | null {
  const bound = startWidth / 2 + EDGE_PADDING;
  const xLo = bound;
  const xHi = MOTRICITY_CANVAS_WIDTH - bound;
  const yLo = bound;
  const yHi = MOTRICITY_CANVAS_HEIGHT - bound;
  const clearance = startWidth + profile.clearanceMargin;
  const minSegment = Math.max(
    MOTRICITY_MIN_SEGMENT_LENGTH,
    startWidth + MOTRICITY_CLEARANCE_MARGIN + 4,
  );
  const garageDepth = startWidth * GARAGE_DEPTH_FACTOR;

  const forwardSign: 1 | -1 = rng.next() < 0.5 ? 1 : -1;
  const tiltUp = rng.next() < 0.5;
  const flatBlockFirst = rng.next() < 0.5;
  const dirForward = forwardSign === 1 ? DIR_EAST : DIR_WEST;
  const dirBackward = forwardSign === 1 ? DIR_WEST : DIR_EAST;
  const laneDir =
    forwardSign === 1 ? (tiltUp ? 7 : 1) : tiltUp ? 5 : 3;
  const rungDir =
    forwardSign === 1 ? (tiltUp ? 1 : 7) : tiltUp ? 3 : 5;
  const backDir = (laneDir + 4) % 8;
  const flatEscape = tiltUp ? DIR_NORTH : DIR_SOUTH;

  const legDraw = (): number =>
    Math.max(minSegment, clearance + 8) + rng.next() * 24;
  const lanes = [170 + rng.next() * 130, 170 + rng.next() * 130];
  const backs = [
    REVERSAL_RUN_MIN_LENGTH +
      rng.next() * (REVERSAL_RUN_MAX_LENGTH - REVERSAL_RUN_MIN_LENGTH),
    REVERSAL_RUN_MIN_LENGTH +
      rng.next() * (REVERSAL_RUN_MAX_LENGTH - REVERSAL_RUN_MIN_LENGTH),
  ];
  const legs = [legDraw(), legDraw(), legDraw(), legDraw()];
  const intro = minSegment + rng.next() * 80;
  const transition = minSegment + rng.next() * 140;

  const tiltedBlock: WalkMove[] = [
    { direction: laneDir, length: lanes[0] },
    { direction: rungDir, length: legs[0] },
    { direction: backDir, length: backs[0] },
    { direction: rungDir, length: legs[1] },
    { direction: laneDir, length: lanes[1] },
  ];
  const flatBlock: WalkMove[] = [
    { direction: flatEscape, length: legs[2] },
    { direction: dirBackward, length: backs[1] },
    { direction: flatEscape, length: legs[3] },
  ];
  const moves: WalkMove[] = flatBlockFirst
    ? [
        { direction: dirForward, length: intro },
        ...flatBlock,
        ...tiltedBlock,
      ]
    : [
        { direction: dirForward, length: intro },
        ...tiltedBlock,
        { direction: dirForward, length: transition },
        ...flatBlock,
      ];

  const entryLo =
    forwardSign === 1 ? xLo + garageDepth + EDGE_PADDING : xHi - ENTRY_BAND_SPAN;
  const entryHi =
    forwardSign === 1 ? xLo + ENTRY_BAND_SPAN : xHi - garageDepth - EDGE_PADDING;
  if (entryHi <= entryLo) {
    return null;
  }
  const startX = entryLo + rng.next() * (entryHi - entryLo);

  const bodyDx = moves.reduce(
    (sum, move) => sum + DIR_VECTORS[move.direction].x * move.length,
    0,
  );
  const farBandX =
    forwardSign === 1
      ? MOTRICITY_CANVAS_WIDTH - MOTRICITY_EDGE_BAND
      : MOTRICITY_EDGE_BAND;
  let tailNeeded =
    forwardSign === 1
      ? farBandX - (startX + bodyDx) + 10 + rng.next() * 50
      : startX + bodyDx - farBandX + 10 + rng.next() * 50;
  let tailRuns = 0;
  while (tailNeeded > 0) {
    if (tailRuns > 0) {
      const diagonalSeparator = rng.next() < 0.5;
      const separatorMin = diagonalSeparator
        ? Math.max(minSegment, (clearance + 6) * Math.SQRT2)
        : minSegment;
      const separator: WalkMove = {
        direction: diagonalSeparator ? laneDir : flatEscape,
        length: separatorMin + rng.next() * 40,
      };
      moves.push(separator);
      tailNeeded -= Math.abs(DIR_VECTORS[separator.direction].x) * separator.length;
    }
    const run = Math.min(
      MOTRICITY_MAX_SEGMENT_LENGTH,
      Math.max(minSegment, tailNeeded),
    );
    moves.push({ direction: dirForward, length: run });
    tailNeeded -= run;
    tailRuns += 1;
    if (tailRuns > 3) {
      return null;
    }
  }
  if (tailRuns === 0) {
    moves.push({ direction: dirForward, length: minSegment + rng.next() * 40 });
  }

  let dy = 0;
  let dyMin = 0;
  let dyMax = 0;
  for (const move of moves) {
    dy += DIR_VECTORS[move.direction].y * move.length;
    dyMin = Math.min(dyMin, dy);
    dyMax = Math.max(dyMax, dy);
  }
  const startYLo = yLo - dyMin + 6;
  const startYHi = yHi - dyMax - 6;
  if (startYHi <= startYLo) {
    return null;
  }
  const startY = startYLo + rng.next() * (startYHi - startYLo);

  const curvilinear = moves.reduce((sum, move) => sum + move.length, 0);
  if (
    curvilinear < profile.minCurvilinearLength ||
    curvilinear > profile.maxCurvilinearLength
  ) {
    return null;
  }
  const diagonalLength = moves.reduce((sum, move) => {
    const vector = DIR_VECTORS[move.direction];
    return sum + (vector.x !== 0 && vector.y !== 0 ? move.length : 0);
  }, 0);
  if (
    diagonalLength < profile.minDiagonalShare * curvilinear ||
    diagonalLength > profile.maxDiagonalShare * curvilinear
  ) {
    return null;
  }

  const points: MotricityPoint[] = [{ x: startX, y: startY }];
  for (const move of moves) {
    points.push(segmentEnd(points[points.length - 1], move));
  }
  for (const point of points) {
    if (
      point.x < xLo ||
      point.x > xHi ||
      point.y < yLo ||
      point.y > yHi
    ) {
      return null;
    }
  }
  if (
    Math.abs(points[points.length - 1].x - points[0].x) <
    MOTRICITY_MIN_START_END_SPAN_X
  ) {
    return null;
  }
  for (let a = 0; a < moves.length; a += 1) {
    for (let b = a + 2; b < moves.length; b += 1) {
      const distance = segmentToSegmentDistance(
        points[a],
        points[a + 1],
        points[b],
        points[b + 1],
      );
      if (distance < clearance) {
        return null;
      }
    }
  }
  const garageCross = startWidth * GARAGE_WIDTH_FACTOR;
  const garageBack: MotricityRect = {
    x:
      forwardSign === 1
        ? points[0].x - garageDepth
        : points[0].x,
    y: points[0].y - garageCross / 2,
    width: garageDepth,
    height: garageCross,
  };
  for (let index = 1; index < moves.length; index += 1) {
    const distance = rectToSegmentDistance(
      garageBack,
      points[index],
      points[index + 1],
    );
    if (distance < MOTRICITY_CLEARANCE_MARGIN) {
      return null;
    }
  }
  return { points };
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
    const centerline =
      profile.minDiagonalShare > 0
        ? tryBuildTiltedCenterline(rng, startWidth, profile)
        : tryBuildCenterline(rng, startWidth, profile);
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
