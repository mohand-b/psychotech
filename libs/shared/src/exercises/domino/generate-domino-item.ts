import { SeededRng, createSeededRng } from '../rng';
import {
  DominoFace,
  DominoHalfRule,
  DominoItem,
  DominoLevel,
  DominoPattern,
  DominoRuleSpec,
  DominoTile,
} from './domino-item';
import {
  DominoSequenceStarts,
  buildDominoRule,
  buildDominoSequence,
  dominoWrapIndices,
  evaluateDominoSequence,
  mod7,
  solveDominoAnswer,
} from './domino-rules';

export interface GenerateDominoItemOptions {
  level: DominoLevel;
  seed: string;
}

const MAX_GENERATION_ATTEMPTS = 40;

const ALL_STEPS = [-3, -2, -1, 1, 2, 3];
const SMALL_STEPS = [-2, -1, 1, 2];

function randomFace(rng: SeededRng): DominoFace {
  return rng.nextInt(0, 6) as DominoFace;
}

function distinctFaces(rng: SeededRng): [DominoFace, DominoFace] {
  const first = randomFace(rng);
  const offset = rng.nextInt(1, 6);
  return [first, mod7(first + offset)];
}

function distinctSteps(rng: SeededRng): [number, number] {
  const first = rng.pick(ALL_STEPS);
  const second = rng.pick(ALL_STEPS.filter((step) => step !== first));
  return [first, second];
}

function secondaryHalf(rng: SeededRng): DominoHalfRule {
  return rng.next() < 0.5
    ? { kind: 'CONSTANT', value: randomFace(rng) }
    : { kind: 'STEP', step: rng.pick(SMALL_STEPS) };
}

function orientedHalves(
  main: DominoHalfRule,
  other: DominoHalfRule,
  rng: SeededRng,
): { top: DominoHalfRule; bottom: DominoHalfRule } {
  return rng.next() < 0.5 ? { top: main, bottom: other } : { top: other, bottom: main };
}

function buildSpec(
  level: DominoLevel,
  rng: SeededRng,
): { spec: DominoRuleSpec; length: number } {
  switch (level) {
    case 1: {
      const halves = orientedHalves(
        { kind: 'STEP', step: rng.pick([1, 2]) },
        { kind: 'CONSTANT', value: randomFace(rng) },
        rng,
      );
      return {
        spec: { pattern: DominoPattern.HALVES, ...halves },
        length: rng.nextInt(5, 7),
      };
    }
    case 2:
      return {
        spec: {
          pattern: DominoPattern.HALVES,
          top: { kind: 'STEP', step: rng.pick(ALL_STEPS) },
          bottom: { kind: 'STEP', step: rng.pick(ALL_STEPS) },
        },
        length: rng.nextInt(5, 7),
      };
    case 3: {
      const alternating: DominoHalfRule =
        rng.next() < 0.5
          ? { kind: 'ALTERNATING_VALUES', values: distinctFaces(rng) }
          : { kind: 'ALTERNATING_STEPS', steps: distinctSteps(rng) };
      const halves = orientedHalves(alternating, secondaryHalf(rng), rng);
      return {
        spec: { pattern: DominoPattern.HALVES, ...halves },
        length: rng.nextInt(6, 7),
      };
    }
    case 4:
      return {
        spec: {
          pattern: DominoPattern.CROSS,
          offset: rng.nextInt(-2, 2),
          bottom: { kind: 'STEP', step: rng.pick(ALL_STEPS) },
        },
        length: rng.nextInt(5, 7),
      };
    case 5: {
      if (rng.next() < 0.5) {
        const even = {
          topStep: rng.pick(ALL_STEPS),
          bottomStep: rng.pick(ALL_STEPS),
        };
        let odd = {
          topStep: rng.pick(ALL_STEPS),
          bottomStep: rng.pick(ALL_STEPS),
        };
        if (odd.topStep === even.topStep && odd.bottomStep === even.bottomStep) {
          odd = {
            topStep: rng.pick(ALL_STEPS.filter((s) => s !== even.topStep)),
            bottomStep: odd.bottomStep,
          };
        }
        return {
          spec: { pattern: DominoPattern.INTERLEAVED, even, odd },
          length: 7,
        };
      }
      const halves = orientedHalves(
        { kind: 'GROWING_STEP', direction: rng.next() < 0.5 ? 1 : -1 },
        secondaryHalf(rng),
        rng,
      );
      return {
        spec: { pattern: DominoPattern.HALVES, ...halves },
        length: rng.nextInt(6, 7),
      };
    }
  }
}

