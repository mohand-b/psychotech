import { describe, expect, it } from 'vitest';
import { LogicItemAnswerDto } from '../../dtos/session';
import { LogicFamily, LogicFamilyFilter } from '../../enums';
import { LOGIC_CONTENT_VERSION_V3 } from './logic-family';
import {
  LogicItem,
  MatrixLogicItem,
  NumericLogicItem,
} from './logic-item';
import { generateLogicSession } from './generate-logic-session';
import {
  computeLogicFamilyAggregates,
  logicAnswerCorrect,
} from './logic-session-scoring';

function answerFor(
  item: LogicItem,
  index: number,
  outcome: 'correct' | 'wrong' | 'skipped',
): LogicItemAnswerDto {
  const base = {
    index,
    answerIndex: null as number | null,
    timeMs: 2000,
    helpUsed: false,
    visited: true,
  };
  if (outcome === 'skipped') {
    return base;
  }
  if (item.family === LogicFamily.DOMINO) {
    const top = item.domino.answer.top;
    return {
      ...base,
      dominoTop: outcome === 'correct' ? top : ((top + 1) % 7) as never,
      dominoBottom: item.domino.answer.bottom,
    };
  }
  if (item.family === LogicFamily.NUMERIC && 'triangle' in item) {
    return {
      ...base,
      numericValue: outcome === 'correct' ? item.answer : item.answer + 1,
    };
  }
  const target = (item as NumericLogicItem | MatrixLogicItem).answerIndex;
  return { ...base, answerIndex: outcome === 'correct' ? target : (target + 1) % 2 };
}

const items = generateLogicSession(
  'aggregates',
  null,
  LOGIC_CONTENT_VERSION_V3,
);

