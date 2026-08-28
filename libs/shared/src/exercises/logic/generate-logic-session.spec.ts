import { describe, expect, it } from 'vitest';
import { LogicFamily, LogicFamilyFilter } from '../../enums';
import { DominoPattern } from '../domino';
import { MatrixProposalKind, MatrixRegister } from '../matrix';
import { LogicItemAnswerDto } from '../../dtos/session';
import {
  LOGIC_MATRIX_CHOICE_COUNT,
  LOGIC_SESSION_MAX_POINTS,
  LOGIC_SESSION_SIZE,
  generateLogicSession,
  generateLogicTutorial,
} from './generate-logic-session';
import {
  LogicNumericStructure,
  LogicItem,
  NumericLogicItem,
  TriangleLogicItem,
} from './logic-item';
import {
  LOGIC_CONTENT_VERSION_V2,
  LOGIC_CONTENT_VERSION_V3,
  LOGIC_CONTENT_VERSION_V4,
  LOGIC_CONTENT_VERSION_V5,
} from './logic-family';
import {
  TRIANGLE_PATTERNS,
  TrianglePattern,
  TriangleSlot,
  TriangleValues,
} from '../triangle';
import {
  computeLogicFamilyBreakdown,
  scoreLogicSession,
} from './logic-session-scoring';

const BLOCK_LEVELS = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5];

function answerFor(
  item: LogicItem,
  correct: boolean,
  overrides: Partial<LogicItemAnswerDto> = {},
): LogicItemAnswerDto {
  const base = {
    index: item.index,
    answerIndex: null as number | null,
    timeMs: 1000,
    helpUsed: false,
    visited: true,
  };
  if (item.family === LogicFamily.DOMINO) {
    return {
      ...base,
      dominoTop: correct
        ? item.domino.answer.top
        : ((item.domino.answer.top + 1) % 7 as LogicItemAnswerDto['dominoTop']),
      dominoBottom: item.domino.answer.bottom,
      ...overrides,
    };
  }
  if (
    item.family === LogicFamily.NUMERIC &&
    item.structure === LogicNumericStructure.TRIANGLE
  ) {
    return {
      ...base,
      numericValue: correct ? item.answer : item.answer + 1,
      ...overrides,
    };
  }
  const choiceCount =
    item.family === LogicFamily.NUMERIC
      ? item.choices.length
      : item.proposals.length;
  return {
    ...base,
    answerIndex: correct
      ? item.answerIndex
      : (item.answerIndex + 1) % choiceCount,
    ...overrides,
  };
}

function expectFourProposalsWithSingleCorrect(items: LogicItem[]): number {
  let matrixCount = 0;
  for (const item of items) {
    if (
      item.family !== LogicFamily.MATRIX_I &&
      item.family !== LogicFamily.MATRIX_II
    ) {
      continue;
    }
    matrixCount += 1;
    expect(item.proposals).toHaveLength(LOGIC_MATRIX_CHOICE_COUNT);
    const correctPositions = item.proposals.flatMap((proposal, position) =>
      proposal.kind === MatrixProposalKind.CORRECT ? [position] : [],
    );
    expect(correctPositions).toEqual([item.answerIndex]);
  }
  return matrixCount;
}

