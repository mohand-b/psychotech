import { describe, expect, it } from 'vitest';
import { generateLegacyLogicSession } from './generate-legacy-logic-session';
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
      for (const item of generateLegacyLogicSession(seed)) {
        expect(resolveLogicRuleHint(item).length).toBeGreaterThan(0);
      }
    }
  });
});

describe('resolveLogicRuleDetail', () => {
  it("détaille la règle et le calcul de l'exercice pour une suite arithmétique", () => {
    expect(
      resolveLogicRuleDetail(
        {
          ruleId: 'arithmetic-constant-step',
          sequence: ['4', '6', '8', '10', '12'],
        },
        '14',
      ),
    ).toBe('La suite avance de 2 en 2 : 12 + 2 = 14.');
    expect(
      resolveLogicRuleDetail(
        {
          ruleId: 'arithmetic-constant-step',
          sequence: ['59', '52', '45', '38', '31'],
        },
        '24',
      ),
    ).toBe('La suite recule de 7 en 7 : 31 − 7 = 24.');
  });

  it("détaille le facteur et le calcul des suites géométriques", () => {
    expect(
      resolveLogicRuleDetail(
        {
          ruleId: 'geometric-double-or-triple',
          sequence: ['3', '9', '27', '81', '243'],
        },
        '729',
      ),
    ).toBe('Chaque terme est multiplié par 3 : 243 × 3 = 729.');
    expect(
      resolveLogicRuleDetail(
        {
          ruleId: 'geometric-fast-or-halving',
          sequence: ['96', '48', '24', '12', '6'],
        },
        '3',
      ),
    ).toBe('Chaque terme est divisé par 2 : 6 ÷ 2 = 3.');
  });

  it('détaille alternances, écarts croissants et sommes avec le calcul final', () => {
    expect(
      resolveLogicRuleDetail(
        {
          ruleId: 'alternating-add-subtract',
          sequence: ['10', '17', '13', '20', '16'],
        },
        '23',
      ),
    ).toBe('On ajoute 7, puis on retire 4, en alternance : 16 + 7 = 23.');
    expect(
      resolveLogicRuleDetail(
        {
          ruleId: 'increasing-step',
          sequence: ['5', '7', '10', '14', '19'],
        },
        '25',
      ),
    ).toBe("L'écart grandit de 1 à chaque étape : 19 + 6 = 25.");
    expect(
      resolveLogicRuleDetail(
        {
          ruleId: 'fibonacci-like',
          sequence: ['2', '5', '7', '12', '19'],
        },
        '31',
      ),
    ).toBe('Chaque terme est la somme des deux précédents : 12 + 19 = 31.');
  });

  it("conclut chaque détail par le calcul de la réponse de l'exercice", () => {
    for (const seed of ['details-1', 'details-2', 'details-3']) {
      for (const item of generateLegacyLogicSession(seed)) {
        const answer = item.choices[item.answerIndex];
        const detail = resolveLogicRuleDetail(item, answer);
        expect(detail.length).toBeGreaterThan(0);
        expect(detail).toContain(`= ${answer}.`);
      }
    }
  });
});