describe('computeLogicFamilyAggregates', () => {
  it('compte justes, tentés, total et temps par famille', () => {
    const answers = items.map((item, index) => {
      if (item.family === LogicFamily.NUMERIC) {
        return answerFor(item, index, index < 4 ? 'correct' : 'skipped');
      }
      if (item.family === LogicFamily.DOMINO) {
        return answerFor(item, index, index % 2 === 0 ? 'correct' : 'wrong');
      }
      return answerFor(item, index, 'correct');
    });
    const aggregates = computeLogicFamilyAggregates(items, answers, null);
    expect(aggregates.map((entry) => entry.family)).toEqual([
      LogicFamily.NUMERIC,
      LogicFamily.DOMINO,
      LogicFamily.MATRIX_I,
      LogicFamily.MATRIX_II,
    ]);
    const numeric = aggregates[0];
    expect(numeric.total).toBe(10);
    expect(numeric.attempted).toBe(4);
    expect(numeric.correct).toBe(4);
    expect(numeric.ratePct).toBe(100);
    expect(numeric.timeMs).toBe(20000);
    const domino = aggregates[1];
    expect(domino.attempted).toBe(10);
    expect(domino.correct).toBe(5);
    expect(domino.ratePct).toBe(50);
    const check = items
      .filter((item) => item.family === LogicFamily.DOMINO)
      .filter((item) => logicAnswerCorrect(item, answers[item.index]));
    expect(check).toHaveLength(5);
  });

  it('désigne force et faiblesse par taux, départagés par justes', () => {
    const answers = items.map((item, index) => {
      if (item.family === LogicFamily.NUMERIC) {
        return answerFor(item, index, 'correct');
      }
      if (item.family === LogicFamily.DOMINO) {
        return answerFor(item, index, index % 2 === 0 ? 'correct' : 'wrong');
      }
      if (item.family === LogicFamily.MATRIX_I) {
        return answerFor(item, index, index % 5 === 0 ? 'wrong' : 'correct');
      }
      return answerFor(item, index, 'wrong');
    });
    const aggregates = computeLogicFamilyAggregates(items, answers, null);
    expect(
      aggregates.find((entry) => entry.family === LogicFamily.NUMERIC)?.marker,
    ).toBe('STRENGTH');
    expect(
      aggregates.find((entry) => entry.family === LogicFamily.MATRIX_II)
        ?.marker,
    ).toBe('WEAKNESS');
    expect(
      aggregates.filter((entry) => entry.marker !== null),
    ).toHaveLength(2);
  });

  it('départage deux familles à taux égal par le nombre de justes', () => {
    const answers = items.map((item, index) => {
      if (item.family === LogicFamily.NUMERIC) {
        return answerFor(item, index, index < 5 ? 'correct' : 'skipped');
      }
      if (item.family === LogicFamily.DOMINO) {
        return answerFor(item, index, 'correct');
      }
      return answerFor(item, index, 'wrong');
    });
    const aggregates = computeLogicFamilyAggregates(items, answers, null);
    const numeric = aggregates.find(
      (entry) => entry.family === LogicFamily.NUMERIC,
    );
    const domino = aggregates.find(
      (entry) => entry.family === LogicFamily.DOMINO,
    );
    expect(numeric?.ratePct).toBe(100);
    expect(domino?.ratePct).toBe(100);
    expect(domino?.marker).toBe('STRENGTH');
    expect(numeric?.marker).toBeNull();
  });

  it('réserve la force aux taux de 80 au moins et marque toute famille sous 30', () => {
    const answers = items.map((item, index) => {
      if (item.family === LogicFamily.NUMERIC) {
        return answerFor(item, index, index % 2 === 0 ? 'correct' : 'wrong');
      }
      if (item.family === LogicFamily.DOMINO) {
        return answerFor(item, index, index % 5 === 0 ? 'correct' : 'wrong');
      }
      if (item.family === LogicFamily.MATRIX_I) {
        return answerFor(item, index, index % 5 === 0 ? 'correct' : 'wrong');
      }
      return answerFor(item, index, 'wrong');
    });
    const aggregates = computeLogicFamilyAggregates(items, answers, null);
    const byFamily = new Map(aggregates.map((entry) => [entry.family, entry]));
    expect(byFamily.get(LogicFamily.NUMERIC)?.ratePct).toBe(50);
    expect(byFamily.get(LogicFamily.NUMERIC)?.marker).toBeNull();
    expect(byFamily.get(LogicFamily.DOMINO)?.marker).toBe('WEAKNESS');
    expect(byFamily.get(LogicFamily.MATRIX_I)?.marker).toBe('WEAKNESS');
    expect(byFamily.get(LogicFamily.MATRIX_II)?.marker).toBe('WEAKNESS');
    expect(
      aggregates.some((entry) => entry.marker === 'STRENGTH'),
    ).toBe(false);
  });

  it('ne désigne aucun extrême quand toutes les familles ont le même taux', () => {
    const answers = items.map((item, index) => answerFor(item, index, 'correct'));
    const aggregates = computeLogicFamilyAggregates(items, answers, null);
    expect(aggregates.every((entry) => entry.marker === null)).toBe(true);
  });

  it('produit une seule famille X/40 en session filtrée mono-famille, sans extrême', () => {
    const filtered = generateLogicSession(
      'aggregates-numeric',
      LogicFamilyFilter.NUMERIC,
      LOGIC_CONTENT_VERSION_V3,
    );
    const answers = filtered.map((item, index) =>
      answerFor(item, index, index % 2 === 0 ? 'correct' : 'wrong'),
    );
    const aggregates = computeLogicFamilyAggregates(
      filtered,
      answers,
      LogicFamilyFilter.NUMERIC,
    );
    expect(aggregates).toHaveLength(1);
    expect(aggregates[0].total).toBe(40);
    expect(aggregates[0].marker).toBeNull();
  });

  it('produit deux blocs X/20 en session filtrée Matrices, sans extrêmes', () => {
    const filtered = generateLogicSession(
      'aggregates-matrix',
      LogicFamilyFilter.MATRIX,
      LOGIC_CONTENT_VERSION_V3,
    );
    const answers = filtered.map((item, index) =>
      answerFor(
        item,
        index,
        item.family === LogicFamily.MATRIX_I ? 'correct' : 'wrong',
      ),
    );
    const aggregates = computeLogicFamilyAggregates(
      filtered,
      answers,
      LogicFamilyFilter.MATRIX,
    );
    expect(aggregates.map((entry) => entry.family)).toEqual([
      LogicFamily.MATRIX_I,
      LogicFamily.MATRIX_II,
    ]);
    expect(aggregates.every((entry) => entry.total === 20)).toBe(true);
    expect(aggregates.every((entry) => entry.marker === null)).toBe(true);
  });
});