describe('generateLogicSession — composition standard', () => {
  const items = generateLogicSession('compo-standard');

  it('produit 4 blocs de 10 dans l’ordre fixe', () => {
    expect(items).toHaveLength(LOGIC_SESSION_SIZE);
    const families = items.map((item) => item.family);
    expect(families.slice(0, 10).every((f) => f === LogicFamily.NUMERIC)).toBe(
      true,
    );
    expect(families.slice(10, 20).every((f) => f === LogicFamily.DOMINO)).toBe(
      true,
    );
    expect(
      families.slice(20, 30).every((f) => f === LogicFamily.MATRIX_I),
    ).toBe(true);
    expect(
      families.slice(30, 40).every((f) => f === LogicFamily.MATRIX_II),
    ).toBe(true);
  });

  it('monte en difficulté dans chaque bloc, 2 items par niveau', () => {
    for (let block = 0; block < 4; block += 1) {
      const levels = items
        .slice(block * 10, block * 10 + 10)
        .map((item) => item.difficulty);
      expect(levels).toEqual(BLOCK_LEVELS);
    }
  });

  it('totalise 120 points, points = niveau', () => {
    expect(items.every((item) => item.points === item.difficulty)).toBe(true);
    expect(items.reduce((sum, item) => sum + item.points, 0)).toBe(
      LOGIC_SESSION_MAX_POINTS,
    );
  });

  it('respecte les pools de structures des blocs matrices et varie les registres', () => {
    const blockOne = items.filter((item) => item.family === LogicFamily.MATRIX_I);
    const blockTwo = items.filter(
      (item) => item.family === LogicFamily.MATRIX_II,
    );
    for (const item of blockOne) {
      expect(
        item.rule.id.startsWith('crossed-') ||
          item.rule.id === 'composition-addition',
      ).toBe(true);
    }
    for (const item of blockTwo) {
      expect(
        item.rule.id.startsWith('distribution-') ||
          item.rule.id === 'composition-soustraction',
      ).toBe(true);
    }
    const registers = new Set(
      [...blockOne, ...blockTwo].map((item) =>
        item.family === LogicFamily.NUMERIC || item.family === LogicFamily.DOMINO
          ? null
          : item.matrix.register,
      ),
    );
    expect(registers.has(MatrixRegister.FIGURES)).toBe(true);
    expect(registers.has(MatrixRegister.TRAITS)).toBe(true);
  });

  it('embarque une règle à deux registres sur chaque item', () => {
    for (const item of items) {
      expect(item.rule.id.length).toBeGreaterThan(0);
      expect(item.rule.userText.length).toBeGreaterThan(0);
    }
  });

  it('réduit chaque matrice à 4 propositions dont une seule CORRECT à answerIndex', () => {
    expect(expectFourProposalsWithSingleCorrect(items)).toBe(20);
  });

  it('équilibre le bloc numérique : 1 suite + 1 triangle par niveau', () => {
    const numeric = items.filter((item) => item.family === LogicFamily.NUMERIC);
    expect(numeric).toHaveLength(10);
    for (let level = 1; level <= 5; level += 1) {
      const ofLevel = numeric.filter((item) => item.difficulty === level);
      const structures = ofLevel.map(
        (item) => (item as { structure: LogicNumericStructure }).structure,
      );
      expect(structures.sort()).toEqual([
        LogicNumericStructure.SEQUENCE,
        LogicNumericStructure.TRIANGLE,
      ]);
    }
  });

  it('conserve la composition en version de contenu 2 sans triangles et les autres blocs à seed égale', () => {
    const v2 = generateLogicSession('compo-standard', null, LOGIC_CONTENT_VERSION_V2);
    const v2Numeric = v2.filter((item) => item.family === LogicFamily.NUMERIC);
    expect(
      v2Numeric.every(
        (item) =>
          (item as { structure: LogicNumericStructure }).structure ===
          LogicNumericStructure.SEQUENCE,
      ),
    ).toBe(true);
    expect(v2.slice(10)).toEqual(items.slice(10));
  });

  it('est strictement déterministe', () => {
    expect(generateLogicSession('compo-standard')).toEqual(items);
  });
});

describe('generateLogicSession — filtre familles', () => {
  it('NUMERIQUES : 40 items de la famille, 8 par niveau, 120 points', () => {
    const items = generateLogicSession('filtre', LogicFamilyFilter.NUMERIC);
    expect(items).toHaveLength(40);
    expect(items.every((item) => item.family === LogicFamily.NUMERIC)).toBe(
      true,
    );
    for (let level = 1; level <= 5; level += 1) {
      const ofLevel = items.filter((item) => item.difficulty === level);
      expect(ofLevel).toHaveLength(8);
      expect(
        ofLevel.filter(
          (item) =>
            (item as { structure: LogicNumericStructure }).structure ===
            LogicNumericStructure.TRIANGLE,
        ),
      ).toHaveLength(4);
    }
    expect(items.reduce((sum, item) => sum + item.points, 0)).toBe(120);
  });

  it('DOMINOS : 40 items de la famille, 8 par niveau', () => {
    const items = generateLogicSession('filtre', LogicFamilyFilter.DOMINO);
    expect(items).toHaveLength(40);
    expect(items.every((item) => item.family === LogicFamily.DOMINO)).toBe(
      true,
    );
    for (let level = 1; level <= 5; level += 1) {
      expect(items.filter((item) => item.difficulty === level)).toHaveLength(8);
    }
  });

  it('MATRICES : 20 par bloc, pools respectés, 120 points', () => {
    const items = generateLogicSession('filtre', LogicFamilyFilter.MATRIX);
    expect(items).toHaveLength(40);
    expect(
      items.slice(0, 20).every((item) => item.family === LogicFamily.MATRIX_I),
    ).toBe(true);
    expect(
      items.slice(20).every((item) => item.family === LogicFamily.MATRIX_II),
    ).toBe(true);
    for (let level = 1; level <= 5; level += 1) {
      expect(
        items
          .slice(0, 20)
          .filter((item) => item.difficulty === level),
      ).toHaveLength(4);
    }
    expect(items.reduce((sum, item) => sum + item.points, 0)).toBe(120);
  });
});

