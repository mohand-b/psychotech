import { describe, expect, it } from 'vitest';
import {
  DominoFace,
  DominoHalfRule,
  DominoItem,
  DominoLevel,
  DominoPattern,
  DominoTile,
} from './domino-item';
import {
  buildDominoRule,
  dominoWrapIndices,
  evaluateDominoSequence,
  solveDominoAnswer,
} from './domino-rules';
import { generateDominoItem } from './generate-domino-item';

const LEVELS: DominoLevel[] = [1, 2, 3, 4];
const SEEDS_PER_LEVEL = 125;

function forEachGeneratedItem(check: (item: DominoItem) => void): void {
  for (const level of LEVELS) {
    for (let draw = 0; draw < SEEDS_PER_LEVEL; draw += 1) {
      check(generateDominoItem({ level, seed: `property-${draw}` }));
    }
  }
}

describe('generateDominoItem — propriétés sur 500 tirages (4 niveaux × 125 seeds)', () => {
  it('produit une suite de 5 à 7 dominos aux faces 0-6, réponse comprise', () => {
    forEachGeneratedItem((item) => {
      expect(item.length).toBeGreaterThanOrEqual(5);
      expect(item.length).toBeLessThanOrEqual(7);
      expect(item.tiles).toHaveLength(item.length);
      for (const tile of item.tiles) {
        for (const face of [tile.top, tile.bottom]) {
          expect(Number.isInteger(face)).toBe(true);
          expect(face).toBeGreaterThanOrEqual(0);
          expect(face).toBeLessThanOrEqual(6);
        }
      }
      expect(item.answer).toEqual(item.tiles[item.length - 1]);
    });
  });

  it('vérifie la réponse par évaluation de la règle sur toute la suite', () => {
    forEachGeneratedItem((item) => {
      const visible = item.tiles.slice(0, -1);
      expect(solveDominoAnswer(visible, item.ruleSpec)).toEqual(item.answer);
      expect(evaluateDominoSequence(item.tiles, item.ruleSpec)).toBe(true);
    });
  });

  it('rend chaque composante de la règle inférable depuis la partie visible', () => {
    forEachGeneratedItem((item) => {
      const visible = item.tiles.slice(0, -1);
      if (item.ruleSpec.pattern === DominoPattern.INTERLEAVED) {
        expect(visible.length).toBeGreaterThanOrEqual(6);
        return;
      }
      const halves =
        item.ruleSpec.pattern === DominoPattern.HALVES
          ? [
              { rule: item.ruleSpec.top, values: visible.map((t) => t.top) },
              { rule: item.ruleSpec.bottom, values: visible.map((t) => t.bottom) },
            ]
          : [
              { rule: item.ruleSpec.bottom, values: visible.map((t) => t.bottom) },
            ];
      if (item.ruleSpec.pattern === DominoPattern.CROSS) {
        expect(visible.length).toBeGreaterThanOrEqual(3);
      }
      for (const { rule, values } of halves) {
        const transitions = values.length - 1;
        switch (rule.kind) {
          case 'STEP':
            expect(transitions).toBeGreaterThanOrEqual(2);
            break;
          case 'ALTERNATING_STEPS':
            expect(transitions).toBeGreaterThanOrEqual(4);
            break;
          case 'GROWING_STEP':
            expect(transitions).toBeGreaterThanOrEqual(3);
            break;
          case 'ALTERNATING_VALUES':
            for (const value of rule.values) {
              expect(
                values.filter((candidate) => candidate === value).length,
              ).toBeGreaterThanOrEqual(2);
            }
            break;
          case 'CONSTANT':
            expect(values.length).toBeGreaterThanOrEqual(2);
            break;
        }
      }
    });
  });

  it('respecte les familles de patrons par niveau et le wrap visible au niveau 2', () => {
    forEachGeneratedItem((item) => {
      switch (item.level) {
        case 1: {
          expect(item.ruleSpec.pattern).toBe(DominoPattern.HALVES);
          if (item.ruleSpec.pattern === DominoPattern.HALVES) {
            const kinds = [item.ruleSpec.top.kind, item.ruleSpec.bottom.kind];
            expect(kinds).toContain('CONSTANT');
            expect(kinds).toContain('STEP');
          }
          expect(item.hasWrap).toBe(false);
          break;
        }
        case 2: {
          expect(item.ruleSpec.pattern).toBe(DominoPattern.HALVES);
          if (item.ruleSpec.pattern === DominoPattern.HALVES) {
            expect(item.ruleSpec.top.kind).toBe('STEP');
            expect(item.ruleSpec.bottom.kind).toBe('STEP');
          }
          const visibleWrap = dominoWrapIndices(item.ruleSpec, item.tiles).some(
            (index) => index <= item.length - 2,
          );
          expect(visibleWrap).toBe(true);
          break;
        }
        case 3: {
          expect(item.ruleSpec.pattern).toBe(DominoPattern.HALVES);
          if (item.ruleSpec.pattern === DominoPattern.HALVES) {
            const kinds = [item.ruleSpec.top.kind, item.ruleSpec.bottom.kind];
            expect(
              kinds.includes('ALTERNATING_VALUES') ||
                kinds.includes('ALTERNATING_STEPS'),
            ).toBe(true);
          }
          break;
        }
        case 4: {
          expect(item.ruleSpec.pattern).toBe(DominoPattern.HALVES);
          if (item.ruleSpec.pattern === DominoPattern.HALVES) {
            expect(
              [item.ruleSpec.top.kind, item.ruleSpec.bottom.kind].includes(
                'GROWING_STEP',
              ),
            ).toBe(true);
          }
          break;
        }
      }
    });
  });

  it('signale le bouclage modulo 7 exactement quand il survient', () => {
    forEachGeneratedItem((item) => {
      const wrapIndices = dominoWrapIndices(item.ruleSpec, item.tiles);
      expect(item.hasWrap).toBe(wrapIndices.length > 0);
      expect(
        item.rule.userText.includes('revient à 0') ||
          item.rule.userText.includes('repart de 6'),
      ).toBe(item.hasWrap);
    });
  });

  it('reste strictement déterministe à seed égale', () => {
    for (const level of LEVELS) {
      expect(generateDominoItem({ level, seed: 'stable' })).toEqual(
        generateDominoItem({ level, seed: 'stable' }),
      );
    }
  });

  it('rejette les suites visibles dégénérées aux niveaux 1-3', () => {
    forEachGeneratedItem((item) => {
      if (item.level > 3) {
        return;
      }
      const visible = item.tiles.slice(0, -1);
      const first = visible[0];
      expect(
        visible.every(
          (tile) => tile.top === first.top && tile.bottom === first.bottom,
        ),
      ).toBe(false);
    });
  });
});

