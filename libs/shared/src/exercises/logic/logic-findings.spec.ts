import { describe, expect, it } from 'vitest';
import { LogicItemAnswerDto } from '../../dtos/session';
import { LogicFamily, LogicFamilyFilter, RecommendationPriority } from '../../enums';
import { DominoPattern } from '../domino';
import {
  MatrixLayerKind,
  MatrixRegister,
  MatrixRuleSpec,
  MatrixStructure,
} from '../matrix';
import { TriangleLevel, TriangleSlot } from '../triangle';
import { analyzeLogic } from './logic-findings';
import {
  DominoLogicItem,
  LogicNumericStructure,
  MatrixLogicItem,
  NumericLogicItem,
  TriangleLogicItem,
} from './logic-item';
import { LogicRuleItem } from './logic-rule-item';
import { LogicItemStatus, LogicSessionScore } from './logic-scoring';

function item(index: number, ruleId: string): LogicRuleItem {
  return {
    index,
    ruleId,
    difficulty: 1,
    sequence: ['2', '4', '6', '8', '10'],
    choices: ['12', '13', '14', '15'],
    answerIndex: 0,
    points: 1,
  };
}

function response(
  index: number,
  answerIndex: number | null,
  timeMs: number,
  visited = true,
): LogicItemAnswerDto {
  return { index, answerIndex, timeMs, helpUsed: false, visited };
}

function score(
  statuses: LogicItemStatus[],
  overrides: Partial<LogicSessionScore> = {},
): LogicSessionScore {
  return {
    score: 70,
    precision: 75,
    coverage: 100,
    correctCount: statuses.filter((status) => status === 'CORRECT').length,
    wrongCount: statuses.filter((status) => status === 'WRONG').length,
    skippedCount: statuses.filter((status) => status === 'SKIPPED').length,
    unreachedCount: statuses.filter((status) => status === 'UNREACHED').length,
    statuses,
    avgAnswerTimeMs: 10_000,
    ...overrides,
  };
}