describe('generateLogicTutorial — composition mixte', () => {
  it('produit 5 items : 1 suite, 1 triangle, 1 domino, 1 matrice I, 1 matrice II', () => {
    const items = generateLogicTutorial('tutoriel');
    expect(items.map((item) => item.family)).toEqual([
      LogicFamily.NUMERIC,
      LogicFamily.NUMERIC,
      LogicFamily.DOMINO,
      LogicFamily.MATRIX_I,
      LogicFamily.MATRIX_II,
    ]);
    expect(
      items
        .slice(0, 2)
        .map((item) => (item as { structure: LogicNumericStructure }).structure),
    ).toEqual([
      LogicNumericStructure.SEQUENCE,
      LogicNumericStructure.TRIANGLE,
    ]);
    expect(items.map((item) => item.difficulty)).toEqual([1, 1, 1, 1, 1]);
    expect(items.map((item) => item.index)).toEqual([0, 1, 2, 3, 4]);
  });

  it('réduit les matrices du tutoriel à 4 propositions dont une seule CORRECT', () => {
    expect(
      expectFourProposalsWithSingleCorrect(generateLogicTutorial('tutoriel')),
    ).toBe(2);
  });

  it('est strictement déterministe', () => {
    expect(generateLogicTutorial('tutoriel')).toEqual(
      generateLogicTutorial('tutoriel'),
    );
  });
});

function triangleItemsOf(items: LogicItem[]): TriangleLogicItem[] {
  return items.filter(
    (item): item is TriangleLogicItem =>
      item.family === LogicFamily.NUMERIC &&
      item.structure === LogicNumericStructure.TRIANGLE,
  );
}

function withTriangleSlot(
  values: TriangleValues,
  slot: TriangleSlot,
  value: number,
): TriangleValues {
  return {
    top: slot === TriangleSlot.TOP ? value : values.top,
    left: slot === TriangleSlot.LEFT ? value : values.left,
    right: slot === TriangleSlot.RIGHT ? value : values.right,
    center: slot === TriangleSlot.CENTER ? value : values.center,
  };
}

function patternFitsCompletes(
  pattern: TrianglePattern,
  triangles: readonly TriangleValues[],
): boolean {
  const completeCount = triangles.length - 1;
  if (pattern.usesPreviousCenter && completeCount < 2) {
    return false;
  }
  for (let index = 0; index < completeCount; index += 1) {
    if (pattern.usesPreviousCenter && index === 0) {
      continue;
    }
    const previousCenter = index > 0 ? triangles[index - 1].center : null;
    if (
      pattern.compute(triangles[index], previousCenter) !==
      triangles[index].center
    ) {
      return false;
    }
  }
  return true;
}

function patternPredictionsFor(
  pattern: TrianglePattern,
  item: TriangleLogicItem,
): number[] {
  const triangle = item.triangle;
  const last = triangle.triangles[triangle.missing.triangleIndex];
  const previousCenter =
    triangle.missing.triangleIndex > 0
      ? triangle.triangles[triangle.missing.triangleIndex - 1].center
      : null;
  if (triangle.missing.slot === TriangleSlot.CENTER) {
    const predicted = pattern.compute(last, previousCenter);
    return predicted === null ? [] : [predicted];
  }
  const solutions: number[] = [];
  for (let candidate = 1; candidate <= 9; candidate += 1) {
    const values = withTriangleSlot(last, triangle.missing.slot, candidate);
    if (pattern.compute(values, previousCenter) === values.center) {
      solutions.push(candidate);
    }
  }
  return solutions;
}

