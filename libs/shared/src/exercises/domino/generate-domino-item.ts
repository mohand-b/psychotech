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
  dominoTransitionWraps,
  evaluateDominoSequence,
  mod7,
  solveDominoAnswer,
} from './domino-rules';

export interface GenerateDominoItemOptions {
  level: DominoLevel;
  seed: string;
  rejectPeriodicSequences?: boolean;
}

const MAX_GENERATION_ATTEMPTS = 80;

const ALL_STEPS = [-3, -2, -1, 1, 2, 3];
const SMALL_STEPS = [-2, -1, 1, 2];

function randomFace(rng: SeededRng): DominoFace {
  return rng.nextInt(0, 6) as DominoFace;
}

function orientedHalves(
  main: DominoHalfRule,
  other: DominoHalfRule,
  rng: SeededRng,
): { top: DominoHalfRule; bottom: DominoHalfRule } {
  return rng.next() < 0.5 ? { top: main, bottom: other } : { top: other, bottom: main };
}

function wrapFreeStart(
  step: 1 | -1,
  length: number,
  rng: SeededRng,
): DominoFace {
  const span = length - 1;
  return (
    step === 1 ? rng.nextInt(0, 6 - span) : rng.nextInt(span, 6)
  ) as DominoFace;
}

function buildSpec(
  level: DominoLevel,
  rng: SeededRng,
): { spec: DominoRuleSpec; length: number; stepStart: DominoFace | null } {
  switch (level) {
    case 1: {
      const length = rng.nextInt(5, 6);
      const step = rng.pick(SMALL_STEPS);
      const halves = orientedHalves(
        { kind: 'STEP', step },
        { kind: 'CONSTANT', value: randomFace(rng) },
        rng,
      );
      return {
        spec: { pattern: DominoPattern.HALVES, ...halves },
        length,
        stepStart:
          step === 1 || step === -1 ? wrapFreeStart(step, length, rng) : null,
      };
    }
    case 2:
      return {
        spec: {
          pattern: DominoPattern.HALVES,
          top: { kind: 'STEP', step: rng.pick(ALL_STEPS) },
          bottom: { kind: 'STEP', step: rng.pick(ALL_STEPS) },
        },
        length: rng.nextInt(5, 6),
        stepStart: null,
      };
    case 3:
      return {
        spec: {
          pattern: DominoPattern.DIAGONAL,
          topChainStep: 1,
          bottomChainStep: 1,
        },
        length: rng.nextInt(5, 6),
        stepStart: null,
      };
    case 4: {
      const risingTopChain = rng.next() < 0.5;
      return {
        spec: {
          pattern: DominoPattern.DIAGONAL,
          topChainStep: risingTopChain ? 1 : -1,
          bottomChainStep: risingTopChain ? -1 : 1,
        },
        length: rng.nextInt(5, 6),
        stepStart: null,
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
  if (spec.pattern === DominoPattern.DIAGONAL) {
    return visibleTiles.length >= 3;
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

function hasVisiblePeriodicCycle(
  visibleTiles: readonly DominoTile[],
): boolean {
  for (
    let period = 1;
    period <= Math.floor(visibleTiles.length / 2);
    period += 1
  ) {
    let periodic = true;
    for (let index = period; index < visibleTiles.length; index += 1) {
      const tile = visibleTiles[index];
      const earlier = visibleTiles[index - period];
      if (tile.top !== earlier.top || tile.bottom !== earlier.bottom) {
        periodic = false;
        break;
      }
    }
    if (periodic) {
      return true;
    }
  }
  return false;
}

function isDegenerate(visibleTiles: readonly DominoTile[]): boolean {
  const first = visibleTiles[0];
  return visibleTiles.every(
    (tile) => tile.top === first.top && tile.bottom === first.bottom,
  );
}

function sameTile(left: DominoTile, right: DominoTile): boolean {
  return left.top === right.top && left.bottom === right.bottom;
}

function isVisiblePalindrome(visibleTiles: readonly DominoTile[]): boolean {
  return visibleTiles.every((tile, index) =>
    sameTile(tile, visibleTiles[visibleTiles.length - 1 - index]),
  );
}

function endsWithRepeatedTile(visibleTiles: readonly DominoTile[]): boolean {
  return sameTile(
    visibleTiles[visibleTiles.length - 1],
    visibleTiles[visibleTiles.length - 2],
  );
}

export function generateDominoItem(
  options: GenerateDominoItemOptions,
): DominoItem {
  const { level, seed } = options;
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const rng = createSeededRng(`${seed}::domino::${level}::${attempt}`);
    const { spec, length, stepStart } = buildSpec(level, rng);
    const starts: DominoSequenceStarts = {
      top: randomFace(rng),
      bottom: randomFace(rng),
      oddTop: randomFace(rng),
      oddBottom: randomFace(rng),
    };
    if (stepStart !== null && spec.pattern === DominoPattern.HALVES) {
      if (spec.top.kind === 'STEP') {
        starts.top = stepStart;
      } else {
        starts.bottom = stepStart;
      }
    }
    if (
      spec.pattern === DominoPattern.DIAGONAL &&
      spec.topChainStep === spec.bottomChainStep &&
      starts.top === starts.bottom
    ) {
      continue;
    }
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
    if (isDegenerate(visibleTiles)) {
      continue;
    }
    if (sameTile(answer, visibleTiles[visibleTiles.length - 1])) {
      continue;
    }
    if (isVisiblePalindrome(visibleTiles)) {
      continue;
    }
    if (endsWithRepeatedTile(visibleTiles)) {
      continue;
    }
    if (
      options.rejectPeriodicSequences === true &&
      hasVisiblePeriodicCycle(visibleTiles)
    ) {
      continue;
    }
    if (shadowRuleContradicts(visibleTiles, answer)) {
      continue;
    }
    const transitionWraps = dominoTransitionWraps(spec, tiles);
    const answerWrap = transitionWraps[transitionWraps.length - 1];
    const visibleWraps = transitionWraps.slice(0, -1);
    const anyWrap = transitionWraps.some(
      (wrap) => wrap.top !== null || wrap.bottom !== null,
    );
    const visibleWrap = visibleWraps.some(
      (wrap) => wrap.top !== null || wrap.bottom !== null,
    );
    if (level === 2 && !visibleWrap) {
      continue;
    }
    if (
      answerWrap.top !== null &&
      !visibleWraps.some((wrap) => wrap.top === answerWrap.top)
    ) {
      continue;
    }
    if (
      answerWrap.bottom !== null &&
      !visibleWraps.some((wrap) => wrap.bottom === answerWrap.bottom)
    ) {
      continue;
    }
    const wrapMentions = {
      up: transitionWraps.some(
        (wrap) => wrap.top === 'up' || wrap.bottom === 'up',
      ),
      down: transitionWraps.some(
        (wrap) => wrap.top === 'down' || wrap.bottom === 'down',
      ),
    };
    return {
      level,
      seed,
      tiles,
      visibleTiles,
      answer,
      rule: buildDominoRule(spec, wrapMentions),
      ruleSpec: spec,
      pattern: spec.pattern,
      length,
      hasWrap: anyWrap,
    };
  }
  throw new Error(
    `Domino item generation exhausted retries for level ${level} seed ${seed}`,
  );
}