describe('analyzeLogic', () => {
  it('flags errors concentrated on a single rule family', () => {
    const items = [
      item(0, 'arithmetic-constant-step'),
      item(1, 'fibonacci-like'),
      item(2, 'fibonacci-like'),
      item(3, 'fibonacci-like'),
      item(4, 'increasing-step'),
    ];
    const statuses: LogicItemStatus[] = [
      'CORRECT',
      'WRONG',
      'WRONG',
      'WRONG',
      'WRONG',
    ];
    const findings = analyzeLogic(items, score(statuses), []);
    const family = findings.find(({ id }) => id === 'LOGIC_RULE_FAMILY_ERRORS');
    expect(family).toBeDefined();
    expect(family?.severity).toBe(RecommendationPriority.HIGH);
    expect(family?.finding).toContain('3 de vos 4 erreurs');
    expect(family?.finding).toContain('somme des deux précédents');
  });

  it('names no family but never crashes on v2 rule ids unknown to the legacy hints', () => {
    const items = [
      item(0, 'domino-mirror-columns'),
      item(1, 'domino-mirror-columns'),
      item(2, 'domino-mirror-columns'),
      item(3, 'arithmetic-constant-step'),
      item(4, 'powers'),
    ];
    const statuses: LogicItemStatus[] = [
      'WRONG',
      'WRONG',
      'WRONG',
      'CORRECT',
      'CORRECT',
    ];
    const findings = analyzeLogic(items, score(statuses), []);
    const family = findings.find(({ id }) => id === 'LOGIC_RULE_FAMILY_ERRORS');
    expect(family).toBeDefined();
    expect(family?.finding).toContain(
      "3 de vos 3 erreurs portent sur le même type d'exercice",
    );
  });

  it('stays silent on rule families when errors are spread out', () => {
    const items = [
      item(0, 'arithmetic-constant-step'),
      item(1, 'fibonacci-like'),
      item(2, 'increasing-step'),
      item(3, 'powers'),
    ];
    const statuses: LogicItemStatus[] = ['WRONG', 'WRONG', 'WRONG', 'WRONG'];
    expect(
      analyzeLogic(items, score(statuses), []).map(({ id }) => id),
    ).not.toContain('LOGIC_RULE_FAMILY_ERRORS');
  });

  it('flags impulsive wrong answers given in less than half the average time', () => {
    const statuses: LogicItemStatus[] = ['WRONG', 'WRONG', 'CORRECT'];
    const responses = [
      response(0, 1, 3_000),
      response(1, 2, 4_000),
      response(2, 0, 15_000),
    ];
    const findings = analyzeLogic(
      [item(0, 'powers'), item(1, 'fibonacci-like'), item(2, 'increasing-step')],
      score(statuses, { avgAnswerTimeMs: 10_000 }),
      responses,
    );
    const impulsive = findings.find(({ id }) => id === 'LOGIC_IMPULSIVITY');
    expect(impulsive).toBeDefined();
    expect(impulsive?.finding).toContain('2 items ratés');
  });

  it('stays silent on impulsivity when wrong answers take normal time', () => {
    const statuses: LogicItemStatus[] = ['WRONG', 'WRONG', 'CORRECT'];
    const responses = [
      response(0, 1, 9_000),
      response(1, 2, 11_000),
      response(2, 0, 10_000),
    ];
    expect(
      analyzeLogic(
        [item(0, 'powers'), item(1, 'fibonacci-like'), item(2, 'increasing-step')],
        score(statuses, { avgAnswerTimeMs: 10_000 }),
        responses,
      ).map(({ id }) => id),
    ).not.toContain('LOGIC_IMPULSIVITY');
  });

  it('flags a precise but too slow session', () => {
    const statuses: LogicItemStatus[] = [
      'CORRECT',
      'CORRECT',
      'CORRECT',
      'UNREACHED',
      'UNREACHED',
    ];
    const findings = analyzeLogic(
      [],
      score(statuses, { precision: 100 }),
      [],
    );
    const slow = findings.find(({ id }) => id === 'LOGIC_SLOW_ACCURATE');
    expect(slow).toBeDefined();
    expect(slow?.severity).toBe(RecommendationPriority.HIGH);
    expect(slow?.finding).toContain('100 % de précision');
    expect(slow?.finding).toContain('2 items jamais atteints');
  });

  it('stays silent on slowness when every item is reached', () => {
    const statuses: LogicItemStatus[] = ['CORRECT', 'CORRECT', 'WRONG'];
    expect(
      analyzeLogic([], score(statuses, { precision: 90 }), []).map(
        ({ id }) => id,
      ),
    ).not.toContain('LOGIC_SLOW_ACCURATE');
  });

  it('flags skipped items never revisited', () => {
    const statuses: LogicItemStatus[] = ['CORRECT', 'SKIPPED', 'SKIPPED'];
    const findings = analyzeLogic([], score(statuses), []);
    const skipped = findings.find(
      ({ id }) => id === 'LOGIC_SKIPPED_NOT_REVISITED',
    );
    expect(skipped).toBeDefined();
    expect(skipped?.finding).toContain('2 items passés');
  });

  it('flags misses collapsing in the last quarter of the trial', () => {
    const statuses: LogicItemStatus[] = [
      ...Array.from({ length: 12 }, () => 'CORRECT' as LogicItemStatus),
      'WRONG',
      'WRONG',
      'SKIPPED',
      'UNREACHED',
    ];
    const findings = analyzeLogic([], score(statuses), []);
    const collapse = findings.find(({ id }) => id === 'LOGIC_END_COLLAPSE');
    expect(collapse).toBeDefined();
    expect(collapse?.finding).toContain('4 de vos 4 erreurs');
  });

  it('stays silent on the end collapse when misses are spread out', () => {
    const statuses: LogicItemStatus[] = [
      'WRONG',
      'CORRECT',
      'CORRECT',
      'WRONG',
      'CORRECT',
      'CORRECT',
      'CORRECT',
      'WRONG',
    ];
    expect(
      analyzeLogic([], score(statuses), []).map(({ id }) => id),
    ).not.toContain('LOGIC_END_COLLAPSE');
  });
});