describe('generateLogicSession — répartition des dominos', () => {
  function dominoesOf(seed: string, filter: LogicFamilyFilter | null) {
    return generateLogicSession(seed, filter).flatMap((item) =>
      item.family === LogicFamily.DOMINO ? [item] : [],
    );
  }

  it('sert exactement 3 dominos diagonaux sur les 10 de la session standard', () => {
    for (const seed of ['mix-a', 'mix-b', 'mix-c']) {
      const dominoes = dominoesOf(seed, null);
      expect(dominoes).toHaveLength(10);
      const diagonals = dominoes.filter(
        (item) => item.domino.pattern === DominoPattern.DIAGONAL,
      );
      expect(diagonals).toHaveLength(3);
    }
  });

  it('réserve les diagonales à la fin de la montée en difficulté', () => {
    const dominoes = dominoesOf('mix-a', null);
    for (const item of dominoes) {
      const diagonal = item.domino.pattern === DominoPattern.DIAGONAL;
      if (item.difficulty <= 3) {
        expect(diagonal).toBe(false);
      }
      if (item.difficulty === 5) {
        expect(diagonal).toBe(true);
        expect(item.domino.level).toBe(4);
      }
    }
  });

  it('garde la même proportion sur la session filtrée dominos : 12 diagonales sur 40', () => {
    const dominoes = dominoesOf('mix-a', LogicFamilyFilter.DOMINO);
    expect(dominoes).toHaveLength(40);
    const diagonals = dominoes.filter(
      (item) => item.domino.pattern === DominoPattern.DIAGONAL,
    );
    expect(diagonals).toHaveLength(12);
  });
});

describe('generateLogicSession — propositions des triangles', () => {
  it('donne à chaque item triangle 4 propositions uniques contenant la réponse, dans les bornes des centres', () => {
    for (const seed of ['choix-a', 'choix-b', 'choix-c']) {
      const items = [
        ...generateLogicSession(seed),
        ...generateLogicSession(seed, LogicFamilyFilter.NUMERIC),
        ...generateLogicTutorial(seed),
      ];
      const triangles = items.filter(
        (item) =>
          item.family === LogicFamily.NUMERIC &&
          item.structure === LogicNumericStructure.TRIANGLE,
      );
      expect(triangles.length).toBeGreaterThan(0);
      for (const item of triangles) {
        if (
          item.family !== LogicFamily.NUMERIC ||
          item.structure !== LogicNumericStructure.TRIANGLE
        ) {
          continue;
        }
        expect(item.choices).toHaveLength(4);
        expect(new Set(item.choices).size).toBe(4);
        expect(item.choices[item.answerIndex]).toBe(String(item.answer));
        for (const choice of item.choices) {
          const value = Number(choice);
          expect(Number.isInteger(value)).toBe(true);
          expect(value).toBeGreaterThanOrEqual(1);
          expect(value).toBeLessThanOrEqual(90);
        }
      }
    }
  });

  it('reste déterministe à seed égale sans changer le contenu des triangles', () => {
    const first = generateLogicSession('choix-stable');
    const second = generateLogicSession('choix-stable');
    expect(first).toEqual(second);
  });

  it("n'offre jamais un choix défendable par un autre patron cohérent avec les triangles complets", () => {
    for (const seed of ['audit-0', 'audit-2', 'audit-12', 'choix-a', 'choix-b']) {
      const items = [
        ...generateLogicSession(seed),
        ...generateLogicSession(seed, LogicFamilyFilter.NUMERIC),
        ...generateLogicSession(seed, null, LOGIC_CONTENT_VERSION_V3),
      ];
      for (const item of triangleItemsOf(items)) {
        for (const pattern of TRIANGLE_PATTERNS) {
          if (pattern.id === item.triangle.patternId) {
            continue;
          }
          if (!patternFitsCompletes(pattern, item.triangle.triangles)) {
            continue;
          }
          for (const prediction of patternPredictionsFor(pattern, item)) {
            if (prediction === item.answer) {
              continue;
            }
            expect(item.choices).not.toContain(String(prediction));
          }
        }
      }
    }
  });

  it('borne les propositions des sommets manquants du catalogue complet V3 entre 1 et 9', () => {
    const items = generateLogicSession('choix-v3', null, LOGIC_CONTENT_VERSION_V3);
    const vertexItems = triangleItemsOf(items).filter(
      (item) => item.triangle.missing.slot !== TriangleSlot.CENTER,
    );
    expect(vertexItems.length).toBeGreaterThan(0);
    for (const item of vertexItems) {
      expect(item.choices).toHaveLength(4);
      expect(item.choices[item.answerIndex]).toBe(String(item.answer));
      for (const choice of item.choices) {
        const value = Number(choice);
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(9);
      }
    }
  });

  it('répartit la bonne réponse sur les quatre positions', () => {
    const counts = [0, 0, 0, 0];
    for (const seed of ['choix-a', 'choix-b', 'choix-c', 'choix-d', 'choix-e']) {
      for (const item of triangleItemsOf(
        generateLogicSession(seed, LogicFamilyFilter.NUMERIC),
      )) {
        counts[item.answerIndex] += 1;
      }
    }
    for (const count of counts) {
      expect(count).toBeGreaterThanOrEqual(10);
    }
  });

  it('fige le contenu exact de la session golden-pin, garde anti-dérive du rng', () => {
    const digest = generateLogicSession('golden-pin').map((item) => {
      if (item.family === LogicFamily.DOMINO) {
        return { family: item.family, tiles: item.domino.tiles };
      }
      if (
        item.family === LogicFamily.MATRIX_I ||
        item.family === LogicFamily.MATRIX_II
      ) {
        return {
          family: item.family,
          ruleId: item.rule.id,
          answerIndex: item.answerIndex,
        };
      }
      if (item.structure === LogicNumericStructure.TRIANGLE) {
        return {
          family: item.family,
          structure: item.structure,
          triangles: item.triangle.triangles,
          answer: item.answer,
          choices: item.choices,
          answerIndex: item.answerIndex,
        };
      }
      return {
        family: item.family,
        structure: item.structure,
        sequence: item.sequence,
        choices: item.choices,
        answerIndex: item.answerIndex,
      };
    });
    expect(digest).toMatchSnapshot();
  });
});