function halfInferable(
  rule: DominoHalfRule,
  visibleValues: readonly DominoFace[],
): boolean {
  const transitions = visibleValues.length - 1;
  switch (rule.kind) {
    case 'CONSTANT':
      return visibleValues.length >= 2;
    case 'STEP':
      return transitions >= 2;
    case 'ALTERNATING_VALUES':
      return rule.values.every(
        (value) =>
          visibleValues.filter((candidate) => candidate === value).length >= 2,
      );
    case 'ALTERNATING_STEPS':
      return transitions >= 4;
    case 'GROWING_STEP':
      return transitions >= 3;
  }
}

function isInferable(
  spec: DominoRuleSpec,
  visibleTiles: readonly DominoTile[],
): boolean {
  const tops = visibleTiles.map((tile) => tile.top);
  const bottoms = visibleTiles.map((tile) => tile.bottom);
  if (spec.pattern === DominoPattern.HALVES) {
    return halfInferable(spec.top, tops) && halfInferable(spec.bottom, bottoms);
  }
  if (spec.pattern === DominoPattern.CROSS) {
    return visibleTiles.length >= 3 && halfInferable(spec.bottom, bottoms);
  }
  return visibleTiles.length >= 6;
}

function uniformDiffPrediction(
  visibleValues: readonly DominoFace[],
): DominoFace | null {
  const diff = mod7(visibleValues[1] - visibleValues[0]);
  for (let index = 1; index < visibleValues.length - 1; index += 1) {
    if (mod7(visibleValues[index + 1] - visibleValues[index]) !== diff) {
      return null;
    }
  }
  return mod7(visibleValues[visibleValues.length - 1] + diff);
}

function shadowRuleContradicts(
  visibleTiles: readonly DominoTile[],
  answer: DominoTile,
): boolean {
  const topShadow = uniformDiffPrediction(visibleTiles.map((tile) => tile.top));
  const bottomShadow = uniformDiffPrediction(
    visibleTiles.map((tile) => tile.bottom),
  );
  return (
    (topShadow !== null && topShadow !== answer.top) ||
    (bottomShadow !== null && bottomShadow !== answer.bottom)
  );
}

function isDegenerate(visibleTiles: readonly DominoTile[]): boolean {
  const first = visibleTiles[0];
  return visibleTiles.every(
    (tile) => tile.top === first.top && tile.bottom === first.bottom,
  );
}

export function generateDominoItem(
  options: GenerateDominoItemOptions,
): DominoItem {
  const { level, seed } = options;
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const rng = createSeededRng(`${seed}::domino::${level}::${attempt}`);
    const { spec, length } = buildSpec(level, rng);
    const starts: DominoSequenceStarts = {
      top: randomFace(rng),
      bottom: randomFace(rng),
      oddTop: randomFace(rng),
      oddBottom: randomFace(rng),
    };
    const { tiles } = buildDominoSequence(spec, starts, length);
    const visibleTiles = tiles.slice(0, -1);
    const answer = tiles[tiles.length - 1];
    const solved = solveDominoAnswer(visibleTiles, spec);
    if (
      solved.top !== answer.top ||
      solved.bottom !== answer.bottom ||
      !evaluateDominoSequence(tiles, spec)
    ) {
      continue;
    }
    if (!isInferable(spec, visibleTiles)) {
      continue;
    }
    if (level <= 3 && isDegenerate(visibleTiles)) {
      continue;
    }
    if (shadowRuleContradicts(visibleTiles, answer)) {
      continue;
    }
    const wrapIndices = dominoWrapIndices(spec, tiles);
    const visibleWrap = wrapIndices.some((index) => index <= visibleTiles.length - 1);
    if (level === 2 && !visibleWrap) {
      continue;
    }
    const hasWrap = wrapIndices.length > 0;
    return {
      level,
      seed,
      tiles,
      answer,
      rule: buildDominoRule(spec, hasWrap),
      ruleSpec: spec,
      pattern: spec.pattern,
      length,
      hasWrap,
    };
  }
  throw new Error(
    `Domino item generation exhausted retries for level ${level} seed ${seed}`,
  );
}