function numericItem(index: number): NumericLogicItem {
  return {
    index,
    family: LogicFamily.NUMERIC,
    structure: LogicNumericStructure.SEQUENCE,
    difficulty: 1,
    points: 1,
    sequence: ['2', '4', '6'],
    choices: ['8', '9', '10', '11'],
    answerIndex: 0,
    rule: { id: 'numeric-rule', userText: 'Pas constant' },
  };
}

function triangleLogicItem(index: number, level: TriangleLevel): TriangleLogicItem {
  return {
    index,
    family: LogicFamily.NUMERIC,
    structure: LogicNumericStructure.TRIANGLE,
    difficulty: 1,
    points: 1,
    answer: 7,
    triangle: {
      level,
      seed: `triangle-${index}`,
      triangles: [],
      missing: { triangleIndex: 0, slot: TriangleSlot.CENTER },
      answer: 7,
      rule: { id: 'triangle-rule', userText: 'Somme des sommets' },
      patternId: `N${level}`,
      length: 3,
    },
    rule: { id: 'triangle-rule', userText: 'Somme des sommets' },
  };
}

function dominoLogicItem(index: number, hasWrap: boolean): DominoLogicItem {
  return {
    index,
    family: LogicFamily.DOMINO,
    difficulty: 1,
    points: 1,
    domino: {
      level: 1,
      seed: `domino-${index}`,
      tiles: [],
      visibleTiles: [],
      answer: { top: 1, bottom: 2 },
      rule: { id: 'domino-rule', userText: 'Pas de 1', hintText: 'Pas de 1' },
      ruleSpec: {
        pattern: DominoPattern.HALVES,
        top: { kind: 'CONSTANT', value: 1 },
        bottom: { kind: 'CONSTANT', value: 2 },
      },
      pattern: DominoPattern.HALVES,
      length: 5,
      hasWrap,
    },
    rule: { id: 'domino-rule', userText: 'Pas de 1' },
  };
}

function matrixLogicItem(
  index: number,
  structure: MatrixStructure,
): MatrixLogicItem {
  const ruleSpec: MatrixRuleSpec =
    structure === MatrixStructure.CROSSED
      ? {
          structure: MatrixStructure.CROSSED,
          rowLayer: MatrixLayerKind.SYMBOL,
          colLayer: MatrixLayerKind.CONTAINER,
          progressionLayer: null,
        }
      : {
          structure: MatrixStructure.DISTRIBUTION,
          latinLayers: [MatrixLayerKind.SYMBOL],
        };
  return {
    index,
    family: LogicFamily.MATRIX_II,
    difficulty: 1,
    points: 1,
    matrix: {
      structure,
      variant: null,
      register: MatrixRegister.FIGURES,
      level: 1,
      seed: `matrix-${index}`,
      cells: [],
      proposals: [],
      rule: { id: 'matrix-rule', userText: 'Croisement ligne-colonne' },
      ruleSpec,
      activeLayers: [],
    },
    proposals: [],
    answerIndex: 0,
    rule: { id: 'matrix-rule', userText: 'Croisement ligne-colonne' },
  };
}

function choiceAnswer(
  index: number,
  correct: boolean,
  timeMs = 10_000,
): LogicItemAnswerDto {
  return {
    index,
    answerIndex: correct ? 0 : 1,
    timeMs,
    helpUsed: false,
    visited: true,
  };
}

