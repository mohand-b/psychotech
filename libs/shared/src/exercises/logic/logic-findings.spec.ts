import { describe, expect, it } from 'vitest';
import { LogicItemAnswerDto } from '../../dtos/session';
import { RecommendationPriority } from '../../enums';
import { analyzeLogic } from './logic-findings';
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
