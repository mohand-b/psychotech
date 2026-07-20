import {
  DominoFace,
  DominoHalfRule,
  DominoPattern,
  DominoRule,
  DominoRuleSpec,
  DominoTile,
} from './domino-item';

export function mod7(value: number): DominoFace {
  return (((value % 7) + 7) % 7) as DominoFace;
}

function wraps(previous: DominoFace, step: number): boolean {
  const raw = previous + step;
  return raw > 6 || raw < 0;
}

interface HalfSequence {
  values: DominoFace[];
  hasWrap: boolean;
}

function buildHalfSequence(
  rule: DominoHalfRule,
  start: DominoFace,
  length: number,
): HalfSequence {
  const values: DominoFace[] = [start];
  let hasWrap = false;
  for (let index = 1; index < length; index += 1) {
    const previous = values[index - 1];
    switch (rule.kind) {
      case 'CONSTANT':
        values.push(rule.value);
        break;
      case 'STEP':
        hasWrap = hasWrap || wraps(previous, rule.step);
        values.push(mod7(previous + rule.step));
        break;
      case 'ALTERNATING_VALUES':
        values.push(rule.values[index % 2]);
        break;
      case 'ALTERNATING_STEPS': {
        const step = rule.steps[(index - 1) % 2];
        hasWrap = hasWrap || wraps(previous, step);
        values.push(mod7(previous + step));
        break;
      }
      case 'GROWING_STEP': {
        const step = index * rule.direction;
        hasWrap = hasWrap || wraps(previous, step);
        values.push(mod7(previous + step));
        break;
      }
    }
  }
  if (rule.kind === 'CONSTANT') {
    values[0] = rule.value;
  }
  if (rule.kind === 'ALTERNATING_VALUES') {
    values[0] = rule.values[0];
  }
  return { values, hasWrap };
}

export interface BuiltDominoSequence {
  tiles: DominoTile[];
  hasWrap: boolean;
}

export interface DominoSequenceStarts {
  top: DominoFace;
  bottom: DominoFace;
  oddTop: DominoFace;
  oddBottom: DominoFace;
}

export function buildDominoSequence(
  spec: DominoRuleSpec,
  starts: DominoSequenceStarts,
  length: number,
): BuiltDominoSequence {
  if (spec.pattern === DominoPattern.HALVES) {
    const top = buildHalfSequence(spec.top, starts.top, length);
    const bottom = buildHalfSequence(spec.bottom, starts.bottom, length);
    return {
      tiles: top.values.map((value, index) => ({
        top: value,
        bottom: bottom.values[index],
      })),
      hasWrap: top.hasWrap || bottom.hasWrap,
    };
  }
  if (spec.pattern === DominoPattern.CROSS) {
    const bottom = buildHalfSequence(spec.bottom, starts.bottom, length);
    const tops: DominoFace[] = [starts.top];
    let hasWrap = bottom.hasWrap;
    for (let index = 1; index < length; index += 1) {
      const previousBottom = bottom.values[index - 1];
      hasWrap = hasWrap || wraps(previousBottom, spec.offset);
      tops.push(mod7(previousBottom + spec.offset));
    }
    return {
      tiles: tops.map((value, index) => ({
        top: value,
        bottom: bottom.values[index],
      })),
      hasWrap,
    };
  }
  const tiles: DominoTile[] = [];
  let hasWrap = false;
  for (let index = 0; index < length; index += 1) {
    if (index < 2) {
      tiles.push(
        index === 0
          ? { top: starts.top, bottom: starts.bottom }
          : { top: starts.oddTop, bottom: starts.oddBottom },
      );
      continue;
    }
    const source = tiles[index - 2];
    const steps = index % 2 === 0 ? spec.even : spec.odd;
    hasWrap =
      hasWrap ||
      wraps(source.top, steps.topStep) ||
      wraps(source.bottom, steps.bottomStep);
    tiles.push({
      top: mod7(source.top + steps.topStep),
      bottom: mod7(source.bottom + steps.bottomStep),
    });
  }
  return { tiles, hasWrap };
}

