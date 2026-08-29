import { AXIS_TRAINING, VisualDiscriminationTraining } from '../../domain';
import { AxisType, ShapeId } from '../../enums';
import { SeededRng, createSeededRng } from '../rng';
import {
  CONFUSABLE_CHAR_PAIRS,
  DISCRIMINATION_CHAR_POOL,
  DISTINCT_ROTATIONS,
  canonicalRotation,
  confusablePartnersFor,
  shapePartnersFor,
} from './discrimination-confusables';
import {
  DiscriminationElement,
  DiscriminationTrial,
  SequenceOffset,
} from './discrimination-trial';

export const DISCRIMINATION_IDENTICAL_MIN = 16;
export const DISCRIMINATION_IDENTICAL_MAX = 20;
export const DISCRIMINATION_MAX_SHAPE_RUN = 2;
export const DISCRIMINATION_MAX_SHAPE_OCCURRENCES = 2;

const CHAR_PROBABILITY = 0.6;
const SHAPE_IDS = Object.values(ShapeId);

function trailingShapeRun(sequence: DiscriminationElement[]): number {
  let run = 0;
  for (
    let position = sequence.length - 1;
    position >= 0 && sequence[position].kind === 'SHAPE';
    position -= 1
  ) {
    run += 1;
  }
  return run;
}

function allowedShapesFor(sequence: DiscriminationElement[]): ShapeId[] {
  if (trailingShapeRun(sequence) >= DISCRIMINATION_MAX_SHAPE_RUN) {
    return [];
  }
  const previous = sequence[sequence.length - 1];
  const excluded = new Set<ShapeId>();
  if (previous?.kind === 'SHAPE') {
    excluded.add(previous.shape);
    for (const partner of shapePartnersFor(previous.shape)) {
      excluded.add(partner);
    }
  }
  const occurrences = new Map<ShapeId, number>();
  for (const element of sequence) {
    if (element.kind === 'SHAPE') {
      occurrences.set(element.shape, (occurrences.get(element.shape) ?? 0) + 1);
    }
  }
  return SHAPE_IDS.filter(
    (shape) =>
      !excluded.has(shape) &&
      (occurrences.get(shape) ?? 0) < DISCRIMINATION_MAX_SHAPE_OCCURRENCES,
  );
}

function drawElement(
  rng: SeededRng,
  sequence: DiscriminationElement[],
): DiscriminationElement {
  const allowedShapes = allowedShapesFor(sequence);
  if (allowedShapes.length === 0 || rng.next() < CHAR_PROBABILITY) {
    const previous = sequence[sequence.length - 1];
    const pool =
      previous?.kind === 'CHAR'
        ? DISCRIMINATION_CHAR_POOL.filter((value) => value !== previous.value)
        : DISCRIMINATION_CHAR_POOL;
    return { kind: 'CHAR', value: rng.pick(pool) };
  }
  const shape = rng.pick(allowedShapes);
  return {
    kind: 'SHAPE',
    shape,
    rotation: rng.pick(DISTINCT_ROTATIONS[shape]),
  };
}

function drawOffsetFactor(rng: SeededRng): number {
  return Math.round((rng.next() * 2 - 1) * 1000) / 1000;
}

function drawOffset(rng: SeededRng): SequenceOffset {
  return {
    fx: drawOffsetFactor(rng),
    fy: drawOffsetFactor(rng),
  };
}

function mutationOptionsFor(
  element: DiscriminationElement,
): DiscriminationElement[] {
  if (element.kind === 'CHAR') {
    return confusablePartnersFor(element.value).map((value) => ({
      kind: 'CHAR',
      value,
    }));
  }
  const substitutions: DiscriminationElement[] = shapePartnersFor(
    element.shape,
  ).map((shape) => ({
    kind: 'SHAPE',
    shape,
    rotation: canonicalRotation(shape, element.rotation),
  }));
  const rotations: DiscriminationElement[] = DISTINCT_ROTATIONS[element.shape]
    .filter(
      (rotation) =>
        rotation !== canonicalRotation(element.shape, element.rotation),
    )
    .map((rotation) => ({ kind: 'SHAPE', shape: element.shape, rotation }));
  return [...substitutions, ...rotations];
}

function applySingleDifference(
  rng: SeededRng,
  a: DiscriminationElement[],
  b: DiscriminationElement[],
): void {
  let candidates = a
    .map((element, position) => ({ element, position }))
    .filter(({ element }) => mutationOptionsFor(element).length > 0)
    .map(({ position }) => position);
  if (candidates.length === 0) {
    const position = rng.nextInt(0, a.length - 1);
    const pair = rng.pick(CONFUSABLE_CHAR_PAIRS);
    const planted: DiscriminationElement = { kind: 'CHAR', value: pair[0] };
    a[position] = planted;
    b[position] = { ...planted };
    candidates = [position];
  }
  const position = rng.pick(candidates);
  b[position] = rng.pick(mutationOptionsFor(a[position]));
}

export function generateDiscriminationSession(
  seed: string,
  training: VisualDiscriminationTraining = AXIS_TRAINING[
    AxisType.VISUAL_DISCRIMINATION
  ],
): DiscriminationTrial[] {
  const rng = createSeededRng(seed);
  const trialCount = training.exerciseCount;
  const identicalTarget = rng.nextInt(
    training.identicalMin ?? DISCRIMINATION_IDENTICAL_MIN,
    training.identicalMax ?? DISCRIMINATION_IDENTICAL_MAX,
  );
  const identicalIndexes = new Set(
    rng
      .shuffle(Array.from({ length: trialCount }, (_, index) => index))
      .slice(0, identicalTarget),
  );
  const lengthSpan = training.maxSequenceLength - training.minSequenceLength;
  return Array.from({ length: trialCount }, (_, index) => {
    const length =
      training.minSequenceLength +
      Math.round((lengthSpan * index) / (trialCount - 1));
    const a: DiscriminationElement[] = [];
    while (a.length < length) {
      a.push(drawElement(rng, a));
    }
    const b = a.map((element) => ({ ...element }));
    const identical = identicalIndexes.has(index);
    if (!identical) {
      applySingleDifference(rng, a, b);
    }
    return {
      index,
      a,
      b,
      identical,
      offsetA: drawOffset(rng),
      offsetB: drawOffset(rng),
    };
  });
}