describe('scoreLogicSession — correction des trois formats', () => {
  const items = generateLogicSession('correction');

  it('donne 100 quand toutes les réponses sont justes dans les trois formats', () => {
    const responses = items.map((item) => answerFor(item, true));
    const scored = scoreLogicSession(items, responses);
    expect(scored.correctCount).toBe(40);
    expect(scored.score).toBe(100);
  });

  it('compte faux un QCM erroné, un domino inexact et une matrice erronée', () => {
    const numeric = items.find((item) => item.family === LogicFamily.NUMERIC);
    const domino = items.find((item) => item.family === LogicFamily.DOMINO);
    const matrix = items.find((item) => item.family === LogicFamily.MATRIX_I);
    const responses = [numeric, domino, matrix].map((item) =>
      answerFor(item as LogicItem, false),
    );
    const scored = scoreLogicSession(items, responses);
    expect(scored.wrongCount).toBe(3);
    expect(scored.correctCount).toBe(0);
  });

  it('corrige la saisie triangle : valeur juste, fausse, absente', () => {
    const triangle = items.find(
      (item) =>
        item.family === LogicFamily.NUMERIC &&
        (item as { structure: LogicNumericStructure }).structure ===
          LogicNumericStructure.TRIANGLE,
    ) as LogicItem;
    const right = scoreLogicSession(items, [answerFor(triangle, true)]);
    expect(right.correctCount).toBe(1);
    const wrong = scoreLogicSession(items, [answerFor(triangle, false)]);
    expect(wrong.wrongCount).toBe(1);
    const empty = scoreLogicSession(items, [
      { index: triangle.index, answerIndex: null, numericValue: null, timeMs: 500, helpUsed: false, visited: true },
    ]);
    expect(empty.skippedCount).toBe(1);
  });

  it('traite une saisie domino partielle comme un item passé', () => {
    const domino = items.find((item) => item.family === LogicFamily.DOMINO);
    const partial: LogicItemAnswerDto = {
      index: (domino as LogicItem).index,
      answerIndex: null,
      dominoTop: 3,
      dominoBottom: null,
      timeMs: 800,
      helpUsed: false,
      visited: true,
    };
    const scored = scoreLogicSession(items, [partial]);
    expect(scored.skippedCount).toBe(1);
    expect(scored.wrongCount).toBe(0);
  });

  it('ventile erreurs et temps par famille', () => {
    const numeric = items.filter((item) => item.family === LogicFamily.NUMERIC);
    const responses = [
      answerFor(numeric[0], false, { timeMs: 2000 }),
      answerFor(numeric[1], true, { timeMs: 1000 }),
    ];
    const breakdown = computeLogicFamilyBreakdown(items, responses);
    const numericEntry = breakdown.find(
      (entry) => entry.family === LogicFamily.NUMERIC,
    );
    expect(numericEntry).toEqual({
      family: LogicFamily.NUMERIC,
      errors: 1,
      timeMs: 3000,
    });
  });
});