function dominoAnswer(
  index: number,
  correct: boolean,
  timeMs = 10_000,
): LogicItemAnswerDto {
  return {
    index,
    answerIndex: null,
    dominoTop: correct ? 1 : 0,
    dominoBottom: correct ? 2 : 0,
    timeMs,
    helpUsed: false,
    visited: true,
  };
}

function triangleAnswer(
  index: number,
  correct: boolean,
  timeMs = 10_000,
): LogicItemAnswerDto {
  return {
    index,
    answerIndex: null,
    numericValue: correct ? 7 : 3,
    timeMs,
    helpUsed: false,
    visited: true,
  };
}

const EMPTY_SCORE = score([]);

describe('analyzeLogic - familles v2', () => {
  it('flags a family failing well below the rest of the session with its measured rates', () => {
    const content = [
      ...Array.from({ length: 10 }, (_, position) =>
        matrixLogicItem(position, MatrixStructure.CROSSED),
      ),
      ...Array.from({ length: 10 }, (_, position) =>
        numericItem(10 + position),
      ),
    ];
    const responses = [
      ...Array.from({ length: 10 }, (_, position) =>
        choiceAnswer(position, position < 3),
      ),
      ...Array.from({ length: 10 }, (_, position) =>
        choiceAnswer(10 + position, position < 8),
      ),
    ];
    const findings = analyzeLogic([], EMPTY_SCORE, responses, content, null);
    const failure = findings.find(
      ({ id }) => id === 'LOGIC_FAMILY_RELATIVE_FAILURE',
    );
    expect(failure).toBeDefined();
    expect(failure?.severity).toBe(RecommendationPriority.HIGH);
    expect(failure?.finding).toContain('3/10 sur les matrices (déduction)');
    expect(failure?.finding).toContain('8/10 sur le reste de la session');
    expect(failure?.recommendation).toContain('session filtrée Familles');
    expect(failure?.priorityLabel).toBe('Les matrices (déduction) en Logique');
  });

  it('stays silent on family failure in a filtered session or with a small gap', () => {
    const content = [
      ...Array.from({ length: 5 }, (_, position) =>
        matrixLogicItem(position, MatrixStructure.CROSSED),
      ),
      ...Array.from({ length: 5 }, (_, position) => numericItem(5 + position)),
    ];
    const responses = [
      ...Array.from({ length: 5 }, (_, position) =>
        choiceAnswer(position, position < 3),
      ),
      ...Array.from({ length: 5 }, (_, position) =>
        choiceAnswer(5 + position, position < 4),
      ),
    ];
    expect(
      analyzeLogic(
        [],
        EMPTY_SCORE,
        responses,
        content,
        LogicFamilyFilter.MATRIX,
      ).map(({ id }) => id),
    ).not.toContain('LOGIC_FAMILY_RELATIVE_FAILURE');
    expect(
      analyzeLogic([], EMPTY_SCORE, responses, content, null).map(
        ({ id }) => id,
      ),
    ).not.toContain('LOGIC_FAMILY_RELATIVE_FAILURE');
  });

  it('flags a family consuming twice the time without any accuracy gain', () => {
    const content = [
      ...Array.from({ length: 5 }, (_, position) =>
        dominoLogicItem(position, false),
      ),
      ...Array.from({ length: 5 }, (_, position) => numericItem(5 + position)),
    ];
    const responses = [
      ...Array.from({ length: 5 }, (_, position) =>
        dominoAnswer(position, position < 3, 20_000),
      ),
      ...Array.from({ length: 5 }, (_, position) =>
        choiceAnswer(5 + position, position < 4, 10_000),
      ),
    ];
    const findings = analyzeLogic([], EMPTY_SCORE, responses, content, null);
    const sink = findings.find(({ id }) => id === 'LOGIC_FAMILY_TIME_SINK');
    expect(sink).toBeDefined();
    expect(sink?.finding).toContain('20 s par item sur les dominos');
    expect(sink?.finding).toContain('10 s ailleurs');
    expect(sink?.finding).toContain('3/5 contre 4/5');
  });

  it('stays silent on the time sink when the extra time pays off in accuracy', () => {
    const content = [
      ...Array.from({ length: 5 }, (_, position) =>
        dominoLogicItem(position, false),
      ),
      ...Array.from({ length: 5 }, (_, position) => numericItem(5 + position)),
    ];
    const responses = [
      ...Array.from({ length: 5 }, (_, position) =>
        dominoAnswer(position, true, 20_000),
      ),
      ...Array.from({ length: 5 }, (_, position) =>
        choiceAnswer(5 + position, position < 4, 10_000),
      ),
    ];
    expect(
      analyzeLogic([], EMPTY_SCORE, responses, content, null).map(
        ({ id }) => id,
      ),
    ).not.toContain('LOGIC_FAMILY_TIME_SINK');
  });

  it('flags domino errors concentrated on wrap sequences with both measured rates', () => {
    const content = [
      ...Array.from({ length: 4 }, (_, position) =>
        dominoLogicItem(position, true),
      ),
      ...Array.from({ length: 4 }, (_, position) =>
        dominoLogicItem(4 + position, false),
      ),
    ];
    const responses = [
      ...Array.from({ length: 4 }, (_, position) =>
        dominoAnswer(position, position >= 2),
      ),
      ...Array.from({ length: 4 }, (_, position) =>
        dominoAnswer(4 + position, position > 0),
      ),
    ];
    const findings = analyzeLogic(
      [],
      EMPTY_SCORE,
      responses,
      content,
      LogicFamilyFilter.DOMINO,
    );
    const wrap = findings.find(({ id }) => id === 'LOGIC_DOMINO_WRAP_MISSES');
    expect(wrap).toBeDefined();
    expect(wrap?.finding).toContain('2/4 dominos à bouclage ratés');
    expect(wrap?.finding).toContain('1/4');
    expect(wrap?.recommendation).toContain('repart à 0');
  });

  it('stays silent on wrap misses when plain sequences fail as much', () => {
    const content = [
      ...Array.from({ length: 4 }, (_, position) =>
        dominoLogicItem(position, true),
      ),
      ...Array.from({ length: 4 }, (_, position) =>
        dominoLogicItem(4 + position, false),
      ),
    ];
    const responses = [
      ...Array.from({ length: 4 }, (_, position) =>
        dominoAnswer(position, position >= 2),
      ),
      ...Array.from({ length: 4 }, (_, position) =>
        dominoAnswer(4 + position, position >= 2),
      ),
    ];
    expect(
      analyzeLogic([], EMPTY_SCORE, responses, content, null).map(
        ({ id }) => id,
      ),
    ).not.toContain('LOGIC_DOMINO_WRAP_MISSES');
  });

  it('flags a matrix structure specifically failing while the others succeed', () => {
    const content = [
      ...Array.from({ length: 4 }, (_, position) =>
        matrixLogicItem(position, MatrixStructure.CROSSED),
      ),
      ...Array.from({ length: 4 }, (_, position) =>
        matrixLogicItem(4 + position, MatrixStructure.DISTRIBUTION),
      ),
    ];
    const responses = [
      ...Array.from({ length: 4 }, (_, position) =>
        choiceAnswer(position, position >= 2),
      ),
      ...Array.from({ length: 4 }, (_, position) =>
        choiceAnswer(4 + position, true),
      ),
    ];
    const findings = analyzeLogic(
      [],
      EMPTY_SCORE,
      responses,
      content,
      LogicFamilyFilter.MATRIX,
    );
    const structure = findings.find(
      ({ id }) => id === 'LOGIC_MATRIX_STRUCTURE_FAILURE',
    );
    expect(structure).toBeDefined();
    expect(structure?.finding).toContain(
      '2/4 ratés sur les matrices à règles croisées',
    );
    expect(structure?.finding).toContain('4/4');
  });

  it('stays silent on matrix structure when every structure fails alike', () => {
    const content = [
      ...Array.from({ length: 4 }, (_, position) =>
        matrixLogicItem(position, MatrixStructure.CROSSED),
      ),
      ...Array.from({ length: 4 }, (_, position) =>
        matrixLogicItem(4 + position, MatrixStructure.DISTRIBUTION),
      ),
    ];
    const responses = [
      ...Array.from({ length: 4 }, (_, position) =>
        choiceAnswer(position, position >= 2),
      ),
      ...Array.from({ length: 4 }, (_, position) =>
        choiceAnswer(4 + position, position >= 2),
      ),
    ];
    expect(
      analyzeLogic([], EMPTY_SCORE, responses, content, null).map(
        ({ id }) => id,
      ),
    ).not.toContain('LOGIC_MATRIX_STRUCTURE_FAILURE');
  });

  it('flags inversed triangles failing while direct triangles succeed', () => {
    const content = [
      triangleLogicItem(0, 4),
      triangleLogicItem(1, 4),
      triangleLogicItem(2, 2),
      triangleLogicItem(3, 2),
      triangleLogicItem(4, 3),
    ];
    const responses = [
      triangleAnswer(0, false),
      triangleAnswer(1, false),
      triangleAnswer(2, true),
      triangleAnswer(3, true),
      triangleAnswer(4, true),
    ];
    const findings = analyzeLogic([], EMPTY_SCORE, responses, content, null);
    const inversed = findings.find(
      ({ id }) => id === 'LOGIC_TRIANGLE_INVERSED_MISSES',
    );
    expect(inversed).toBeDefined();
    expect(inversed?.finding).toContain('2/2 triangles inversés (N4) ratés');
    expect(inversed?.finding).toContain('3/3 triangles directs');
  });

  it('stays silent on inversed triangles when direct ones fail too', () => {
    const content = [
      triangleLogicItem(0, 4),
      triangleLogicItem(1, 4),
      triangleLogicItem(2, 2),
      triangleLogicItem(3, 2),
      triangleLogicItem(4, 3),
    ];
    const responses = [
      triangleAnswer(0, false),
      triangleAnswer(1, false),
      triangleAnswer(2, false),
      triangleAnswer(3, true),
      triangleAnswer(4, false),
    ];
    expect(
      analyzeLogic([], EMPTY_SCORE, responses, content, null).map(
        ({ id }) => id,
      ),
    ).not.toContain('LOGIC_TRIANGLE_INVERSED_MISSES');
  });

  it('cites at least one measured value in every produced finding', () => {
    const content = [
      ...Array.from({ length: 10 }, (_, position) =>
        matrixLogicItem(position, MatrixStructure.CROSSED),
      ),
      ...Array.from({ length: 6 }, (_, position) =>
        dominoLogicItem(10 + position, position < 3),
      ),
      ...Array.from({ length: 10 }, (_, position) =>
        numericItem(16 + position),
      ),
    ];
    const responses = [
      ...Array.from({ length: 10 }, (_, position) =>
        choiceAnswer(position, position < 3, 25_000),
      ),
      ...Array.from({ length: 6 }, (_, position) =>
        dominoAnswer(10 + position, position >= 2, 12_000),
      ),
      ...Array.from({ length: 10 }, (_, position) =>
        choiceAnswer(16 + position, position < 8, 8_000),
      ),
    ];
    const statuses: LogicItemStatus[] = [
      ...Array.from({ length: 12 }, () => 'CORRECT' as LogicItemStatus),
      'WRONG',
      'WRONG',
      'SKIPPED',
      'UNREACHED',
    ];
    const findings = analyzeLogic(
      [],
      score(statuses, { precision: 100, avgAnswerTimeMs: 12_000 }),
      responses,
      content,
      null,
    );
    expect(findings.length).toBeGreaterThan(1);
    for (const finding of findings) {
      expect(finding.finding).toMatch(/\d/);
    }
  });
});
