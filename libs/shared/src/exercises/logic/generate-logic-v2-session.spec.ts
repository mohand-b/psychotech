import { describe, expect, it } from 'vitest';
import { LogicFamily, LogicFamilyFilter } from '../../enums';
import { MatrixProposalKind, MatrixRegister } from '../matrix';
import { LogicItemAnswerDto } from '../../dtos/session';
import {
  LOGIC_MATRIX_CHOICE_COUNT,
  LOGIC_V2_MAX_POINTS,
  LOGIC_V2_SESSION_SIZE,
  generateLogicV2Session,
  generateLogicV2Tutorial,
} from './generate-logic-v2-session';
import { LogicV2Item } from './logic-v2-item';
import {
  computeLogicFamilyBreakdown,
  scoreLogicV2Session,
} from './logic-v2-scoring';

const BLOCK_LEVELS = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5];

function answerFor(
  item: LogicV2Item,
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

function expectFourProposalsWithSingleCorrect(items: LogicV2Item[]): number {
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

describe('generateLogicV2Session — composition standard', () => {
  const items = generateLogicV2Session('compo-standard');

  it('produit 4 blocs de 10 dans l’ordre fixe', () => {
    expect(items).toHaveLength(LOGIC_V2_SESSION_SIZE);
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
      LOGIC_V2_MAX_POINTS,
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

  it('est strictement déterministe', () => {
    expect(generateLogicV2Session('compo-standard')).toEqual(items);
  });
});

describe('generateLogicV2Session — filtre familles', () => {
  it('NUMERIQUES : 40 items de la famille, 8 par niveau, 120 points', () => {
    const items = generateLogicV2Session('filtre', LogicFamilyFilter.NUMERIC);
    expect(items).toHaveLength(40);
    expect(items.every((item) => item.family === LogicFamily.NUMERIC)).toBe(
      true,
    );
    for (let level = 1; level <= 5; level += 1) {
      expect(items.filter((item) => item.difficulty === level)).toHaveLength(8);
    }
    expect(items.reduce((sum, item) => sum + item.points, 0)).toBe(120);
  });

  it('DOMINOS : 40 items de la famille, 8 par niveau', () => {
    const items = generateLogicV2Session('filtre', LogicFamilyFilter.DOMINO);
    expect(items).toHaveLength(40);
    expect(items.every((item) => item.family === LogicFamily.DOMINO)).toBe(
      true,
    );
    for (let level = 1; level <= 5; level += 1) {
      expect(items.filter((item) => item.difficulty === level)).toHaveLength(8);
    }
  });

  it('MATRICES : 20 par bloc, pools respectés, 120 points', () => {
    const items = generateLogicV2Session('filtre', LogicFamilyFilter.MATRIX);
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

describe('generateLogicV2Tutorial — composition mixte', () => {
  it('produit 5 items : 2 suites, 1 domino, 1 matrice I, 1 matrice II', () => {
    const items = generateLogicV2Tutorial('tutoriel');
    expect(items.map((item) => item.family)).toEqual([
      LogicFamily.NUMERIC,
      LogicFamily.NUMERIC,
      LogicFamily.DOMINO,
      LogicFamily.MATRIX_I,
      LogicFamily.MATRIX_II,
    ]);
    expect(items.map((item) => item.difficulty)).toEqual([1, 2, 1, 1, 1]);
    expect(items.map((item) => item.index)).toEqual([0, 1, 2, 3, 4]);
  });

  it('réduit les matrices du tutoriel à 4 propositions dont une seule CORRECT', () => {
    expect(
      expectFourProposalsWithSingleCorrect(generateLogicV2Tutorial('tutoriel')),
    ).toBe(2);
  });

  it('est strictement déterministe', () => {
    expect(generateLogicV2Tutorial('tutoriel')).toEqual(
      generateLogicV2Tutorial('tutoriel'),
    );
  });
});

describe('scoreLogicV2Session — correction des trois formats', () => {
  const items = generateLogicV2Session('correction');

  it('donne 100 quand toutes les réponses sont justes dans les trois formats', () => {
    const responses = items.map((item) => answerFor(item, true));
    const scored = scoreLogicV2Session(items, responses);
    expect(scored.correctCount).toBe(40);
    expect(scored.score).toBe(100);
  });

  it('compte faux un QCM erroné, un domino inexact et une matrice erronée', () => {
    const numeric = items.find((item) => item.family === LogicFamily.NUMERIC);
    const domino = items.find((item) => item.family === LogicFamily.DOMINO);
    const matrix = items.find((item) => item.family === LogicFamily.MATRIX_I);
    const responses = [numeric, domino, matrix].map((item) =>
      answerFor(item as LogicV2Item, false),
    );
    const scored = scoreLogicV2Session(items, responses);
    expect(scored.wrongCount).toBe(3);
    expect(scored.correctCount).toBe(0);
  });

  it('traite une saisie domino partielle comme un item passé', () => {
    const domino = items.find((item) => item.family === LogicFamily.DOMINO);
    const partial: LogicItemAnswerDto = {
      index: (domino as LogicV2Item).index,
      answerIndex: null,
      dominoTop: 3,
      dominoBottom: null,
      timeMs: 800,
      helpUsed: false,
      visited: true,
    };
    const scored = scoreLogicV2Session(items, [partial]);
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