describe('catalogue épuré en version de contenu 4', () => {
  const AUDIT_SEEDS = Array.from({ length: 10 }, (_, i) => `v4-audit-${i}`);
  const RETIRED = [
    'squares-plus-constant',
    'interleaved-sequences',
    'second-order-differences',
    'powers',
    'multiply-by-rank',
    'interleaved-double-fibonacci',
  ];

  function numericItemsOf(
    seed: string,
    contentVersion: number,
  ): (NumericLogicItem | TriangleLogicItem)[] {
    return generateLogicSession(
      seed,
      LogicFamilyFilter.NUMERIC,
      contentVersion,
    ).filter(
      (item): item is NumericLogicItem | TriangleLogicItem =>
        item.family === LogicFamily.NUMERIC,
    );
  }

  it('exclut les règles retirées des suites en v4', () => {
    for (const seed of AUDIT_SEEDS) {
      for (const item of numericItemsOf(seed, LOGIC_CONTENT_VERSION_V4)) {
        if (item.structure === LogicNumericStructure.SEQUENCE) {
          expect(RETIRED).not.toContain(item.rule.id);
        }
      }
    }
  });

  it('retire le sommet manquant et le second patron N5 des triangles en v4', () => {
    for (const seed of AUDIT_SEEDS) {
      for (const item of numericItemsOf(seed, LOGIC_CONTENT_VERSION_V4)) {
        if (item.structure === LogicNumericStructure.TRIANGLE) {
          expect(item.triangle.missing.slot).toBe(TriangleSlot.CENTER);
          expect(item.triangle.patternId).not.toBe(
            'center-previous-plus-top-minus-right',
          );
          if (item.difficulty === 4) {
            expect(item.triangle.patternId).toMatch(/^center-.*times/);
          }
          if (item.difficulty === 5) {
            expect(item.triangle.patternId).toBe('center-sum-minus-previous');
          }
        }
      }
    }
  });

  it('conserve le catalogue complet pour les versions 2 et 3 à seed égale', () => {
    const v3Sequences = AUDIT_SEEDS.flatMap((seed) =>
      numericItemsOf(seed, LOGIC_CONTENT_VERSION_V3).filter(
        (item) => item.structure === LogicNumericStructure.SEQUENCE,
      ),
    );
    expect(
      v3Sequences.some((item) => RETIRED.includes(item.rule.id)),
    ).toBe(true);
    const v3Triangles = AUDIT_SEEDS.flatMap((seed) =>
      numericItemsOf(seed, LOGIC_CONTENT_VERSION_V3).filter(
        (item) => item.structure === LogicNumericStructure.TRIANGLE,
      ),
    );
    expect(
      v3Triangles.some(
        (item) => item.triangle.missing.slot !== TriangleSlot.CENTER,
      ),
    ).toBe(true);
  });
});


describe('content version 6 rule pool', () => {
  it('retires alternating-multiply-add for new sessions and keeps it for older ones', () => {
    const v5 = generateLogicSession('pool-v5', null, LOGIC_CONTENT_VERSION_V5);
    const v5Rules = new Set(v5.map((item) => item.rule.id));
    expect(v5Rules.has('alternating-multiply-add')).toBe(false);

    const sessions = ['a', 'b', 'c', 'd', 'e'].map((seed) =>
      generateLogicSession(`pool-v4-${seed}`, null, 5),
    );
    const v4Rules = new Set(
      sessions.flat().map((item) => item.rule.id),
    );
    expect(v4Rules.has('alternating-multiply-add')).toBe(true);
  });
});