function solveHalf(
  visible: readonly DominoFace[],
  rule: DominoHalfRule,
  answerIndex: number,
): DominoFace {
  const last = visible[visible.length - 1];
  switch (rule.kind) {
    case 'CONSTANT':
      return rule.value;
    case 'STEP':
      return mod7(last + rule.step);
    case 'ALTERNATING_VALUES':
      return rule.values[answerIndex % 2];
    case 'ALTERNATING_STEPS':
      return mod7(last + rule.steps[(answerIndex - 1) % 2]);
    case 'GROWING_STEP':
      return mod7(last + answerIndex * rule.direction);
  }
}

export function solveDominoAnswer(
  visibleTiles: readonly DominoTile[],
  spec: DominoRuleSpec,
): DominoTile {
  const answerIndex = visibleTiles.length;
  const tops = visibleTiles.map((tile) => tile.top);
  const bottoms = visibleTiles.map((tile) => tile.bottom);
  if (spec.pattern === DominoPattern.HALVES) {
    return {
      top: solveHalf(tops, spec.top, answerIndex),
      bottom: solveHalf(bottoms, spec.bottom, answerIndex),
    };
  }
  if (spec.pattern === DominoPattern.CROSS) {
    return {
      top: mod7(bottoms[bottoms.length - 1] + spec.offset),
      bottom: solveHalf(bottoms, spec.bottom, answerIndex),
    };
  }
  const source = visibleTiles[answerIndex - 2];
  const steps = answerIndex % 2 === 0 ? spec.even : spec.odd;
  return {
    top: mod7(source.top + steps.topStep),
    bottom: mod7(source.bottom + steps.bottomStep),
  };
}

export function evaluateDominoSequence(
  tiles: readonly DominoTile[],
  spec: DominoRuleSpec,
): boolean {
  for (let index = 1; index < tiles.length; index += 1) {
    if (spec.pattern === DominoPattern.INTERLEAVED && index < 2) {
      continue;
    }
    const expected = solveDominoAnswer(tiles.slice(0, index), spec);
    const actual = tiles[index];
    if (expected.top !== actual.top || expected.bottom !== actual.bottom) {
      return false;
    }
  }
  return true;
}

function halfStepAtTransition(
  rule: DominoHalfRule,
  transitionIndex: number,
): number | null {
  switch (rule.kind) {
    case 'CONSTANT':
    case 'ALTERNATING_VALUES':
      return null;
    case 'STEP':
      return rule.step;
    case 'ALTERNATING_STEPS':
      return rule.steps[transitionIndex % 2];
    case 'GROWING_STEP':
      return (transitionIndex + 1) * rule.direction;
  }
}

export interface DominoTransitionSteps {
  top: number | null;
  bottom: number | null;
}

export function dominoTransitionSteps(
  spec: DominoRuleSpec,
  tiles: readonly DominoTile[],
): DominoTransitionSteps[] {
  const transitions: DominoTransitionSteps[] = [];
  for (let index = 0; index < tiles.length - 1; index += 1) {
    if (spec.pattern === DominoPattern.HALVES) {
      transitions.push({
        top: halfStepAtTransition(spec.top, index),
        bottom: halfStepAtTransition(spec.bottom, index),
      });
    } else if (spec.pattern === DominoPattern.CROSS) {
      transitions.push({
        top: spec.offset,
        bottom: halfStepAtTransition(spec.bottom, index),
      });
    } else {
      const steps = (index + 1) % 2 === 0 ? spec.even : spec.odd;
      transitions.push(
        index === 0
          ? { top: null, bottom: null }
          : { top: steps.topStep, bottom: steps.bottomStep },
      );
    }
  }
  return transitions;
}

export function dominoWrapIndices(
  spec: DominoRuleSpec,
  tiles: readonly DominoTile[],
): number[] {
  const indices: number[] = [];
  const transitions = dominoTransitionSteps(spec, tiles);
  for (let index = 0; index < transitions.length; index += 1) {
    const { top, bottom } = transitions[index];
    const sourceTile =
      spec.pattern === DominoPattern.INTERLEAVED ? tiles[index - 1] : tiles[index];
    if (!sourceTile) {
      continue;
    }
    const topSource =
      spec.pattern === DominoPattern.CROSS ? tiles[index].bottom : sourceTile.top;
    if (
      (top !== null && wraps(topSource, top)) ||
      (bottom !== null && wraps(sourceTile.bottom, bottom))
    ) {
      indices.push(index + 1);
    }
  }
  return indices;
}

