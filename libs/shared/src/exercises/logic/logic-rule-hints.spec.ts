import { describe, expect, it } from 'vitest';
import { generateLogicSession } from './generate-logic-session';
import {
  LOGIC_RULE_HINTS,
  LogicRuleHint,
  resolveLogicRuleDetail,
  resolveLogicRuleHint,
} from './logic-rule-hints';
import { LOGIC_RULES } from './logic-rules';

function hintTexts(hint: LogicRuleHint): string[] {
  return hint.kind === 'static' ? [hint.text] : [hint.increasing, hint.decreasing];
}

describe('LOGIC_RULE_HINTS', () => {
  it('covers every rule of the catalog', () => {
    for (const rule of LOGIC_RULES) {
      expect(LOGIC_RULE_HINTS[rule.id], `missing hint for rule ${rule.id}`).toBeDefined();
    }
  });

  it('keeps every hint a single short sentence without any drawn value', () => {
    for (const hint of Object.values(LOGIC_RULE_HINTS)) {
      for (const text of hintTexts(hint)) {
        expect(text.length).toBeGreaterThan(0);
        expect(text.length).toBeLessThanOrEqual(60);
        expect(text.endsWith('.')).toBe(true);
        expect([...text].filter((char) => char === '.')).toHaveLength(1);
        expect(text).not.toMatch(/\d/);
      }
    }
  });

  it('resolves directional hints from the sequence direction', () => {
    expect(
      resolveLogicRuleHint({
        ruleId: 'arithmetic-constant-step',
        sequence: ['4', '7', '10', '13', '16'],
      }),
    ).toBe("Chaque terme augmente d'un même écart.");
    expect(
      resolveLogicRuleHint({
        ruleId: 'arithmetic-constant-step',
        sequence: ['59', '52', '45', '38', '31'],
      }),
    ).toBe("Chaque terme diminue d'un même écart.");
    expect(
      resolveLogicRuleHint({
        ruleId: 'geometric-fast-or-halving',
        sequence: ['96', '48', '24', '12', '6'],
      }),
    ).toBe('Chaque terme est divisé par un même facteur.');
    expect(
      resolveLogicRuleHint({
        ruleId: 'geometric-fast-or-halving',
        sequence: ['2', '8', '32', '128', '512'],
      }),
    ).toBe('Chaque terme est multiplié par un même facteur.');
  });

  it('resolves a non-empty hint for every generated item', () => {
    for (const seed of ['hints-1', 'hints-2', 'hints-3']) {
      for (const item of generateLogicSession(seed)) {
        expect(resolveLogicRuleHint(item).length).toBeGreaterThan(0);
      }
    }
  });
});

describe('resolveLogicRuleDetail', () => {
  it('spells out the exact step of an arithmetic sequence', () => {
    expect(
      resolveLogicRuleDetail({
        ruleId: 'arithmetic-constant-step',
        sequence: ['4', '6', '8', '10', '12'],
      }),
    ).toBe('La suite avance de 2 en 2.');
    expect(
      resolveLogicRuleDetail({
        ruleId: 'arithmetic-constant-step',
        sequence: ['59', '52', '45', '38', '31'],
      }),
    ).toBe('La suite recule de 7 en 7.');
  });

  it('spells out the factor of geometric sequences', () => {
    expect(
      resolveLogicRuleDetail({
        ruleId: 'geometric-double-or-triple',
        sequence: ['3', '9', '27', '81', '243'],
      }),
    ).toBe('Chaque terme est multiplié par 3 : 3 × 3 = 9, 9 × 3 = 27…');
    expect(
      resolveLogicRuleDetail({
        ruleId: 'geometric-fast-or-halving',
        sequence: ['96', '48', '24', '12', '6'],
      }),
    ).toBe('Chaque terme est divisé par 2 : 96 ÷ 2 = 48, 48 ÷ 2 = 24…');
  });

  it('spells out alternances, écarts croissants et sommes', () => {
    expect(
      resolveLogicRuleDetail({
        ruleId: 'alternating-add-subtract',
        sequence: ['10', '17', '13', '20', '16'],
      }),
    ).toBe('On ajoute 7, puis on retire 4, en alternance.');
    expect(
      resolveLogicRuleDetail({
        ruleId: 'increasing-step',
        sequence: ['5', '7', '10', '14', '19'],
      }),
    ).toBe("L'écart grandit de 1 à chaque étape : +2, +3, +4…");
    expect(
      resolveLogicRuleDetail({
        ruleId: 'fibonacci-like',
        sequence: ['2', '5', '7', '12', '19'],
      }),
    ).toBe('Chaque terme est la somme des deux précédents : 2 + 5 = 7.');
  });

  it('resolves a numbered detail for every generated item', () => {
    for (const seed of ['details-1', 'details-2', 'details-3']) {
      for (const item of generateLogicSession(seed)) {
        const detail = resolveLogicRuleDetail(item);
        expect(detail.length).toBeGreaterThan(0);
        expect(detail).toMatch(/\d/);
      }
    }
  });
});