const BOUNDARY_DRAWS_PER_LEVEL = 750;

function independentModulo(value: number): DominoFace {
  return (((value % 7) + 7) % 7) as DominoFace;
}

function independentStepAt(
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

function independentNext(
  rule: DominoHalfRule,
  values: readonly DominoFace[],
  index: number,
): DominoFace {
  switch (rule.kind) {
    case 'CONSTANT':
      return rule.value;
    case 'ALTERNATING_VALUES':
      return rule.values[index % 2];
    default: {
      const step = independentStepAt(rule, index - 1);
      return independentModulo(values[index - 1] + (step ?? 0));
    }
  }
}

type WrapDirection = 'up' | 'down' | null;

function wrapDirectionAt(
  rule: DominoHalfRule,
  values: readonly DominoFace[],
  transitionIndex: number,
): WrapDirection {
  const step = independentStepAt(rule, transitionIndex);
  if (step === null) {
    return null;
  }
  const raw = values[transitionIndex] + step;
  return raw > 6 ? 'up' : raw < 0 ? 'down' : null;
}

interface HalfView {
  rule: DominoHalfRule;
  values: DominoFace[];
}

function halvesOf(item: DominoItem): HalfView[] {
  if (item.ruleSpec.pattern !== DominoPattern.HALVES) {
    return [];
  }
  return [
    { rule: item.ruleSpec.top, values: item.tiles.map((tile) => tile.top) },
    {
      rule: item.ruleSpec.bottom,
      values: item.tiles.map((tile) => tile.bottom),
    },
  ];
}

function forEachBoundaryItem(check: (item: DominoItem) => void): void {
  for (const level of LEVELS) {
    for (let draw = 0; draw < BOUNDARY_DRAWS_PER_LEVEL; draw += 1) {
      check(generateDominoItem({ level, seed: `frontiere-${draw}` }));
    }
  }
}

describe('generateDominoItem — frontières modulo 7 sur 3000 tirages', () => {
  it('donne une réponse en vraie arithmétique modulaire, jamais en butée, frontières couvertes', () => {
    const coverage = {
      answerWrapDown: 0,
      answerWrapUp: 0,
      answerOnZeroAfterDescent: 0,
      answerOnSixAfterAscent: 0,
      alternatingWrap: 0,
    };
    forEachBoundaryItem((item) => {
      const answerIndex = item.tiles.length - 1;
      for (const { rule, values } of halvesOf(item)) {
        const expected = independentNext(rule, values, answerIndex);
        expect(values[answerIndex]).toBe(expected);
        const direction = wrapDirectionAt(rule, values, answerIndex - 1);
        if (direction === 'down') {
          coverage.answerWrapDown += 1;
        }
        if (direction === 'up') {
          coverage.answerWrapUp += 1;
        }
        const step = independentStepAt(rule, answerIndex - 1);
        if (step !== null && step < 0 && values[answerIndex] === 0) {
          coverage.answerOnZeroAfterDescent += 1;
        }
        if (step !== null && step > 0 && values[answerIndex] === 6) {
          coverage.answerOnSixAfterAscent += 1;
        }
        if (rule.kind === 'ALTERNATING_STEPS' && direction !== null) {
          coverage.alternatingWrap += 1;
        }
      }
    });
    expect(coverage.answerWrapDown).toBeGreaterThan(0);
    expect(coverage.answerWrapUp).toBeGreaterThan(0);
    expect(coverage.answerOnZeroAfterDescent).toBeGreaterThan(0);
    expect(coverage.answerOnSixAfterAscent).toBeGreaterThan(0);
    expect(coverage.alternatingWrap).toBeGreaterThan(0);
  });

  it('ne demande jamais un bouclage en réponse sans en avoir montré un sur la même face', () => {
    forEachBoundaryItem((item) => {
      const answerTransition = item.tiles.length - 2;
      for (const { rule, values } of halvesOf(item)) {
        if (wrapDirectionAt(rule, values, answerTransition) === null) {
          continue;
        }
        let shown = false;
        for (let index = 0; index < answerTransition; index += 1) {
          if (wrapDirectionAt(rule, values, index) !== null) {
            shown = true;
            break;
          }
        }
        expect(shown).toBe(true);
      }
    });
  });

  it('mentionne le bouclage selon sa direction, réponse comprise', () => {
    forEachBoundaryItem((item) => {
      let up = false;
      let down = false;
      for (const { rule, values } of halvesOf(item)) {
        for (let index = 0; index < item.tiles.length - 1; index += 1) {
          const direction = wrapDirectionAt(rule, values, index);
          up = up || direction === 'up';
          down = down || direction === 'down';
        }
      }
      expect(item.rule.userText.includes('Après le 6, on revient à 0.')).toBe(
        up,
      );
      expect(item.rule.userText.includes('Sous le 0, on repart de 6.')).toBe(
        down,
      );
      expect(item.hasWrap).toBe(up || down);
    });
  });

  it('expose les exemples visibles séparés de la réponse', () => {
    forEachBoundaryItem((item) => {
      expect(item.visibleTiles).toHaveLength(item.length - 1);
      expect(item.visibleTiles).toEqual(item.tiles.slice(0, -1));
      const withAnswer: DominoTile[] = [...item.visibleTiles, item.answer];
      expect(withAnswer).toEqual(item.tiles);
    });
  });
});

describe('buildDominoRule — formulations utilisateur', () => {
  it('formule les deux moitiés indépendantes', () => {
    const rule = buildDominoRule(
      {
        pattern: DominoPattern.HALVES,
        top: { kind: 'STEP', step: 2 },
        bottom: { kind: 'STEP', step: -1 },
      },
      { up: true, down: true },
    );
    expect(rule.id).toBe('halves-step+2-step-1');
    expect(rule.userText).toBe(
      'La face du haut avance de 2 à chaque domino, celle du bas recule de 1 à chaque domino. Après le 6, on revient à 0. Sous le 0, on repart de 6.',
    );
  });

  it("omet le rappel du bouclage quand aucun wrap n'est présent", () => {
    const rule = buildDominoRule(
      {
        pattern: DominoPattern.HALVES,
        top: { kind: 'CONSTANT', value: 3 },
        bottom: { kind: 'ALTERNATING_VALUES', values: [1, 4] },
      },
      { up: false, down: false },
    );
    expect(rule.userText).toBe(
      'La face du haut reste sur 3, celle du bas alterne entre 1 et 4.',
    );
  });

  it('formule la règle croisée haut-bas', () => {
    const rule = buildDominoRule(
      {
        pattern: DominoPattern.CROSS,
        offset: 1,
        bottom: { kind: 'STEP', step: 2 },
      },
      { up: false, down: false },
    );
    expect(rule.id).toBe('cross+1-step+2');
    expect(rule.userText).toBe(
      'Le haut de chaque domino reprend le bas du domino précédent en ajoutant 1, et la face du bas avance de 2 à chaque domino.',
    );
  });

  it('formule les suites entrelacées', () => {
    const rule = buildDominoRule(
      {
        pattern: DominoPattern.INTERLEAVED,
        even: { topStep: 2, bottomStep: -1 },
        odd: { topStep: 1, bottomStep: 3 },
      },
      { up: false, down: false },
    );
    expect(rule.userText).toContain('rang impair');
    expect(rule.userText).toContain('+2 en haut');
  });

  it('fournit une aide générique sans valeurs, la règle précise restant à part', () => {
    const rule = buildDominoRule(
      {
        pattern: DominoPattern.HALVES,
        top: { kind: 'STEP', step: 2 },
        bottom: { kind: 'STEP', step: -1 },
      },
      { up: true, down: false },
    );
    expect(rule.userText).toBe(
      'La face du haut avance de 2 à chaque domino, celle du bas recule de 1 à chaque domino. Après le 6, on revient à 0.',
    );
    expect(rule.hintText).toBe(
      "La face du haut avance d'un pas constant, celle du bas recule d'un pas constant. Après le 6, on revient à 0.",
    );
    expect(rule.hintText.replace('Après le 6, on revient à 0.', '')).not.toMatch(
      /\d/,
    );
  });
});