function formatStep(step: number): string {
  return step > 0 ? `+${step}` : `${step}`;
}

function halfClause(rule: DominoHalfRule): string {
  switch (rule.kind) {
    case 'CONSTANT':
      return `reste sur ${rule.value}`;
    case 'STEP':
      return rule.step > 0
        ? `avance de ${rule.step} à chaque domino`
        : `recule de ${-rule.step} à chaque domino`;
    case 'ALTERNATING_VALUES':
      return `alterne entre ${rule.values[0]} et ${rule.values[1]}`;
    case 'ALTERNATING_STEPS':
      return `enchaîne en alternance les pas ${formatStep(rule.steps[0])} et ${formatStep(rule.steps[1])}`;
    case 'GROWING_STEP':
      return rule.direction > 0
        ? `avance d'un pas qui grandit (+1, puis +2, puis +3…)`
        : `recule d'un pas qui grandit (−1, puis −2, puis −3…)`;
  }
}

function halfId(rule: DominoHalfRule): string {
  switch (rule.kind) {
    case 'CONSTANT':
      return 'const';
    case 'STEP':
      return `step${formatStep(rule.step)}`;
    case 'ALTERNATING_VALUES':
      return 'alt-values';
    case 'ALTERNATING_STEPS':
      return `alt-steps${formatStep(rule.steps[0])}${formatStep(rule.steps[1])}`;
    case 'GROWING_STEP':
      return rule.direction > 0 ? 'grow-up' : 'grow-down';
  }
}

const WRAP_CLAUSE = ' Après le 6, on revient à 0.';

function halfHintClause(rule: DominoHalfRule): string {
  switch (rule.kind) {
    case 'CONSTANT':
      return 'reste identique';
    case 'STEP':
      return rule.step > 0
        ? "avance d'un pas constant"
        : "recule d'un pas constant";
    case 'ALTERNATING_VALUES':
      return 'alterne entre deux valeurs';
    case 'ALTERNATING_STEPS':
      return 'alterne deux pas différents';
    case 'GROWING_STEP':
      return rule.direction > 0
        ? "avance d'un pas qui grandit"
        : "recule d'un pas qui grandit";
  }
}

export function buildDominoRule(
  spec: DominoRuleSpec,
  hasWrap: boolean,
): DominoRule {
  let id: string;
  let userText: string;
  let hintText: string;
  if (spec.pattern === DominoPattern.HALVES) {
    id = `halves-${halfId(spec.top)}-${halfId(spec.bottom)}`;
    userText = `La face du haut ${halfClause(spec.top)}, celle du bas ${halfClause(spec.bottom)}.`;
    hintText = `La face du haut ${halfHintClause(spec.top)}, celle du bas ${halfHintClause(spec.bottom)}.`;
  } else if (spec.pattern === DominoPattern.CROSS) {
    const offsetClause =
      spec.offset === 0
        ? ''
        : spec.offset > 0
          ? ` en ajoutant ${spec.offset}`
          : ` en retirant ${-spec.offset}`;
    id = `cross${formatStep(spec.offset)}-${halfId(spec.bottom)}`;
    userText = `Le haut de chaque domino reprend le bas du domino précédent${offsetClause}, et la face du bas ${halfClause(spec.bottom)}.`;
    hintText = `Le haut de chaque domino se déduit du bas du domino précédent, et la face du bas ${halfHintClause(spec.bottom)}.`;
  } else {
    id = `interleaved-${formatStep(spec.even.topStep)}${formatStep(spec.even.bottomStep)}-${formatStep(spec.odd.topStep)}${formatStep(spec.odd.bottomStep)}`;
    userText = `Deux suites s'entrelacent : les dominos de rang impair avancent de ${formatStep(spec.even.topStep)} en haut et ${formatStep(spec.even.bottomStep)} en bas, ceux de rang pair de ${formatStep(spec.odd.topStep)} en haut et ${formatStep(spec.odd.bottomStep)} en bas.`;
    hintText =
      "Deux suites s'entrelacent : les dominos de rang impair et de rang pair suivent chacun leur progression.";
  }
  return {
    id,
    userText: hasWrap ? `${userText}${WRAP_CLAUSE}` : userText,
    hintText: hasWrap ? `${hintText}${WRAP_CLAUSE}` : hintText,
  };
}
